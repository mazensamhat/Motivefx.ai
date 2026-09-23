import { PrismaClient } from "@prisma/client";
import { serverlessDatabaseUrl } from "./connection-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const datasourceUrl = serverlessDatabaseUrl(process.env.DATABASE_URL);
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

/** Lightweight reachability probe used by Ops platform monitor. */
export async function pingDatabase(timeoutMs = 8_000): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Database ping timed out")), timeoutMs);
      }),
    ]);
    return { ok: true };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return { ok: false, message: summarizePrismaConnectionError(raw) };
  }
}

export function summarizePrismaConnectionError(raw: string): string {
  const msg = raw.replace(/\s+/g, " ").trim();
  if (/P1001|can't reach database|ECONNREFUSED|ENOTFOUND|getaddrinfo/i.test(msg)) {
    return "Can't reach Postgres — check DATABASE_URL (use pooler :6543) and network/IPv4";
  }
  if (/P2024|timed out fetching|pool_timeout|connection pool/i.test(msg)) {
    return "Connection pool exhausted — use Supavisor :6543 and keep at least two connections per busy serverless isolate";
  }
  if (/P1017|Server has closed|connection reset|ECONNRESET/i.test(msg)) {
    return "Database closed the connection — transient; retry or lower pool pressure";
  }
  if (/max clients|too many clients|MaxClients/i.test(msg)) {
    return "Supabase max clients reached — switch to transaction pooler :6543";
  }
  if (/Error in connector|Error in connec/i.test(msg)) {
    return "Prisma connector failed — usually pooler/URL/ssl; verify DATABASE_URL + DIRECT_URL";
  }
  const short = msg
    .replace(/^Invalid `[^`]+` invocation:\s*/i, "")
    .replace(/Error querying the database:\s*/i, "")
    .slice(0, 120);
  return short || "Database connection error";
}

export * from "@prisma/client";

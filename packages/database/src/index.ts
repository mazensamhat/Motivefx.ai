import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const DEFAULT_SERVERLESS_POOL_LIMIT = 2;
const MAX_SERVERLESS_POOL_LIMIT = 10;

function configuredPoolLimit(): string | undefined {
  const raw = process.env.PRISMA_CONNECTION_LIMIT?.trim();
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_SERVERLESS_POOL_LIMIT) {
    return undefined;
  }
  return String(parsed);
}

/**
 * Vercel/serverless: many concurrent isolates can exhaust Supabase if every
 * Prisma client opens a large local pool. Keep the per-isolate pool small,
 * but never force it to one connection: MotiveFX fans out several concurrent
 * authenticated API requests and a single busy connection can cause P2024s.
 *
 * Prefer Supabase Supavisor transaction pooling on :6543. The URL may set its
 * own connection_limit, and PRISMA_CONNECTION_LIMIT can explicitly override it.
 */
function serverlessDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return raw;
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    const port = url.port || (url.protocol === "postgresql:" ? "5432" : "");
    const isSupabasePooler =
      host.includes("pooler.supabase.com") || port === "6543";
    const isSupabaseDirect =
      /^db\.[a-z0-9]+\.supabase\.co$/i.test(host) ||
      (host.includes("supabase.co") && port === "5432" && !host.includes("pooler"));

    // Transaction-mode pooler requires this (disables prepared statements).
    if (isSupabasePooler || host.includes("supabase")) {
      url.searchParams.set("pgbouncer", "true");
    }

    const explicitPoolLimit = configuredPoolLimit();
    if (explicitPoolLimit) {
      url.searchParams.set("connection_limit", explicitPoolLimit);
    } else if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set(
        "connection_limit",
        isSupabaseDirect ? "1" : String(DEFAULT_SERVERLESS_POOL_LIMIT)
      );
    }

    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "15");
    }
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }

    return url.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient() {
  const datasourceUrl = serverlessDatabaseUrl(process.env.DATABASE_URL);
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Always cache — production serverless reuses warm isolates; without this,
// HMR/multi-import paths can open extra pools.
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
    return "Connection pool exhausted — use Supavisor :6543 and raise the small per-isolate pool if burst traffic is queuing";
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
  // Strip Prisma's verbose "Invalid `prisma.x()` invocation:" wrapper for Ops UI.
  const short = msg
    .replace(/^Invalid `[^`]+` invocation:\s*/i, "")
    .replace(/Error querying the database:\s*/i, "")
    .slice(0, 120);
  return short || "Database connection error";
}

export * from "@prisma/client";

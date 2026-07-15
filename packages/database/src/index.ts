import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Vercel serverless: many concurrent isolates × Prisma's default pool (~5)
 * exhausts Supabase/Neon PgBouncer. Force one connection per isolate and
 * keep pgbouncer-friendly params on the runtime URL.
 */
function serverlessDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return raw;
  try {
    const url = new URL(raw.trim());
    if (!url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    url.searchParams.set("connection_limit", "1");
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "10");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "10");
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

export * from "@prisma/client";

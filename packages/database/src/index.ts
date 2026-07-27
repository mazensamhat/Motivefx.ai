import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Vercel serverless: many concurrent isolates × Prisma's default pool (~5)
 * exhausts Supabase/Neon PgBouncer. Keep the pool small, but allow a few
 * concurrent queries inside one warm isolate (terminal boots many feeds).
 */
function serverlessDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return raw;
  try {
    const url = new URL(raw.trim());
    if (!url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    // 1 was too aggressive under parallel /auth/me + feed calls on one isolate.
    url.searchParams.set("connection_limit", "3");
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "10");
    }
    url.searchParams.set("pool_timeout", "20");
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

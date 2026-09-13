const DEFAULT_SERVERLESS_POOL_LIMIT = 2;
const MAX_SERVERLESS_POOL_LIMIT = 10;

export function configuredPoolLimit(raw = process.env.PRISMA_CONNECTION_LIMIT): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_SERVERLESS_POOL_LIMIT) {
    return undefined;
  }
  return String(parsed);
}

export function serverlessDatabaseUrl(
  raw: string | undefined,
  rawPoolLimit = process.env.PRISMA_CONNECTION_LIMIT
): string | undefined {
  if (!raw?.trim()) return raw;
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    const port = url.port || (url.protocol === "postgresql:" ? "5432" : "");
    const isSupabasePooler = host.includes("pooler.supabase.com") || port === "6543";
    const isSupabaseDirect =
      /^db\.[a-z0-9]+\.supabase\.co$/i.test(host) ||
      (host.includes("supabase.co") && port === "5432" && !host.includes("pooler"));

    if (isSupabasePooler || host.includes("supabase")) {
      url.searchParams.set("pgbouncer", "true");
    }

    const explicitPoolLimit = configuredPoolLimit(rawPoolLimit);
    if (explicitPoolLimit) {
      url.searchParams.set("connection_limit", explicitPoolLimit);
    } else if (isSupabasePooler) {
      const embedded = Number.parseInt(url.searchParams.get("connection_limit") ?? "", 10);
      // Heal the old production URL even if it still contains connection_limit=1.
      if (!Number.isFinite(embedded) || embedded < DEFAULT_SERVERLESS_POOL_LIMIT) {
        url.searchParams.set("connection_limit", String(DEFAULT_SERVERLESS_POOL_LIMIT));
      }
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

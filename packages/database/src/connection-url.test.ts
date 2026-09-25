import { afterEach, describe, expect, it } from "vitest";
import { serverlessDatabaseUrl } from "./connection-url";

function normalizedUrl(raw: string) {
  const result = serverlessDatabaseUrl(raw);
  expect(result).toBeDefined();
  return new URL(result!);
}

afterEach(() => {
  delete process.env.PRISMA_CONNECTION_LIMIT;
});

describe("serverlessDatabaseUrl", () => {
  it("heals Supabase pooler URLs pinned to a single connection", () => {
    const url = normalizedUrl(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("defaults direct Supabase hosts to one connection while enabling pgbouncer mode", () => {
    const url = normalizedUrl("postgresql://user:pass@db.abc123.supabase.co/postgres");

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("uses a bounded explicit pool limit for serverless deployments", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "7";

    const url = normalizedUrl(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("connection_limit")).toBe("7");
  });

  it("ignores invalid explicit limits and falls back to safe Supabase pooler healing", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "100";

    const url = normalizedUrl(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("connection_limit")).toBe("2");
  });

  it("adds conservative defaults for non-Supabase Postgres URLs without pgbouncer", () => {
    const url = normalizedUrl("postgresql://user:pass@example.com/app?schema=public");

    expect(url.searchParams.get("pgbouncer")).toBeNull();
    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.searchParams.get("schema")).toBe("public");
  });

  it("preserves invalid, blank, and missing DATABASE_URL values", () => {
    expect(serverlessDatabaseUrl("not a url")).toBe("not a url");
    expect(serverlessDatabaseUrl("   ")).toBe("   ");
    expect(serverlessDatabaseUrl(undefined)).toBeUndefined();
  });
});

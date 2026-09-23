import { afterEach, describe, expect, it, vi } from "vitest";
import { serverlessDatabaseUrl } from "./connection-url";

function normalized(raw: string): URL {
  const result = serverlessDatabaseUrl(raw);
  if (!result) throw new Error("expected normalized URL");
  return new URL(result);
}

describe("serverlessDatabaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("heals stale Supabase pooler URLs pinned to one connection", () => {
    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1&schema=public"
    );

    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.searchParams.get("schema")).toBe("public");
  });

  it("keeps a healthy embedded Supabase pooler limit", () => {
    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=5"
    );

    expect(url.searchParams.get("connection_limit")).toBe("5");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
  });

  it("uses one connection for direct Supabase hosts when no limit is supplied", () => {
    const url = normalized("postgresql://user:pass@db.abcdefghijklmnopqrst.supabase.co:5432/postgres");

    expect(url.searchParams.get("connection_limit")).toBe("1");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
  });

  it("lets a bounded PRISMA_CONNECTION_LIMIT override embedded values", () => {
    vi.stubEnv("PRISMA_CONNECTION_LIMIT", "4");

    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("connection_limit")).toBe("4");
  });

  it("ignores out-of-range PRISMA_CONNECTION_LIMIT values", () => {
    vi.stubEnv("PRISMA_CONNECTION_LIMIT", "99");

    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("connection_limit")).toBe("2");
  });

  it("adds conservative defaults to non-Supabase serverless URLs without pgbouncer", () => {
    const url = normalized("postgresql://user:pass@example.com:5432/postgres");

    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.searchParams.has("pgbouncer")).toBe(false);
  });

  it("preserves invalid and blank inputs", () => {
    expect(serverlessDatabaseUrl("not a database url")).toBe("not a database url");
    expect(serverlessDatabaseUrl("  ")).toBe("  ");
    expect(serverlessDatabaseUrl(undefined)).toBeUndefined();
  });
});

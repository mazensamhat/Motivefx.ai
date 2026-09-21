import { afterEach, describe, expect, it, vi } from "vitest";
import { serverlessDatabaseUrl } from "./connection-url";

function paramsFor(raw: string) {
  const normalized = serverlessDatabaseUrl(raw);
  expect(normalized).toBeDefined();
  return new URL(normalized!).searchParams;
}

describe("serverlessDatabaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("heals Supabase pooler URLs that still pin isolates to one connection", () => {
    const params = paramsFor(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(params.get("pgbouncer")).toBe("true");
    expect(params.get("connection_limit")).toBe("2");
    expect(params.get("connect_timeout")).toBe("15");
    expect(params.get("pool_timeout")).toBe("15");
    expect(params.get("sslmode")).toBe("require");
  });

  it("preserves a higher embedded pooler connection limit", () => {
    const params = paramsFor(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=6"
    );

    expect(params.get("connection_limit")).toBe("6");
  });

  it("lets a valid PRISMA_CONNECTION_LIMIT override embedded URL settings", () => {
    vi.stubEnv("PRISMA_CONNECTION_LIMIT", "7");

    const params = paramsFor(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=2"
    );

    expect(params.get("connection_limit")).toBe("7");
  });

  it("ignores invalid PRISMA_CONNECTION_LIMIT values", () => {
    vi.stubEnv("PRISMA_CONNECTION_LIMIT", "99");

    const params = paramsFor(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(params.get("connection_limit")).toBe("2");
  });

  it("uses a conservative single connection for direct Supabase hosts", () => {
    const params = paramsFor("postgresql://user:pass@db.abc123.supabase.co:5432/postgres");

    expect(params.get("pgbouncer")).toBe("true");
    expect(params.get("connection_limit")).toBe("1");
  });

  it("keeps non-Supabase URLs pool-limited without enabling pgbouncer", () => {
    const params = paramsFor("postgresql://user:pass@postgres.internal:5432/app");

    expect(params.get("pgbouncer")).toBeNull();
    expect(params.get("connection_limit")).toBe("2");
    expect(params.get("sslmode")).toBe("require");
  });

  it("returns blank or invalid input unchanged", () => {
    expect(serverlessDatabaseUrl(undefined)).toBeUndefined();
    expect(serverlessDatabaseUrl("   ")).toBe("   ");
    expect(serverlessDatabaseUrl("not a url")).toBe("not a url");
  });
});

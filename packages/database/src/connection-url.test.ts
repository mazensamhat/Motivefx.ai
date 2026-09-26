import { afterEach, describe, expect, it, vi } from "vitest";
import { serverlessDatabaseUrl } from "./connection-url";

function normalized(raw: string) {
  const value = serverlessDatabaseUrl(raw);
  if (!value) throw new Error("Expected normalized URL");
  return new URL(value);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("serverlessDatabaseUrl", () => {
  it("heals Supabase pooler URLs that pin Prisma to a single connection", () => {
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

  it("uses bounded explicit Prisma pool limits for serverless isolates", () => {
    vi.stubEnv("PRISMA_CONNECTION_LIMIT", "7");

    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("connection_limit")).toBe("7");
  });

  it("ignores invalid explicit pool limits and still heals Supabase poolers", () => {
    vi.stubEnv("PRISMA_CONNECTION_LIMIT", "11");

    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("connection_limit")).toBe("2");
  });

  it("keeps direct Supabase connections intentionally small", () => {
    const url = normalized("postgresql://user:pass@db.abcdefghijklmnop.supabase.co:5432/postgres");

    expect(url.searchParams.get("connection_limit")).toBe("1");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
  });

  it("preserves malformed and blank database URLs", () => {
    expect(serverlessDatabaseUrl("not a url")).toBe("not a url");
    expect(serverlessDatabaseUrl("   ")).toBe("   ");
    expect(serverlessDatabaseUrl(undefined)).toBeUndefined();
  });
});

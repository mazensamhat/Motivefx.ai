import { describe, expect, it } from "vitest";
import { configuredPoolLimit, serverlessDatabaseUrl } from "./connection-url";

function normalized(raw: string, poolLimit?: string): URL {
  const result = serverlessDatabaseUrl(raw, poolLimit);
  expect(result).toBeTypeOf("string");
  return new URL(result as string);
}

describe("configuredPoolLimit", () => {
  it("accepts bounded integer overrides", () => {
    expect(configuredPoolLimit("1")).toBe("1");
    expect(configuredPoolLimit("10")).toBe("10");
    expect(configuredPoolLimit(" 4 ")).toBe("4");
  });

  it("ignores missing and out-of-range overrides", () => {
    expect(configuredPoolLimit("")).toBeUndefined();
    expect(configuredPoolLimit("0")).toBeUndefined();
    expect(configuredPoolLimit("11")).toBeUndefined();
    expect(configuredPoolLimit("not-a-number")).toBeUndefined();
  });
});

describe("serverlessDatabaseUrl", () => {
  it("heals Supabase pooler URLs that were pinned to one connection", () => {
    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("preserves healthy embedded Supabase pooler limits", () => {
    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=6"
    );

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("6");
  });

  it("allows a bounded environment override to win over embedded limits", () => {
    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=6",
      "3"
    );

    expect(url.searchParams.get("connection_limit")).toBe("3");
  });

  it("falls back to pooler healing when the override is invalid", () => {
    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1",
      "99"
    );

    expect(url.searchParams.get("connection_limit")).toBe("2");
  });

  it("keeps direct Supabase connections more conservative than transaction poolers", () => {
    const url = normalized("postgresql://user:pass@db.abcdefghijklmnop.supabase.co:5432/postgres");

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
  });

  it("adds small defaults to non-Supabase URLs without pgbouncer mode", () => {
    const url = normalized("postgresql://user:pass@example.com:5432/postgres");

    expect(url.searchParams.get("pgbouncer")).toBeNull();
    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("returns unusable inputs unchanged", () => {
    expect(serverlessDatabaseUrl(undefined)).toBeUndefined();
    expect(serverlessDatabaseUrl("not a url")).toBe("not a url");
  });
});

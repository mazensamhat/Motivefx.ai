import { afterEach, describe, expect, it } from "vitest";

import { serverlessDatabaseUrl } from "./connection-url";

function normalize(raw: string): URL {
  const result = serverlessDatabaseUrl(raw);
  if (!result) {
    throw new Error("Expected database URL normalization to return a URL string");
  }
  return new URL(result);
}

describe("serverlessDatabaseUrl", () => {
  afterEach(() => {
    delete process.env.PRISMA_CONNECTION_LIMIT;
  });

  it("heals Supabase pooler URLs that would pin a busy serverless isolate to one connection", () => {
    const url = normalize(
      "postgresql://postgres:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url).toHaveProperty("hostname", "aws-0-us-east-1.pooler.supabase.com");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("keeps direct Supabase connections conservative while preserving explicit timeout settings", () => {
    const url = normalize(
      "postgresql://postgres:pw@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?connect_timeout=5&sslmode=verify-full"
    );

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
    expect(url.searchParams.get("connect_timeout")).toBe("5");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("verify-full");
  });

  it("allows a bounded environment override for busy serverless database pools", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "7";

    const url = normalize("postgresql://postgres:pw@db.example.internal:5432/app");

    expect(url.searchParams.get("connection_limit")).toBe("7");
  });

  it("ignores unsafe environment overrides and malformed database URLs", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "99";

    const url = normalize("postgresql://postgres:pw@db.example.internal:5432/app");

    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(serverlessDatabaseUrl("not a url")).toBe("not a url");
    expect(serverlessDatabaseUrl(undefined)).toBeUndefined();
    expect(serverlessDatabaseUrl("")).toBe("");
  });
});

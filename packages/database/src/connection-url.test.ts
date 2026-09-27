import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { serverlessDatabaseUrl } from "./connection-url";

function normalized(raw: string) {
  const value = serverlessDatabaseUrl(raw);
  expect(value).toBeDefined();
  return new URL(value as string);
}

describe("serverlessDatabaseUrl", () => {
  const originalPoolLimit = process.env.PRISMA_CONNECTION_LIMIT;

  beforeEach(() => {
    delete process.env.PRISMA_CONNECTION_LIMIT;
  });

  afterEach(() => {
    if (originalPoolLimit === undefined) {
      delete process.env.PRISMA_CONNECTION_LIMIT;
    } else {
      process.env.PRISMA_CONNECTION_LIMIT = originalPoolLimit;
    }
  });

  it("heals Supabase pooler URLs that pin serverless clients to one connection", () => {
    const url = normalized(
      "postgresql://postgres:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("keeps a healthy Supabase pooler connection limit", () => {
    const url = normalized(
      "postgresql://postgres:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=6"
    );

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("6");
  });

  it("uses a single connection for direct Supabase hosts when no limit is configured", () => {
    const url = normalized("postgresql://postgres:secret@db.abcdefghijklmnop.supabase.co:5432/postgres");

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
  });

  it("applies a bounded explicit pool limit across supported Postgres URLs", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "9";

    const url = normalized("postgresql://postgres:secret@db.example.com:5432/postgres?connection_limit=1");

    expect(url.searchParams.get("connection_limit")).toBe("9");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("ignores invalid explicit pool limits and preserves malformed or blank input", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "99";

    const regular = normalized("postgresql://postgres:secret@db.example.com:5432/postgres");

    expect(regular.searchParams.get("connection_limit")).toBe("2");
    expect(serverlessDatabaseUrl("not a url")).toBe("not a url");
    expect(serverlessDatabaseUrl("   ")).toBe("   ");
    expect(serverlessDatabaseUrl(undefined)).toBeUndefined();
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { serverlessDatabaseUrl } from "./connection-url";

const ORIGINAL_POOL_LIMIT = process.env.PRISMA_CONNECTION_LIMIT;

function parseDatabaseUrl(raw: string): URL {
  const normalized = serverlessDatabaseUrl(raw);
  expect(normalized).toBeDefined();
  return new URL(normalized!);
}

afterEach(() => {
  if (ORIGINAL_POOL_LIMIT === undefined) {
    delete process.env.PRISMA_CONNECTION_LIMIT;
  } else {
    process.env.PRISMA_CONNECTION_LIMIT = ORIGINAL_POOL_LIMIT;
  }
});

describe("serverlessDatabaseUrl", () => {
  it("heals Supabase pooler URLs that pin Prisma to a single connection", () => {
    const url = parseDatabaseUrl(
      "postgresql://postgres:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("uses the configured bounded pool limit when PRISMA_CONNECTION_LIMIT is valid", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "7";

    const url = parseDatabaseUrl(
      "postgresql://postgres:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("connection_limit")).toBe("7");
  });

  it("ignores invalid configured pool limits and keeps Supabase poolers above one connection", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "99";

    const url = parseDatabaseUrl(
      "postgresql://postgres:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("connection_limit")).toBe("2");
  });

  it("keeps direct Supabase connections conservative while enabling required Prisma options", () => {
    const url = parseDatabaseUrl("postgresql://postgres:secret@db.abc123.supabase.co/postgres");

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("adds safe defaults for non-Supabase Postgres URLs without marking them as pgbouncer", () => {
    const url = parseDatabaseUrl("postgresql://user:secret@db.internal.example.com:5432/app");

    expect(url.searchParams.get("pgbouncer")).toBeNull();
    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("preserves blank and invalid values instead of throwing during client creation", () => {
    expect(serverlessDatabaseUrl(undefined)).toBeUndefined();
    expect(serverlessDatabaseUrl("   ")).toBe("   ");
    expect(serverlessDatabaseUrl("not a url")).toBe("not a url");
  });
});

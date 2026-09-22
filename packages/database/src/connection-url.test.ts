import { afterEach, describe, expect, it } from "vitest";
import { serverlessDatabaseUrl } from "./connection-url";

const ORIGINAL_POOL_LIMIT = process.env.PRISMA_CONNECTION_LIMIT;

function paramsFor(raw: string | undefined) {
  expect(raw).toBeDefined();
  return new URL(raw!).searchParams;
}

afterEach(() => {
  if (ORIGINAL_POOL_LIMIT === undefined) {
    delete process.env.PRISMA_CONNECTION_LIMIT;
  } else {
    process.env.PRISMA_CONNECTION_LIMIT = ORIGINAL_POOL_LIMIT;
  }
});

describe("serverlessDatabaseUrl", () => {
  it("heals Supabase pooler URLs that would pin an isolate to one connection", () => {
    const normalized = serverlessDatabaseUrl(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );
    const params = paramsFor(normalized);

    expect(params.get("pgbouncer")).toBe("true");
    expect(params.get("connection_limit")).toBe("2");
    expect(params.get("connect_timeout")).toBe("15");
    expect(params.get("pool_timeout")).toBe("15");
    expect(params.get("sslmode")).toBe("require");
  });

  it("keeps direct Supabase URLs conservative when no pool limit is provided", () => {
    const normalized = serverlessDatabaseUrl(
      "postgresql://user:pass@db.abcdefghijklmnopqrst.supabase.co/postgres"
    );
    const params = paramsFor(normalized);

    expect(params.get("pgbouncer")).toBe("true");
    expect(params.get("connection_limit")).toBe("1");
  });

  it("applies a bounded explicit pool limit to Supabase pooler URLs", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "7";

    const normalized = serverlessDatabaseUrl(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(paramsFor(normalized).get("connection_limit")).toBe("7");
  });

  it("ignores invalid explicit pool limits and still heals pooler defaults", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "99";

    const normalized = serverlessDatabaseUrl(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(paramsFor(normalized).get("connection_limit")).toBe("2");
  });

  it("returns blank or malformed values unchanged", () => {
    expect(serverlessDatabaseUrl(undefined)).toBeUndefined();
    expect(serverlessDatabaseUrl("   ")).toBe("   ");
    expect(serverlessDatabaseUrl("not a url")).toBe("not a url");
  });
});

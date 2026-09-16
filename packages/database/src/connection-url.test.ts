import { afterEach, describe, expect, it } from "vitest";
import { serverlessDatabaseUrl } from "./connection-url";

function paramsFor(raw: string) {
  const normalized = serverlessDatabaseUrl(raw);
  expect(normalized).toBeDefined();
  return new URL(normalized!).searchParams;
}

describe("serverlessDatabaseUrl", () => {
  afterEach(() => {
    delete process.env.PRISMA_CONNECTION_LIMIT;
  });

  it("heals Supabase pooler URLs pinned to a single connection", () => {
    const params = paramsFor(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(params.get("pgbouncer")).toBe("true");
    expect(params.get("connection_limit")).toBe("2");
    expect(params.get("connect_timeout")).toBe("15");
    expect(params.get("pool_timeout")).toBe("15");
    expect(params.get("sslmode")).toBe("require");
  });

  it("preserves an existing safe pooler connection limit", () => {
    const params = paramsFor(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=6&pool_timeout=30"
    );

    expect(params.get("connection_limit")).toBe("6");
    expect(params.get("pool_timeout")).toBe("30");
  });

  it("applies bounded explicit pool overrides", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "9";

    const params = paramsFor("postgresql://user:pass@db.example.com:5432/app?connection_limit=3");

    expect(params.get("connection_limit")).toBe("9");
  });

  it("ignores invalid explicit pool overrides", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "100";

    const params = paramsFor("postgresql://user:pass@db.example.com:5432/app");

    expect(params.get("connection_limit")).toBe("2");
  });

  it("keeps direct Supabase connections conservative when no limit is set", () => {
    const params = paramsFor("postgresql://user:pass@db.abc123.supabase.co:5432/postgres");

    expect(params.get("pgbouncer")).toBe("true");
    expect(params.get("connection_limit")).toBe("1");
  });

  it("returns malformed and empty inputs unchanged", () => {
    expect(serverlessDatabaseUrl("not a url")).toBe("not a url");
    expect(serverlessDatabaseUrl("")).toBe("");
    expect(serverlessDatabaseUrl(undefined)).toBeUndefined();
  });
});

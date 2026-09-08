import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function PrismaClient() {
    return { $queryRaw: vi.fn() };
  }),
}));

import {
  serverlessDatabaseUrl,
  summarizePrismaConnectionError,
} from "./index";

function normalized(raw: string): URL {
  const result = serverlessDatabaseUrl(raw);
  if (!result) throw new Error("Expected a normalized URL");
  return new URL(result);
}

describe("serverlessDatabaseUrl", () => {
  const originalLimit = process.env.PRISMA_CONNECTION_LIMIT;

  beforeEach(() => {
    delete process.env.PRISMA_CONNECTION_LIMIT;
  });

  afterEach(() => {
    if (originalLimit === undefined) {
      delete process.env.PRISMA_CONNECTION_LIMIT;
    } else {
      process.env.PRISMA_CONNECTION_LIMIT = originalLimit;
    }
  });

  it("heals Supabase pooler URLs pinned below the safe serverless pool size", () => {
    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1&schema=public"
    );

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("15");
    expect(url.searchParams.get("pool_timeout")).toBe("15");
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.searchParams.get("schema")).toBe("public");
  });

  it("keeps higher embedded Supabase pooler limits", () => {
    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=4"
    );

    expect(url.searchParams.get("connection_limit")).toBe("4");
  });

  it("allows an explicit safe Prisma connection limit override", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "7";

    const pooler = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );
    const direct = normalized("postgresql://user:pass@db.abc123.supabase.co:5432/postgres");

    expect(pooler.searchParams.get("connection_limit")).toBe("7");
    expect(direct.searchParams.get("connection_limit")).toBe("7");
  });

  it("ignores unsafe Prisma connection limit overrides", () => {
    process.env.PRISMA_CONNECTION_LIMIT = "11";

    const url = normalized(
      "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?connection_limit=1"
    );

    expect(url.searchParams.get("connection_limit")).toBe("2");
  });

  it("uses a conservative one-connection default for direct Supabase URLs", () => {
    const url = normalized("postgresql://user:pass@db.abc123.supabase.co:5432/postgres");

    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
  });

  it("returns invalid database URLs unchanged", () => {
    expect(serverlessDatabaseUrl("not a postgres url")).toBe("not a postgres url");
  });
});

describe("summarizePrismaConnectionError", () => {
  it("maps Prisma pool exhaustion errors to the serverless pooler guidance", () => {
    expect(summarizePrismaConnectionError("P2024 timed out fetching a new connection")).toBe(
      "Connection pool exhausted — use Supavisor :6543 and keep at least two connections per busy serverless isolate"
    );
  });

  it("strips verbose Prisma invocation wrappers before truncating unknown errors", () => {
    expect(
      summarizePrismaConnectionError(
        "Invalid `prisma.user.findMany()` invocation:\n\nError querying the database: totally unexpected connector message"
      )
    ).toBe("totally unexpected connector message");
  });
});

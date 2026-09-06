import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RefreshUser = {
  id: string;
  email: string;
  passwordHash: string | null;
  disabledAt: Date | null;
  updatedAt: Date;
  totpSecret: string | null;
  totpEnabled: boolean;
};

const db = vi.hoisted(() => {
  const state: { user: RefreshUser | null } = { user: null };

  return {
    state,
    prisma: {
      user: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          if (!state.user || state.user.id !== where.id) return null;
          return { ...state.user };
        }),
      },
    },
  };
});

const nextHeaders = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(() => undefined),
    set: vi.fn(),
  },
  headerStore: {
    get: vi.fn(() => null),
  },
}));

vi.mock("@motivefx/database", () => ({
  prisma: db.prisma,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => nextHeaders.cookieStore),
  headers: vi.fn(async () => nextHeaders.headerStore),
}));

import { createSessionPair, refreshSessionTokens } from "../session";

const BASE_TIME = new Date("2026-09-06T12:00:00.000Z");

function user(overrides: Partial<RefreshUser> = {}): RefreshUser {
  return {
    id: "user_123",
    email: "user@example.com",
    passwordHash: "hash:v1",
    disabledAt: null,
    updatedAt: BASE_TIME,
    totpSecret: null,
    totpEnabled: false,
    ...overrides,
  };
}

describe("session refresh tokens", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "motivefx-test-auth-secret";
    db.state.user = user();
    nextHeaders.cookieStore.get.mockReturnValue(undefined);
    nextHeaders.headerStore.get.mockReturnValue(null);
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.AUTH_SECRET;
  });

  it("refreshes a valid token against the current canonical account", async () => {
    const tokens = await createSessionPair({
      id: "user_123",
      email: "stale-email@example.com",
    });

    const refreshed = await refreshSessionTokens(tokens.refreshToken);

    expect(refreshed?.user).toEqual({
      id: "user_123",
      email: "user@example.com",
    });
    expect(refreshed?.accessToken).toEqual(expect.any(String));
    expect(refreshed?.refreshToken).toEqual(expect.any(String));
  });

  it("rejects refresh tokens after password or TOTP credential changes", async () => {
    for (const mutation of [
      { passwordHash: "hash:v2" },
      { totpEnabled: true, totpSecret: "totp:v1" },
      { totpEnabled: true, totpSecret: "totp:v2" },
    ]) {
      db.state.user = user();
      const { refreshToken } = await createSessionPair(db.state.user);
      db.state.user = user(mutation);

      await expect(refreshSessionTokens(refreshToken)).resolves.toBeNull();
    }
  });

  it("rejects refresh tokens for disabled accounts", async () => {
    const { refreshToken } = await createSessionPair(db.state.user!);
    db.state.user = user({ disabledAt: new Date(BASE_TIME.getTime() + 1_000) });

    await expect(refreshSessionTokens(refreshToken)).resolves.toBeNull();
  });
});

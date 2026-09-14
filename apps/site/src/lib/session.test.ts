import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const nextHeaders = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
  },
  headerStore: {
    get: vi.fn(),
  },
}));

vi.mock("@motivefx/database", () => db);

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => nextHeaders.cookieStore),
  headers: vi.fn(async () => nextHeaders.headerStore),
}));

import {
  createSessionPair,
  refreshSessionTokens,
  SESSION_COOKIE,
  REFRESH_COOKIE,
} from "./session";

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_123",
    email: "member@motivefx.ai",
    passwordHash: "password-v1",
    disabledAt: null,
    updatedAt: new Date("2026-09-14T08:00:00.000Z"),
    totpSecret: null,
    totpEnabled: false,
    ...overrides,
  };
}

function authSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret-with-enough-entropy-for-hs256";
  db.prisma.user.findUnique.mockReset();
  nextHeaders.cookieStore.get.mockReset();
  nextHeaders.cookieStore.set.mockReset();
  nextHeaders.headerStore.get.mockReset();
});

describe("session refresh tokens", () => {
  it("refreshes when the credential fingerprint still matches current account state", async () => {
    const current = userRow();
    db.prisma.user.findUnique.mockResolvedValue(current);

    const tokens = await createSessionPair({
      id: current.id,
      email: "stale-email@motivefx.ai",
    });
    const refreshed = await refreshSessionTokens(tokens.refreshToken);

    expect(refreshed?.user).toEqual({
      id: current.id,
      email: current.email,
    });
    expect(refreshed?.accessToken).toEqual(expect.any(String));
    expect(refreshed?.refreshToken).toEqual(expect.any(String));
    expect(nextHeaders.cookieStore.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      tokens.accessToken,
      expect.objectContaining({ httpOnly: true, sameSite: "lax" })
    );
    expect(nextHeaders.cookieStore.set).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      tokens.refreshToken,
      expect.objectContaining({ httpOnly: true, sameSite: "lax" })
    );
  });

  it("rejects refresh tokens after password or TOTP state changes", async () => {
    const original = userRow({ totpSecret: "totp-v1", totpEnabled: true });
    db.prisma.user.findUnique.mockResolvedValueOnce(original);

    const { refreshToken } = await createSessionPair({
      id: original.id,
      email: original.email,
    });

    db.prisma.user.findUnique.mockResolvedValueOnce(
      userRow({ passwordHash: "password-v2", totpSecret: "totp-v1", totpEnabled: true })
    );
    await expect(refreshSessionTokens(refreshToken)).resolves.toBeNull();

    db.prisma.user.findUnique.mockResolvedValueOnce(original);
    const { refreshToken: totpBoundToken } = await createSessionPair({
      id: original.id,
      email: original.email,
    });

    db.prisma.user.findUnique.mockResolvedValueOnce(
      userRow({ passwordHash: "password-v1", totpSecret: "totp-v2", totpEnabled: true })
    );
    await expect(refreshSessionTokens(totpBoundToken)).resolves.toBeNull();
  });

  it("does not refresh disabled accounts", async () => {
    const current = userRow();
    db.prisma.user.findUnique.mockResolvedValueOnce(current);

    const { refreshToken } = await createSessionPair({
      id: current.id,
      email: current.email,
    });

    db.prisma.user.findUnique.mockResolvedValueOnce(
      userRow({ disabledAt: new Date("2026-09-14T08:05:00.000Z") })
    );

    await expect(refreshSessionTokens(refreshToken)).resolves.toBeNull();
  });

  it("only upgrades legacy untyped tokens when the account has not changed since issue", async () => {
    const legacyToken = await new SignJWT({
      sub: "user_123",
      email: "member@motivefx.ai",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(new Date("2026-09-14T08:00:00.000Z"))
      .setExpirationTime("30d")
      .sign(authSecret());

    db.prisma.user.findUnique.mockResolvedValueOnce(
      userRow({ updatedAt: new Date("2026-09-14T08:00:04.000Z") })
    );
    await expect(refreshSessionTokens(legacyToken)).resolves.toEqual(
      expect.objectContaining({
        user: { id: "user_123", email: "member@motivefx.ai" },
      })
    );

    db.prisma.user.findUnique.mockResolvedValueOnce(
      userRow({ updatedAt: new Date("2026-09-14T08:00:06.000Z") })
    );
    await expect(refreshSessionTokens(legacyToken)).resolves.toBeNull();
  });
});

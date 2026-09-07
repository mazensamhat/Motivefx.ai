import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaUserFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@motivefx/database", () => ({
  prisma: {
    user: {
      findUnique: prismaUserFindUnique,
    },
  },
}));

import {
  REFRESH_DURATION,
  SESSION_DURATION,
  refreshSessionTokens,
} from "../session";

const AUTH_SECRET = "session-refresh-test-secret-with-enough-entropy";

type RefreshUserRecord = {
  id: string;
  email: string;
  passwordHash: string | null;
  disabledAt: Date | null;
  updatedAt: Date;
  totpSecret: string | null;
  totpEnabled: boolean;
};

const baseUser: RefreshUserRecord = {
  id: "user_123",
  email: "trader@example.com",
  passwordHash: "hashed-password-v1",
  disabledAt: null,
  updatedAt: new Date(Date.now() - 60_000),
  totpSecret: null,
  totpEnabled: false,
};

function secret() {
  return new TextEncoder().encode(AUTH_SECRET);
}

function credentialFingerprint(
  passwordHash: string | null,
  totpSecret: string | null,
  totpEnabled: boolean
) {
  return createHash("sha256")
    .update(passwordHash ?? "motivefx-passwordless-account")
    .update("|")
    .update(totpEnabled ? "totp:on" : "totp:off")
    .update("|")
    .update(totpSecret ?? "no-totp-secret")
    .digest("base64url")
    .slice(0, 32);
}

function mockRefreshUser(user: Partial<RefreshUserRecord> = {}) {
  const record = { ...baseUser, ...user };
  prismaUserFindUnique.mockResolvedValue(record);
  return record;
}

async function signSessionJwt({
  credential,
  email = baseUser.email,
  expiresIn = REFRESH_DURATION,
  issuedAtMs = Date.now() - 1_000,
  subject = baseUser.id,
  type,
}: {
  credential?: string;
  email?: string;
  expiresIn?: number;
  issuedAtMs?: number;
  subject?: string;
  type?: "access" | "refresh";
}) {
  const issuedAt = Math.floor(issuedAtMs / 1000);
  const payload: Record<string, unknown> = { email };
  if (type) payload.type = type;
  if (credential) payload.credential = credential;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + expiresIn)
    .sign(secret());
}

describe("refreshSessionTokens", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = AUTH_SECRET;
    prismaUserFindUnique.mockReset();
  });

  it("rotates a valid refresh token into a fresh access and refresh pair", async () => {
    const user = mockRefreshUser();
    const credential = credentialFingerprint(
      user.passwordHash,
      user.totpSecret,
      user.totpEnabled
    );
    const token = await signSessionJwt({ credential, type: "refresh" });

    const refreshed = await refreshSessionTokens(token);

    expect(refreshed?.user).toEqual({ id: user.id, email: user.email });
    expect(prismaUserFindUnique).toHaveBeenCalledWith({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        disabledAt: true,
        updatedAt: true,
        totpSecret: true,
        totpEnabled: true,
      },
    });

    const access = await jwtVerify(refreshed!.accessToken, secret(), {
      algorithms: ["HS256"],
    });
    expect(access.payload).toMatchObject({
      sub: user.id,
      email: user.email,
      type: "access",
    });
    expect(access.payload.exp! - access.payload.iat!).toBe(SESSION_DURATION);

    const refresh = await jwtVerify(refreshed!.refreshToken, secret(), {
      algorithms: ["HS256"],
    });
    expect(refresh.payload).toMatchObject({
      sub: user.id,
      email: user.email,
      type: "refresh",
      credential,
    });
    expect(refresh.payload.exp! - refresh.payload.iat!).toBe(REFRESH_DURATION);
  });

  it("rejects refresh tokens after the user's password hash changes", async () => {
    const oldCredential = credentialFingerprint(
      "hashed-password-v1",
      null,
      false
    );
    mockRefreshUser({ passwordHash: "hashed-password-v2" });
    const token = await signSessionJwt({
      credential: oldCredential,
      type: "refresh",
    });

    await expect(refreshSessionTokens(token)).resolves.toBeNull();
  });

  it("rejects refresh tokens after the user's TOTP state changes", async () => {
    const oldCredential = credentialFingerprint(
      baseUser.passwordHash,
      null,
      false
    );
    mockRefreshUser({ totpEnabled: true, totpSecret: "totp-secret-v1" });
    const token = await signSessionJwt({
      credential: oldCredential,
      type: "refresh",
    });

    await expect(refreshSessionTokens(token)).resolves.toBeNull();
  });

  it("rejects refresh tokens for disabled accounts", async () => {
    const credential = credentialFingerprint(
      baseUser.passwordHash,
      baseUser.totpSecret,
      baseUser.totpEnabled
    );
    mockRefreshUser({ disabledAt: new Date() });
    const token = await signSessionJwt({ credential, type: "refresh" });

    await expect(refreshSessionTokens(token)).resolves.toBeNull();
  });

  it("upgrades legacy session tokens only when account state is unchanged", async () => {
    const issuedAtMs = Math.floor((Date.now() - 60_000) / 1000) * 1000;
    mockRefreshUser({ updatedAt: new Date(issuedAtMs + 5_000) });
    const legacyToken = await signSessionJwt({ issuedAtMs });

    const upgraded = await refreshSessionTokens(legacyToken);

    expect(upgraded?.user).toEqual({
      id: baseUser.id,
      email: baseUser.email,
    });
  });

  it("rejects legacy session tokens issued before an account update", async () => {
    const issuedAtMs = Math.floor((Date.now() - 60_000) / 1000) * 1000;
    mockRefreshUser({ updatedAt: new Date(issuedAtMs + 5_001) });
    const legacyToken = await signSessionJwt({ issuedAtMs });

    await expect(refreshSessionTokens(legacyToken)).resolves.toBeNull();
  });

  it("rejects access tokens presented on the refresh path", async () => {
    mockRefreshUser();
    const token = await signSessionJwt({ type: "access" });

    await expect(refreshSessionTokens(token)).resolves.toBeNull();
  });
});

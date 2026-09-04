import { createHash } from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { prisma } from "@motivefx/database";
import { cookies, headers } from "next/headers";

export const SESSION_COOKIE = "motivefx_session";
export const REFRESH_COOKIE = "motivefx_refresh";
export const SESSION_DURATION = 60 * 30;
export const REFRESH_DURATION = 60 * 60 * 24 * 30;

export interface SessionUser {
  id: string;
  email: string;
}

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Security-sensitive account state is bound into refresh tokens. Changing the
 * password or enabling/disabling/re-keying TOTP invalidates every old refresh
 * token without a new session table or a DB lookup on every API request.
 */
function credentialFingerprint(
  passwordHash: string | null,
  totpSecret: string | null,
  totpEnabled: boolean
): string {
  return createHash("sha256")
    .update(passwordHash ?? "motivefx-passwordless-account")
    .update("|")
    .update(totpEnabled ? "totp:on" : "totp:off")
    .update("|")
    .update(totpSecret ?? "no-totp-secret")
    .digest("base64url")
    .slice(0, 32);
}

async function signAccessToken(user: SessionUser): Promise<string> {
  return new SignJWT({ sub: user.id, email: user.email, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());
}

async function signRefreshToken(user: SessionUser, credential: string): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    type: "refresh",
    credential,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_DURATION}s`)
    .sign(getSecret());
}

function userFromPayload(payload: JWTPayload, expectedType: "access" | "refresh"): SessionUser | null {
  if (payload.type !== expectedType) return null;
  const id = payload.sub;
  const email = typeof payload.email === "string" ? payload.email : null;
  if (!id || typeof id !== "string" || !email) return null;
  return { id, email };
}

async function accessSessionFromToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return userFromPayload(payload, "access");
  } catch {
    return null;
  }
}

function bearerFromAuthorization(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() || null;
}

async function loadRefreshUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
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
}

function fingerprintForUser(user: {
  passwordHash: string | null;
  totpSecret: string | null;
  totpEnabled: boolean;
}): string {
  return credentialFingerprint(user.passwordHash, user.totpSecret, user.totpEnabled);
}

/**
 * Validate a refresh credential against current account state. Password or TOTP
 * changes immediately invalidate every refresh token. Already-issued access
 * tokens have a maximum remaining lifetime of 30 minutes.
 *
 * A legacy pre-Phase-2 session JWT can be upgraded once if the account record
 * has not changed since it was issued.
 */
export async function refreshSessionTokens(
  token: string | undefined | null
): Promise<(SessionTokens & { user: SessionUser }) | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const id = typeof payload.sub === "string" ? payload.sub : null;
    if (!id) return null;

    const user = await loadRefreshUser(id);
    if (!user || user.disabledAt) return null;

    if (payload.type === "refresh") {
      const supplied = typeof payload.credential === "string" ? payload.credential : "";
      if (!supplied || supplied !== fingerprintForUser(user)) return null;
    } else if (payload.type == null) {
      const issuedAt = typeof payload.iat === "number" ? payload.iat * 1000 : 0;
      if (!issuedAt || user.updatedAt.getTime() > issuedAt + 5_000) return null;
    } else {
      return null;
    }

    const current = { id: user.id, email: user.email };
    const accessToken = await signAccessToken(current);
    const refreshToken = await signRefreshToken(current, fingerprintForUser(user));
    return { accessToken, refreshToken, user: current };
  } catch {
    return null;
  }
}

async function createFreshSessionTokens(user: SessionUser): Promise<SessionTokens> {
  const current = await loadRefreshUser(user.id);
  if (!current || current.disabledAt) throw new Error("Account is not available");

  const canonical = { id: current.id, email: current.email };
  return {
    accessToken: await signAccessToken(canonical),
    refreshToken: await signRefreshToken(canonical, fingerprintForUser(current)),
  };
}

function applySessionCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  tokens: SessionTokens
) {
  cookieStore.set(SESSION_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
  cookieStore.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_DURATION,
    path: "/",
  });
}

export async function createSessionPair(user: SessionUser): Promise<SessionTokens> {
  const tokens = await createFreshSessionTokens(user);
  try {
    applySessionCookies(await cookies(), tokens);
  } catch {
    /* Read-only render contexts may not permit cookie mutation. */
  }
  return tokens;
}

export async function createSession(user: SessionUser): Promise<string> {
  return (await createSessionPair(user)).accessToken;
}

export async function destroySession() {
  const cookieStore = await cookies();
  for (const name of [SESSION_COOKIE, REFRESH_COOKIE]) {
    cookieStore.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }
}

/**
 * Cookie session, or Authorization: Bearer <short access JWT> for mobile/API.
 * Browser requests transparently rotate from the refresh cookie after access
 * expiry. That refresh path performs one DB validation only at the boundary.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookieAccess = cookieStore.get(SESSION_COOKIE)?.value;
  const fromCookie = await accessSessionFromToken(cookieAccess);
  if (fromCookie) return fromCookie;

  const headerStore = await headers();
  const bearer = bearerFromAuthorization(headerStore.get("authorization"));
  const fromBearer = await accessSessionFromToken(bearer);
  if (fromBearer) return fromBearer;

  const refreshCandidate = cookieStore.get(REFRESH_COOKIE)?.value || cookieAccess;
  const refreshed = await refreshSessionTokens(refreshCandidate);
  if (!refreshed) return null;
  try {
    applySessionCookies(cookieStore, refreshed);
  } catch {
    /* Read-only rendering context; validated session is still usable once. */
  }
  return refreshed.user;
}

export function mobileSessionPayload(
  user: SessionUser,
  accessToken: string,
  refreshToken: string
) {
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      userId: user.id,
      email: user.email,
    },
    redirectTo: "/app" as const,
  };
}

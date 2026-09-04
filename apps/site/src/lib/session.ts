import { createHash } from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { prisma } from "@motivefx/database";
import { cookies, headers } from "next/headers";

export const SESSION_COOKIE = "motivefx_session";
export const REFRESH_COOKIE = "motivefx_refresh";

/** Short bearer lifetime limits damage from a leaked mobile/WebView token. */
export const SESSION_DURATION = 60 * 30;
/** Refresh survives normal app use but is revalidated against the database. */
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

function credentialFingerprint(passwordHash: string | null): string {
  return createHash("sha256")
    .update(passwordHash ?? "motivefx-passwordless-account")
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
    },
  });
}

/**
 * Validate a refresh credential against current account state. The password-hash
 * fingerprint means a password change/reset instantly invalidates every refresh
 * token without requiring a session table. Existing access tokens expire within
 * SESSION_DURATION (30 minutes).
 *
 * A legacy pre-Phase-2 session JWT can be upgraded once if the account has not
 * changed since that JWT was issued. This avoids needlessly signing out unchanged
 * mobile users while still rejecting legacy tokens after a credential/account edit.
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
      if (!supplied || supplied !== credentialFingerprint(user.passwordHash)) return null;
    } else if (payload.type == null) {
      // Migration path for the old 30-day token that was used as both access+refresh.
      const issuedAt = typeof payload.iat === "number" ? payload.iat * 1000 : 0;
      if (!issuedAt || user.updatedAt.getTime() > issuedAt + 5_000) return null;
    } else {
      return null;
    }

    const current = { id: user.id, email: user.email };
    const accessToken = await signAccessToken(current);
    const refreshToken = await signRefreshToken(
      current,
      credentialFingerprint(user.passwordHash)
    );
    return { accessToken, refreshToken, user: current };
  } catch {
    return null;
  }
}

async function createFreshSessionTokens(
  user: SessionUser
): Promise<SessionTokens> {
  const current = await loadRefreshUser(user.id);
  if (!current || current.disabledAt) throw new Error("Account is not available");

  const canonical = { id: current.id, email: current.email };
  return {
    accessToken: await signAccessToken(canonical),
    refreshToken: await signRefreshToken(
      canonical,
      credentialFingerprint(current.passwordHash)
    ),
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

/** Create a web + mobile token pair and set the browser cookies when possible. */
export async function createSessionPair(user: SessionUser): Promise<SessionTokens> {
  const tokens = await createFreshSessionTokens(user);
  try {
    applySessionCookies(await cookies(), tokens);
  } catch {
    // Some read-only render contexts do not permit setting cookies. Callers that
    // need returned mobile tokens still receive a valid pair.
  }
  return tokens;
}

/** Backward-compatible helper used by web-only flows. Returns the access JWT. */
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
 * expiry. That refresh path performs one DB validation only at the refresh
 * boundary, not on every terminal request.
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

  // Browser refresh, plus one-time migration from the old cookie format.
  const refreshCandidate = cookieStore.get(REFRESH_COOKIE)?.value || cookieAccess;
  const refreshed = await refreshSessionTokens(refreshCandidate);
  if (!refreshed) return null;
  try {
    applySessionCookies(cookieStore, refreshed);
  } catch {
    /* Read-only rendering context; the validated session is still usable once. */
  }
  return refreshed.user;
}

/** Shape expected by the MotiveFX native app after login/register/refresh. */
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

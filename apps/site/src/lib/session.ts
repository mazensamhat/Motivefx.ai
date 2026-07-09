import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "@motivefx/database";

export const SESSION_COOKIE = "motivefx_session";
export const SESSION_DURATION = 60 * 60 * 24 * 30;

export interface SessionUser {
  id: string;
  email: string;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());
}

/** Sets the httpOnly session cookie and returns the JWT (for native / Bearer clients). */
export async function createSession(user: SessionUser): Promise<string> {
  const token = await createSessionToken(user);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });

  return token;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

async function sessionFromToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    if (!id || typeof id !== "string") return null;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!user) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

function bearerFromAuthorization(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() || null;
}

/** Cookie session, or Authorization: Bearer <session JWT> (mobile / API clients). */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const fromCookie = await sessionFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  const headerStore = await headers();
  return sessionFromToken(bearerFromAuthorization(headerStore.get("authorization")));
}

/** Shape expected by the MotiveFX native app after login/register. */
export function mobileSessionPayload(user: SessionUser, accessToken: string) {
  return {
    accessToken,
    refreshToken: accessToken,
    user: {
      id: user.id,
      userId: user.id,
      email: user.email,
    },
    redirectTo: "/app" as const,
  };
}

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@motivefx/database";
import {
  REFRESH_COOKIE,
  REFRESH_DURATION,
  SESSION_COOKIE,
  SESSION_DURATION,
  createSessionPair,
  getSession,
  refreshSessionTokens,
  type SessionTokens,
  type SessionUser,
} from "@/lib/session";
import {
  consumeOneTimeAuthToken,
  issueOneTimeAuthToken,
} from "@/lib/one-time-auth";

const DEMO_COOKIE = "motivefx_demo";
const HANDOFF_TTL_SEC = 120;

function getSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function applySessionCookies(res: NextResponse, tokens: SessionTokens) {
  res.cookies.set(SESSION_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_DURATION,
    path: "/",
  });
  res.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
}

function safeTerminalNext(nextPath: string | null | undefined): string {
  const raw = nextPath?.trim() || "/terminal";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/terminal";
  if (raw === "/terminal/" || raw.startsWith("/terminal/?")) {
    return raw.replace("/terminal/", "/terminal");
  }
  return raw;
}

async function userById(userId: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, disabledAt: true },
  });
  if (!user || user.disabledAt) return null;
  return { id: user.id, email: user.email };
}

/**
 * Temporary compatibility for already-installed native builds that still put the
 * old access credential in this URL. New builds use `ticket` exclusively.
 * Refresh credentials are never accepted here. Phase-2 access tokens are only
 * 30 minutes, sharply bounding exposure until old app builds age out.
 */
async function legacyUrlSession(token: string): Promise<{
  user: SessionUser;
  tokens: SessionTokens;
} | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (payload.type === "access" && typeof payload.sub === "string") {
      const user = await userById(payload.sub);
      if (!user) return null;
      return { user, tokens: await createSessionPair(user) };
    }
    if (payload.type == null) {
      const upgraded = await refreshSessionTokens(token);
      if (!upgraded) return null;
      return { user: upgraded.user, tokens: upgraded };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * WebView navigation consumes a two-minute opaque ticket, sets fresh httpOnly
 * cookies, then redirects. Long-lived session credentials are never present in
 * the new native URL contract.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextPath = safeTerminalNext(url.searchParams.get("next"));
  const ticket = url.searchParams.get("ticket")?.trim();

  let user: SessionUser | null = null;
  let tokens: SessionTokens | null = null;

  if (ticket) {
    const userId = await consumeOneTimeAuthToken(ticket, "native_handoff");
    if (userId) {
      user = await userById(userId);
      if (user) tokens = await createSessionPair(user);
    }
  } else {
    const legacyToken = url.searchParams.get("token")?.trim();
    if (legacyToken) {
      const legacy = await legacyUrlSession(legacyToken);
      user = legacy?.user ?? null;
      tokens = legacy?.tokens ?? null;
    }
  }

  if (!user || !tokens) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const res = NextResponse.redirect(new URL(nextPath, url.origin));
  applySessionCookies(res, tokens);
  return res;
}

/**
 * Authenticated native client requests a short, opaque, one-time handoff URL.
 * The access token stays in the Authorization header and never enters history,
 * analytics, redirect logs, or the WebView source URL.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { next?: string };
    const nextPath = safeTerminalNext(body.next);
    const ticket = await issueOneTimeAuthToken(
      session.id,
      "native_handoff",
      HANDOFF_TTL_SEC
    );
    const url = new URL(request.url);
    url.search = "";
    url.searchParams.set("ticket", ticket);
    url.searchParams.set("next", nextPath);

    return NextResponse.json({
      ok: true,
      url: url.toString(),
      expiresInSec: HANDOFF_TTL_SEC,
    });
  } catch (error) {
    console.error("[auth/native-handoff]", error);
    return NextResponse.json({ error: "Handoff failed" }, { status: 500 });
  }
}

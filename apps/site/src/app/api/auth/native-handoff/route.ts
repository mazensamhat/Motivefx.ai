import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, SESSION_DURATION } from "@/lib/session";

const DEMO_COOKIE = "motivefx_demo";

function getSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function applySessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
  // Clear public-demo cookie so hasModule() does not unlock every market.
  res.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
}

async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return Boolean(payload.sub && typeof payload.sub === "string");
  } catch {
    return false;
  }
}

function safeTerminalNext(nextPath: string | null | undefined): string {
  const raw = nextPath?.trim() || "/terminal";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/terminal";
  // Avoid trailing slash — Next 308s /terminal/ → /terminal and middleware may
  // re-enter without the session cookie on some WebView redirect chains.
  if (raw === "/terminal/" || raw.startsWith("/terminal/?")) {
    return raw.replace("/terminal/", "/terminal");
  }
  return raw;
}

/**
 * Native app handoff: verify session JWT, set httpOnly cookie, redirect into /terminal.
 * Used because WebView cannot set httpOnly cookies from injected JS before the first load.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  const nextPath = safeTerminalNext(url.searchParams.get("next"));

  if (!token || !(await verifySessionToken(token))) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const res = NextResponse.redirect(new URL(nextPath, url.origin));
  applySessionCookie(res, token);
  return res;
}

/**
 * Background handoff from the native shell (no navigation). Sets the session cookie
 * so subsequent same-origin fetches / navigations are not forced into ?demo=1.
 */
export async function POST(request: Request) {
  try {
    const auth = request.headers.get("authorization");
    const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      refresh_token?: string;
    };
    const token = (bearer || body.token || body.refresh_token || "").trim();
    if (!token || !(await verifySessionToken(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    applySessionCookie(res, token);
    return res;
  } catch {
    return NextResponse.json({ error: "Handoff failed" }, { status: 500 });
  }
}

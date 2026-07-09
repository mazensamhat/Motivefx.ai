import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, SESSION_DURATION } from "@/lib/session";

function getSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Native app handoff: verify session JWT, set httpOnly cookie, redirect into /terminal/.
 * Used because WebView cannot set httpOnly cookies from injected JS before the first load.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  const nextPath = url.searchParams.get("next")?.trim() || "/terminal/";

  if (!token) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.sub !== "string") {
      return NextResponse.redirect(new URL("/login", url.origin));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/terminal/";
  const res = NextResponse.redirect(new URL(safeNext, url.origin));
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
  return res;
}

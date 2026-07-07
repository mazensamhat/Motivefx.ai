import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "motivefx_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static terminal bundle (JS/CSS/images) must not bounce through login.
  if (
    pathname.startsWith("/terminal/assets/") ||
    pathname.startsWith("/terminal/brand/") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/app");
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/terminal", "/terminal/:path*"],
};

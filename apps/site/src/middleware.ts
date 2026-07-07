import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "motivefx_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/terminal") {
    const url = request.nextUrl.clone();
    url.pathname = "/terminal/";
    return NextResponse.redirect(url);
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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "motivefx_session";
const DEMO_COOKIE = "motivefx_demo";

function isStaticTerminalAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/terminal/assets/") ||
    pathname.startsWith("/terminal/brand/") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

function wantsPublicDemo(request: NextRequest): boolean {
  if (request.nextUrl.searchParams.get("demo") === "1") return true;
  if (request.cookies.get(DEMO_COOKIE)?.value === "1") return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static terminal bundle (JS/CSS/images) must not bounce through login.
  if (isStaticTerminalAsset(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const demo = wantsPublicDemo(request);

  if (!session && !demo) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname.startsWith("/terminal") ? "/terminal/?demo=1" : "/app");
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next();
  if (demo && !session) {
    response.cookies.set(DEMO_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
      httpOnly: false,
    });
  }
  return response;
}

export const config = {
  matcher: ["/terminal", "/terminal/:path*"],
};

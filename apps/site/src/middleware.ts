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

function isNativeAppShell(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return /MotiveFXNative/i.test(ua);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static terminal bundle (JS/CSS/images) must not bounce through login.
  if (isStaticTerminalAsset(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const demo = wantsPublicDemo(request);
  // Android/iOS WebView injects session via localStorage + custom UA.
  // Never force or keep ?demo=1 here — demo unlocks every module via hasModule()
  // and can surface public-demo purchase CTAs if native detection races.
  if (isNativeAppShell(request)) {
    const response = NextResponse.next();
    if (request.cookies.get(DEMO_COOKIE)?.value === "1") {
      response.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
    }
    return response;
  }

  if (!session && !demo) {
    // Prefer ungated read-only demo over a hard login wall for bare /terminal.
    // Use /terminal?demo=1 (no trailing slash) — /terminal/ 308s back to
    // /terminal under Next's default trailingSlash:false, which created a
    // multi-hop redirect Google Search Console flags as a redirect error.
    const demoUrl = request.nextUrl.clone();
    demoUrl.pathname = "/terminal";
    demoUrl.searchParams.set("demo", "1");
    const response = NextResponse.redirect(demoUrl);
    response.cookies.set(DEMO_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
      httpOnly: false,
    });
    return response;
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

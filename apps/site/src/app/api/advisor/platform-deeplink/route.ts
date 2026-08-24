import { badRequest, json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { isTrustedNativeReaderRequest } from "@/lib/terminal/ios-reader";
import { getPlatformPrefs } from "@/lib/terminal/platform-prefs";
import { buildDeeplink, findPlatform } from "@/lib/terminal/trading-platforms";

export const dynamic = "force-dynamic";

function isNativeShellRequest(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  if (/MotiveFXNative/i.test(ua)) return true;
  const shell = (request.headers.get("x-motivefx-shell") ?? "").trim().toLowerCase();
  return shell === "ios" || shell === "android";
}

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as {
    user_id?: string;
    module?: string;
    side?: string;
    symbol?: string;
    query?: string;
  };
  if (!body.user_id || !body.module) return badRequest("Missing user_id or module.");
  try {
    assertUserMatch(auth.session, body.user_id);

    // G4 App Review: native shells are monitor-only for odds / event markets.
    if (body.module === "betting" || body.module === "predictions") {
      if (isNativeShellRequest(request) || (await isTrustedNativeReaderRequest(request))) {
        return badRequest(
          "MotiveFX native apps are monitor-only for odds and event-market intel. Sportsbook and prediction-market app handoffs are disabled."
        );
      }
    }

    const prefs = await getPlatformPrefs(body.user_id);
    const entry = prefs[body.module];
    if (!entry?.platformId) {
      return badRequest("No app or broker configured for this module. Complete platform setup first.");
    }
    const url = buildDeeplink(body.module, entry.platformId, {
      symbol: body.symbol,
      query: body.query,
      side: body.side,
      customUrl: entry.customUrl,
    });
    if (!url) return badRequest("Could not build a link for the selected platform.");
    const platform = findPlatform(body.module, entry.platformId);
    return json({ url, platformId: entry.platformId, platformName: platform?.name ?? "Custom app" });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

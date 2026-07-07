import { badRequest, json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { getPlatformPrefs } from "@/lib/terminal/platform-prefs";
import { buildDeeplink, findPlatform } from "@/lib/terminal/trading-platforms";

export const dynamic = "force-dynamic";

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

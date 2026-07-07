import { json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { getPlatformPrefs } from "@/lib/terminal/platform-prefs";
import { catalogForApi } from "@/lib/terminal/trading-platforms";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    return json({ ...catalogForApi(), prefs: await getPlatformPrefs(userId) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

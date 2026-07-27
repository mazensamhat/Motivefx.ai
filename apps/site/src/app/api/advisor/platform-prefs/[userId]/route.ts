import { json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { getPlatformPrefs } from "@/lib/terminal/platform-prefs";
import { catalogForApi } from "@/lib/terminal/trading-platforms";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

async function prefsOrEmpty(userId: string) {
  try {
    return await Promise.race([
      getPlatformPrefs(userId),
      new Promise<Record<string, never>>((_, reject) => {
        setTimeout(() => reject(new Error("prefs_timeout")), 2_000);
      }),
    ]);
  } catch {
    return {};
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    // Always return static catalog even if DB prefs stall.
    return json({ ...catalogForApi(), prefs: await prefsOrEmpty(userId) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

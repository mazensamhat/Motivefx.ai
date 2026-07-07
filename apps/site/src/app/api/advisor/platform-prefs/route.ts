import { badRequest, json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { getPlatformPrefs, savePlatformPrefs } from "@/lib/terminal/platform-prefs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as {
    user_id?: string;
    prefs?: Record<string, { platformId: string; customUrl?: string | null }>;
  };
  if (!body.user_id || !body.prefs) return badRequest("Missing user_id or prefs.");
  try {
    assertUserMatch(auth.session, body.user_id);
    const prefs = Object.fromEntries(
      Object.entries(body.prefs).map(([k, v]) => [k, { platformId: v.platformId, customUrl: v.customUrl ?? null }])
    );
    await savePlatformPrefs(body.user_id, prefs);
    return json({ saved: true, prefs: await getPlatformPrefs(body.user_id) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

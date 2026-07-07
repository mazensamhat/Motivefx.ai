import { json, unauthorized } from "@/lib/api";
import { getBackendSession } from "@/lib/backend";
import { loadSiteBriefing } from "@/lib/site-briefing";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const briefing = await loadSiteBriefing(session.email);
  if (!briefing) {
    return json({ ok: false, error: "Could not load briefing." }, 503);
  }

  const backend = await getBackendSession(session.email);
  return json({
    ok: true,
    briefing,
    backendUserId: backend?.userId ?? null,
  });
}

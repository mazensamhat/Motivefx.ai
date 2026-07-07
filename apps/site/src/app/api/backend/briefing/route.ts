import { json, serverError, unauthorized } from "@/lib/api";
import { fetchBackendJson, getBackendSession } from "@/lib/backend";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const backend = await getBackendSession(session.email);
  if (!backend) {
    return json({ ok: false, error: "Backend unavailable. Start FastAPI on port 8001." }, 503);
  }

  const briefing = await fetchBackendJson<Record<string, unknown>>(
    `/api/home/briefing?user_id=${encodeURIComponent(backend.userId)}`,
    backend
  );

  if (!briefing) return serverError("Could not load briefing from backend.");

  return json({ ok: true, briefing, backendUserId: backend.userId });
}

import { badRequest, json, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/session";
import { getIntelPrefs, saveIntelPrefs } from "@/lib/terminal/intel-prefs";
import { normalizePrefs } from "@/lib/terminal/engines";
import type { IntelPrefs } from "@/lib/terminal/engines";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.id) return unauthorized();
  const prefs = await getIntelPrefs(session.id);
  return json({ prefs });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.id) return unauthorized();
  let body: { prefs?: IntelPrefs } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("JSON body required");
  }
  const prefs = await saveIntelPrefs(session.id, normalizePrefs(body.prefs));
  return json({ prefs });
}

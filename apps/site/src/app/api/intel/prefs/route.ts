import { badRequest, json, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/session";
import { getIntelPrefs, saveIntelPrefs } from "@/lib/terminal/intel-prefs";
import type { IntelPrefs } from "@/lib/terminal/engines";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.id) return unauthorized();
  try {
    const prefs = await getIntelPrefs(session.id, { strict: true });
    return json({ prefs });
  } catch {
    return json({ error: "Saved intelligence preferences are unavailable. Please retry." }, 503);
  }
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
  if (!body.prefs || typeof body.prefs !== "object" || Array.isArray(body.prefs)) return badRequest("Preferences required");
  try {
    const prefs = await saveIntelPrefs(session.id, body.prefs);
    return json({ prefs });
  } catch {
    return json({ error: "Intelligence preferences could not be saved. Please retry." }, 503);
  }
}

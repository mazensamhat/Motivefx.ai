import { badRequest, json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireFeature } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { addJournalEntry, listJournal } from "@/lib/terminal/journal";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as {
    user_id?: string;
    note?: string;
    module?: string;
    symbol?: string;
    signal_title?: string;
  };
  if (!body.user_id || !body.note) return badRequest("Missing user_id or note.");
  try {
    assertUserMatch(auth.session, body.user_id);
    const plan = planForUser(auth.session.user);
    requireFeature(plan, "decision_history");
    const id = await addJournalEntry(body.user_id, body.note, {
      module: body.module,
      symbol: body.symbol,
      signalTitle: body.signal_title,
    });
    return json({ saved: true, id, entries: await listJournal(body.user_id) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

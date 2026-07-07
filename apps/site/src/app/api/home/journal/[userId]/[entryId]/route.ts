import { json, badRequest } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireFeature } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { deleteJournalEntry, listJournal } from "@/lib/terminal/journal";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ userId: string; entryId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId, entryId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    requireFeature(planForUser(auth.session.user), "decision_history");
    if (!(await deleteJournalEntry(userId, entryId))) return badRequest("Journal entry not found.");
    return json({ removed: true, entries: await listJournal(userId) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

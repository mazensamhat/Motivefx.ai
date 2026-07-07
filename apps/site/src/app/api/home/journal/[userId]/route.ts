import { json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireFeature } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { listJournal } from "@/lib/terminal/journal";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    requireFeature(planForUser(auth.session.user), "decision_history");
    return json({ entries: await listJournal(userId) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

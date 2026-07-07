import { json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireModule } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { listBets } from "@/lib/terminal/bets";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    requireModule(planForUser(auth.session.user), "betting");
    return json({ bets: await listBets(userId) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

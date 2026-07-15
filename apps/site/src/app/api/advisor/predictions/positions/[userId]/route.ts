import { json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireModuleOrSim } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { listPredictions } from "@/lib/terminal/predictions";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    requireModuleOrSim(planForUser(auth.session.user), auth.session.user, "predictions");
    return json({ positions: await listPredictions(userId) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

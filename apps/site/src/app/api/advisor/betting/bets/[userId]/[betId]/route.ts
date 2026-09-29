import { json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireModuleOrSim } from "@/lib/terminal/access";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { deleteBet } from "@/lib/terminal/bets";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ userId: string; betId: string }> }
) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId, betId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    requireModuleOrSim(await entitlementsPlanForUser(auth.session.user), auth.session.user, "betting");
    const deleted = await deleteBet(userId, betId);
    return json({ deleted, id: betId });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

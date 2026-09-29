import { json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireModuleOrSim } from "@/lib/terminal/access";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { deletePrediction } from "@/lib/terminal/predictions";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ userId: string; positionId: string }> }
) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId, positionId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    requireModuleOrSim(await entitlementsPlanForUser(auth.session.user), auth.session.user, "predictions");
    const deleted = await deletePrediction(userId, positionId);
    return json({ deleted, id: positionId });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

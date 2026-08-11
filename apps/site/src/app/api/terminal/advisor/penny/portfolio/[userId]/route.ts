import { json } from "@/lib/api";
import {
  accessErrorResponse,
  assertUserMatch,
  requireTerminalSession,
} from "@/lib/terminal/auth";
import { requireFeature, requireModule } from "@/lib/terminal/access";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { loadPortfolio } from "@/lib/terminal/portfolio";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    const plan = await entitlementsPlanForUser(auth.session.user);
    requireModule(plan, "penny");
    requireFeature(plan, "portfolio_intelligence");
    const holdings = await loadPortfolio(userId, "penny");
    return json({ holdings });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

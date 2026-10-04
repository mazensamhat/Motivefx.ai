import { json } from "@/lib/api";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { requireFeature } from "@/lib/terminal/access";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { buildPortfolioIntelligence } from "@/lib/terminal/intelligence-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = await entitlementsPlanForUser(auth.session.user);
    requireFeature(plan, "portfolio_intelligence");
    return json(await buildPortfolioIntelligence(auth.session.user.id));
  } catch (error) {
    return accessErrorResponse(error);
  }
}

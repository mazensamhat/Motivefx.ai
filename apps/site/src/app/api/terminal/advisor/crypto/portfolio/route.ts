import { badRequest, json } from "@/lib/api";
import {
  accessErrorResponse,
  assertUserMatch,
  requireTerminalSession,
} from "@/lib/terminal/auth";
import { requireFeature, requireModule } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { savePortfolio, type Holding } from "@/lib/terminal/portfolio";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as { user_id?: string; holdings?: Holding[] };
  const userId = body.user_id;
  if (!userId) return badRequest("Missing user_id.");
  try {
    assertUserMatch(auth.session, userId);
    const plan = planForUser(auth.session.user);
    requireModule(plan, "crypto");
    requireFeature(plan, "portfolio_intelligence");
    const holdings = Array.isArray(body.holdings) ? body.holdings : [];
    await savePortfolio(userId, "crypto", holdings);
    return json({ saved: true, count: holdings.length });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

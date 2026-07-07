import { badRequest, json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireFeature, requireModule } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { loadPortfolio } from "@/lib/terminal/portfolio";
import { analyzeCryptoPortfolio, buildAdvisorResponse } from "@/lib/terminal/advisor-engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as { user_id?: string; holdings?: Array<{ symbol: string; amount?: number; avg_cost?: number }> };
  if (!body.user_id) return badRequest("Missing user_id.");
  try {
    assertUserMatch(auth.session, body.user_id);
    const plan = planForUser(auth.session.user);
    requireModule(plan, "crypto");
    requireFeature(plan, "portfolio_intelligence");
    const holdings = body.holdings?.length ? body.holdings : await loadPortfolio(body.user_id, "crypto");
    if (!holdings.length) return badRequest("Add crypto holdings first.");
    const analyzed = await analyzeCryptoPortfolio(holdings);
    return json(await buildAdvisorResponse("crypto", analyzed.summary, analyzed.recs));
  } catch (err) {
    return accessErrorResponse(err);
  }
}

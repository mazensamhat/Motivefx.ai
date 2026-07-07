import { badRequest, json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireFeature, requireModule } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { loadPortfolio, type Holding } from "@/lib/terminal/portfolio";
import {
  analyzeStockPortfolio,
  analyzeCryptoPortfolio,
  analyzePennyPortfolio,
  buildAdvisorResponse,
} from "@/lib/terminal/advisor-engine";

export const dynamic = "force-dynamic";

async function handleAnalyze(module: "trades" | "crypto" | "penny", request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as { user_id?: string; holdings?: Holding[] };
  if (!body.user_id) return badRequest("Missing user_id.");
  try {
    assertUserMatch(auth.session, body.user_id);
    const plan = planForUser(auth.session.user);
    requireModule(plan, module);
    requireFeature(plan, "portfolio_intelligence");
    const holdings = body.holdings?.length
      ? body.holdings
      : await loadPortfolio(body.user_id, module);
    if (!holdings.length) return badRequest("Add holdings first.");
    const analyzed =
      module === "trades"
        ? await analyzeStockPortfolio(holdings)
        : module === "crypto"
          ? await analyzeCryptoPortfolio(holdings)
          : await analyzePennyPortfolio(holdings);
    return json(await buildAdvisorResponse(module, analyzed.summary, analyzed.recs));
  } catch (err) {
    return accessErrorResponse(err);
  }
}

export async function POST(request: Request) {
  return handleAnalyze("trades", request);
}

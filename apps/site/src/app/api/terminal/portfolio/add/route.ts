import { badRequest, json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireFeature, requireModule } from "@/lib/terminal/access";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { loadPortfolio, savePortfolio, type Holding, type PortfolioModule } from "@/lib/terminal/portfolio";
import { addPrediction } from "@/lib/terminal/predictions";
import { addBet } from "@/lib/terminal/bets";

export const dynamic = "force-dynamic";

type AddableKind = PortfolioModule | "predictions" | "betting";

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as {
    user_id?: string;
    kind?: AddableKind;
    symbol?: string;
    title?: string;
    confidence?: number;
  };
  if (!body.user_id || !body.kind || !body.symbol) return badRequest("Missing required fields.");

  try {
    assertUserMatch(auth.session, body.user_id);
    const plan = await entitlementsPlanForUser(auth.session.user);

    if (body.kind === "predictions") {
      requireModule(plan, "predictions");
      const id = await addPrediction(body.user_id, {
        market: body.symbol,
        category: "signal",
        pick: body.title || body.symbol,
        yesPrice: body.confidence ? Math.min(1, Math.max(0, body.confidence / 100)) : undefined,
      });
      return json({ saved: true, id, kind: body.kind });
    }

    if (body.kind === "betting") {
      requireModule(plan, "betting");
      const id = await addBet(body.user_id, {
        matchup: body.symbol,
        pick: body.title || body.symbol,
        sport: "other",
      });
      return json({ saved: true, id, kind: body.kind });
    }

    requireModule(plan, body.kind);
    requireFeature(plan, "portfolio_intelligence");
    const current = await loadPortfolio(body.user_id, body.kind);
    const symbol = body.symbol.trim().toUpperCase();
    const existing = current.findIndex((h) => h.symbol.toUpperCase() === symbol);
    const holding: Holding = { symbol, shares: 1 };
    const next = existing >= 0
      ? current.map((h, i) => (i === existing ? { ...h, symbol } : h))
      : [...current, holding];
    await savePortfolio(body.user_id, body.kind, next);
    return json({ saved: true, count: next.length, already_present: existing >= 0, kind: body.kind });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

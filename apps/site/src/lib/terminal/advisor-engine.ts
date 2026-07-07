import { scanUnusualOptions, fetchCongressTrades, fetchPredictionMarkets, demoSharpAction } from "./feeds";
import { listBets } from "./bets";
import { listPredictions } from "./predictions";

export type Recommendation = {
  symbol: string;
  action: string;
  confidence: number;
  headline: string;
  reasoning: string;
  signals: string[];
};

export type AdvisorResult = {
  module: string;
  summary: string;
  recommendations: Recommendation[];
  picks: Recommendation[];
  ai_narrative: string;
  deep_scans: Array<{ title: string; detail: string }>;
  portfolio_value: number | null;
  news: Array<Record<string, unknown>>;
};

function localNarrative(module: string, summary: string, recs: Recommendation[]): string {
  const top = recs[0];
  const conclusion =
    recs.filter((r) => r.action === "buy").length >= recs.filter((r) => r.action === "sell").length
      ? "Bullish Continuation Likely"
      : "Wait for Confirmation";
  return [
    top ? `${top.symbol}: ${top.headline}` : `${module} desk scan complete`,
    summary,
    `CONCLUSION: ${conclusion}`,
    "Informational context only — not financial advice.",
  ].join("\n\n");
}

export async function analyzeStockPortfolio(holdings: Array<{ symbol: string; shares?: number; avg_cost?: number }>) {
  const unusual = scanUnusualOptions();
  const unusualBySym = Object.fromEntries(unusual.map((u) => [u.symbol, u]));
  const recs: Recommendation[] = holdings.map((h) => {
    const sym = h.symbol.toUpperCase();
    const shares = Number(h.shares ?? 0);
    const avg = h.avg_cost;
    const signals: string[] = [];
    let score = 55;
    let action = "hold";
    const u = unusualBySym[sym];
    if (u) {
      signals.push(`Unusual ${u.type} flow Vol/OI ${u.volOiRatio}x`);
      score += u.type === "call" ? 15 : -12;
    }
    if (score >= 65) action = "buy";
    else if (score <= 35) action = "sell";
    return {
      symbol: sym,
      action,
      confidence: Math.min(95, Math.max(40, score)),
      headline: action === "buy" ? `Bullish sentiment building in $${sym}` : action === "sell" ? `Bearish flow detected in $${sym}` : `Mixed signals on $${sym}`,
      reasoning: `${shares} shares @ ${avg ? `$${avg}` : "market"}. ${signals.join(" ") || "Monitor flow and earnings."}`,
      signals,
    };
  });
  const summary = `Analyzed ${holdings.length} positions. ${recs.filter((r) => r.action === "buy").length} bullish, ${recs.filter((r) => r.action === "sell").length} bearish. Data from options flow (informational only).`;
  return { summary, recs };
}

export async function analyzeCryptoPortfolio(holdings: Array<{ symbol: string; amount?: number; avg_cost?: number }>) {
  const recs: Recommendation[] = holdings.map((h) => {
    const sym = h.symbol.toUpperCase();
    const score = sym === "BTC" || sym === "ETH" ? 68 : 55;
    return {
      symbol: sym,
      action: score >= 65 ? "buy" : "hold",
      confidence: score,
      headline: `${sym} on-chain context`,
      reasoning: `${Number(h.amount ?? 0)} units tracked. Monitor whale flows and spot reserves.`,
      signals: ["On-chain lens"],
    };
  });
  return { summary: `Analyzed ${holdings.length} crypto positions.`, recs };
}

export async function analyzePennyPortfolio(holdings: Array<{ symbol: string; shares?: number; avg_cost?: number }>) {
  const recs: Recommendation[] = holdings.map((h) => ({
    symbol: h.symbol.toUpperCase(),
    action: "hold",
    confidence: 58,
    headline: `$${h.symbol.toUpperCase()} microcap watch`,
    reasoning: `${Number(h.shares ?? 0)} shares — elevated volatility context.`,
    signals: ["Pink slip scanner"],
  }));
  return { summary: `Analyzed ${holdings.length} pink slip positions.`, recs };
}

export async function analyzeBets(bets: Array<{ matchup?: string; pick?: string; stake?: number | null }>) {
  const picks: Recommendation[] = demoSharpAction().slice(0, 3).map((s) => ({
    symbol: s.matchup,
    action: "buy",
    confidence: s.confidence === "high" ? 72 : 64,
    headline: `Sharp side: ${s.sharpSide}`,
    reasoning: `Public ${s.publicPct}% vs money ${s.moneyPct}%.`,
    signals: ["Sharp Money"],
  }));
  const recs: Recommendation[] = bets.map((b) => ({
    symbol: b.matchup ?? "Game",
    action: "hold",
    confidence: 60,
    headline: b.pick ?? "Open bet",
    reasoning: `Stake $${b.stake ?? 0} — review line movement.`,
    signals: ["Bet grader"],
  }));
  const summary = bets.length ? `Graded ${bets.length} open bets.` : "No bets yet — here are AI sharp-side picks.";
  return { summary, recs, picks };
}

export async function analyzePredictions(positions: Array<{ market?: string; pick?: string; stake?: number | null }>) {
  const markets = await fetchPredictionMarkets(4);
  const recs: Recommendation[] = positions.map((p) => ({
    symbol: (p.market ?? "Market").slice(0, 48),
    action: "hold",
    confidence: 62,
    headline: p.pick ?? "Open position",
    reasoning: `Stake $${p.stake ?? 0} on event market.`,
    signals: ["Event market"],
  }));
  if (!recs.length) {
    for (const m of markets.slice(0, 2)) {
      recs.push({
        symbol: String(m.market).slice(0, 48),
        action: Number(m.yes) >= 0.5 ? "buy" : "hold",
        confidence: Math.round((Number(m.yes) || 0.5) * 100),
        headline: "Event market signal",
        reasoning: `${Math.round((Number(m.yes) || 0.5) * 100)}% implied yes on ${m.platform}.`,
        signals: ["Polymarket"],
      });
    }
  }
  return { summary: positions.length ? `Analyzed ${positions.length} prediction positions.` : "Top event markets flagged.", recs };
}

export async function buildAdvisorResponse(
  module: string,
  summary: string,
  recs: Recommendation[],
  opts: { picks?: Recommendation[]; portfolioValue?: number | null } = {}
): Promise<AdvisorResult> {
  const picks = opts.picks ?? [];
  return {
    module,
    summary,
    recommendations: recs,
    picks,
    ai_narrative: localNarrative(module, summary, recs),
    deep_scans: recs.slice(0, 3).map((r) => ({ title: r.headline, detail: r.reasoning })),
    portfolio_value: opts.portfolioValue ?? null,
    news: [],
  };
}

/**
 * Market Story Engine — packages approved truth; never invents live market state.
 */

import type { CampaignBrief, MarketStory, TruthClass } from "./types";

export function buildMarketStory(brief: CampaignBrief): MarketStory {
  const symbol = (brief.symbol?.trim() || "EUR/USD").toUpperCase();
  const truth = brief.marketTruth;

  if (brief.mode === "LIVE_MARKET" && truth) {
    const evidenceLines = truth.evidence
      .slice(0, 5)
      .map((e) => `${e.label}: ${e.stance}`)
      .join(" · ");
    return {
      marketEvent: `${truth.symbol} — approved Market Truth (${truth.truthClass}${truth.asOf ? ` · asOf ${truth.asOf}` : ""})`,
      tension: "Price movement and evidence alignment may disagree — the ad shows the conflict, not a tip.",
      evidence: evidenceLines || "Evidence stack from MotiveFX Market Truth",
      confluence: "Confluence is calculated in product code from validated sources",
      motiveSignal:
        truth.motiveSignal != null
          ? `Motive Signal ${truth.motiveSignal}${truth.stance ? ` · ${truth.stance}` : ""}${truth.confidence != null ? ` · confidence ${truth.confidence}` : ""}`
          : "Motive Signal from approved calculation",
      explanation: "AI may explain the stack; it does not invent the market state.",
      truthClass: truth.truthClass,
      symbol: truth.symbol,
    };
  }

  if (brief.mode === "MARKET_AWARE") {
    return {
      marketEvent: `${symbol} theme — market-aware creative (no live recommendation)`,
      tension: "Traders see noise and conflicting indicators every session",
      evidence: "Generic evidence categories only (momentum, structure, volatility, confirmation)",
      confluence: "Product teaches confluence without claiming today's call",
      motiveSignal: "Illustrative WAIT / context framing — not a live Motive Signal",
      explanation: "Market-aware mode must not assert live direction or entries.",
      truthClass: "EVERGREEN",
      symbol,
    };
  }

  // EVERGREEN
  return {
    marketEvent: "Trader uncertainty when markets are noisy",
    tension: "One indicator says BUY. Context may say wait.",
    evidence: "Momentum · Structure · Volatility · Macro · Confirmation",
    confluence: "MotiveFX stacks evidence before forming a Motive Signal",
    motiveSignal: "Clarity is the product — not a prediction bot",
    explanation: "Advertise the intelligence behind the decision.",
    truthClass: "EVERGREEN" as TruthClass,
    symbol,
  };
}

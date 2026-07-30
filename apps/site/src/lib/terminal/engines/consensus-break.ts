import type { ConsensusBreak } from "./types";

type FeedOpp = {
  id?: string;
  module?: string;
  symbol?: string;
  title?: string;
  confidence?: number;
  signals?: string[];
  reasons?: string[];
  riskLevel?: string;
};

type Sentiment = { reddit?: string; x?: string; news?: string };

/**
 * Consensus Break — flags where desk signals diverge from a simple “crowd” narrative.
 * Heuristic v1: high desk confidence + cautious/neutral sentiment, or high-risk flags vs bullish tape.
 */
export function detectConsensusBreaks(
  opportunities: FeedOpp[],
  sentiment: Sentiment,
  marketConfidenceLabel: string
): ConsensusBreak[] {
  const breaks: ConsensusBreak[] = [];
  const crowdBullish =
    sentiment.news === "bullish" ||
    sentiment.reddit === "bullish" ||
    marketConfidenceLabel === "HIGH";

  const top = opportunities[0];
  if (top && Number(top.confidence) >= 70 && !crowdBullish) {
    breaks.push({
      id: `cb-desk-vs-crowd-${top.id ?? top.symbol}`,
      claim: "Crowd narrative: quiet / range-bound tape with limited fresh catalysts.",
      breakReason: `Opportunity Radar shows $${top.symbol} at ${top.confidence}% strength (${(top.signals ?? [])[0] ?? "signal"}) while broad sentiment stays ${sentiment.news ?? "neutral"}.`,
      divergenceScore: Math.min(92, 55 + Math.floor(Number(top.confidence) / 3)),
      relatedSymbols: [String(top.symbol)],
      module: top.module,
    });
  }

  if (crowdBullish && opportunities.some((o) => o.riskLevel === "high" || o.riskLevel === "extreme")) {
    const risky = opportunities.find((o) => o.riskLevel === "high" || o.riskLevel === "extreme");
    if (risky) {
      breaks.push({
        id: `cb-risk-vs-optimism-${risky.id ?? risky.symbol}`,
        claim: "Crowd narrative: risk-on — elevated confidence in continued upside.",
        breakReason: `$${risky.symbol} carries ${risky.riskLevel} risk on the desk while market confidence reads ${marketConfidenceLabel}.`,
        divergenceScore: Math.min(90, 58 + (risky.riskLevel === "extreme" ? 20 : 12)),
        relatedSymbols: [String(risky.symbol)],
        module: risky.module,
      });
    }
  }

  const betting = opportunities.filter((o) => o.module === "betting");
  if (betting.length) {
    const b = betting[0];
    breaks.push({
      id: `cb-sharp-public-${b.id ?? "line"}`,
      claim: "Public tickets often lean with the popular side of the board.",
      breakReason: `${b.symbol}: line movement flagged without a matching public/sharp split — treat as odds context, not consensus confirmation.`,
      divergenceScore: 64,
      relatedSymbols: [String(b.symbol).slice(0, 48)],
      module: "betting",
    });
  }

  // Always surface at least one educational consensus-break tease when quiet
  if (breaks.length === 0) {
    breaks.push({
      id: "cb-quiet-tape",
      claim: "Consensus: nothing material is changing overnight.",
      breakReason:
        "Signal density is moderate — Consensus Break stays in watch mode until desk confluence diverges from the headline story.",
      divergenceScore: 48,
      relatedSymbols: opportunities.slice(0, 2).map((o) => String(o.symbol)).filter(Boolean),
    });
  }

  return breaks.slice(0, 3);
}

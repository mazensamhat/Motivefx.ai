import type { ConsensusBreak, ConsensusHistoryPoint } from "./types";

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

const historyRing: ConsensusHistoryPoint[] = [];
const MAX_HISTORY = 24;
const priorScores = new Map<string, number>();

/**
 * Phase 3 Consensus Break — systematic desk vs narrative divergence + short history.
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
  const crowdBearish = sentiment.news === "bearish" || sentiment.reddit === "bearish";

  const top = opportunities[0];
  if (top && Number(top.confidence) >= 68 && !crowdBullish) {
    const id = `cb-desk-vs-crowd-${top.id ?? top.symbol}`;
    const score = Math.min(92, 55 + Math.floor(Number(top.confidence) / 3));
    breaks.push({
      id,
      claim: "Crowd narrative: quiet / range-bound tape with limited fresh catalysts.",
      breakReason: `Opportunity Radar shows $${top.symbol} at ${top.confidence}% strength (${(top.signals ?? [])[0] ?? "signal"}) while broad sentiment stays ${sentiment.news ?? "neutral"}.`,
      divergenceScore: score,
      relatedSymbols: [String(top.symbol)],
      module: top.module,
      priorScore: priorScores.get(id),
      deltaVsPrior: priorScores.has(id) ? score - (priorScores.get(id) as number) : undefined,
      resolvedHint: "Watch for headline catch-up or desk confidence fade within 1–5 sessions.",
    });
  }

  if (crowdBullish && opportunities.some((o) => o.riskLevel === "high" || o.riskLevel === "extreme")) {
    const risky = opportunities.find((o) => o.riskLevel === "high" || o.riskLevel === "extreme");
    if (risky) {
      const id = `cb-risk-vs-optimism-${risky.id ?? risky.symbol}`;
      const score = Math.min(90, 58 + (risky.riskLevel === "extreme" ? 20 : 12));
      breaks.push({
        id,
        claim: "Crowd narrative: risk-on — elevated confidence in continued upside.",
        breakReason: `$${risky.symbol} carries ${risky.riskLevel} risk on the desk while market confidence reads ${marketConfidenceLabel}.`,
        divergenceScore: score,
        relatedSymbols: [String(risky.symbol)],
        module: risky.module,
        priorScore: priorScores.get(id),
        deltaVsPrior: priorScores.has(id) ? score - (priorScores.get(id) as number) : undefined,
        resolvedHint: "Break softens if risk labels cool or sentiment de-risks.",
      });
    }
  }

  if (crowdBearish && top && Number(top.confidence) >= 72) {
    const id = `cb-strength-vs-fear-${top.id ?? top.symbol}`;
    const score = Math.min(88, 60 + Math.floor(Number(top.confidence) / 4));
    breaks.push({
      id,
      claim: "Crowd narrative: defensive — fear dominating the tape.",
      breakReason: `Desk still shows $${top.symbol} at ${top.confidence}% while sentiment reads bearish — possible under-reaction.`,
      divergenceScore: score,
      relatedSymbols: [String(top.symbol)],
      module: top.module,
      priorScore: priorScores.get(id),
      deltaVsPrior: priorScores.has(id) ? score - (priorScores.get(id) as number) : undefined,
      resolvedHint: "Confirm with Probability Engine theme lift before treating as a thesis.",
    });
  }

  const betting = opportunities.filter((o) => o.module === "betting");
  if (betting.length) {
    const b = betting[0];
    const id = `cb-sharp-public-${b.id ?? "line"}`;
    const score = 64;
    breaks.push({
      id,
      claim: "Public tickets often lean with the popular side of the board.",
      breakReason: `${b.symbol}: line movement flagged without a matching public/sharp split — treat as odds context, not consensus confirmation.`,
      divergenceScore: score,
      relatedSymbols: [String(b.symbol).slice(0, 48)],
      module: "betting",
      priorScore: priorScores.get(id),
      deltaVsPrior: priorScores.has(id) ? score - (priorScores.get(id) as number) : undefined,
      resolvedHint: "Needs sharp/public feed for a true consensus print.",
    });
  }

  // Cross-module divergence: top two desks disagree on tone
  if (opportunities.length >= 2) {
    const a = opportunities[0];
    const b = opportunities[1];
    const gap = Math.abs(Number(a.confidence) - Number(b.confidence));
    if (gap >= 18 && a.module !== b.module) {
      const id = `cb-cross-desk-${a.module}-${b.module}`;
      const score = Math.min(85, 50 + gap);
      breaks.push({
        id,
        claim: "Cross-desk consensus: markets should move together.",
        breakReason: `${a.module} ($${a.symbol} ${a.confidence}%) vs ${b.module} ($${b.symbol} ${b.confidence}%) — ${gap}pt desk gap.`,
        divergenceScore: score,
        relatedSymbols: [String(a.symbol), String(b.symbol)].filter(Boolean),
        module: a.module,
        priorScore: priorScores.get(id),
        deltaVsPrior: priorScores.has(id) ? score - (priorScores.get(id) as number) : undefined,
        resolvedHint: "Relationship Engine links may explain the gap — check connected nodes.",
      });
    }
  }

  if (breaks.length === 0) {
    breaks.push({
      id: "cb-quiet-tape",
      claim: "Consensus: nothing material is changing overnight.",
      breakReason:
        "Signal density is moderate — Consensus Break stays in watch mode until desk confluence diverges from the headline story.",
      divergenceScore: 48,
      relatedSymbols: opportunities.slice(0, 2).map((o) => String(o.symbol)).filter(Boolean),
      resolvedHint: "Re-check after the next Daily Brief refresh.",
    });
  }

  const sliced = breaks
    .sort((a, b) => b.divergenceScore - a.divergenceScore)
    .slice(0, 4);

  for (const b of sliced) {
    priorScores.set(b.id, b.divergenceScore);
  }

  const avg =
    sliced.reduce((s, b) => s + b.divergenceScore, 0) / Math.max(1, sliced.length);
  historyRing.push({
    at: new Date().toISOString(),
    avgDivergence: Math.round(avg),
    topId: sliced[0]?.id ?? "none",
    topScore: sliced[0]?.divergenceScore ?? 0,
  });
  while (historyRing.length > MAX_HISTORY) historyRing.shift();

  return sliced;
}

export function getConsensusHistory(): ConsensusHistoryPoint[] {
  return [...historyRing];
}

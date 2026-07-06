/** MotiveFX proprietary sentiment rating — descriptive, not prescriptive. */

export type MotiveRatingVariant = "buy" | "sell" | "neutral";

export type MotiveRatingContext = "markets" | "betting" | "predictions";

export interface MotiveRating {
  score: number;
  label: string;
  shortLabel: string;
  variant: MotiveRatingVariant;
  tier: "strong-bullish" | "bullish" | "neutral" | "bearish" | "strong-bearish";
}

export const MOTIVE_RATING_DISCLAIMER =
  "Based on algorithmic analysis of market data. Not financial advice.";

function direction(action: string): "bull" | "bear" | "neutral" {
  const a = action.toLowerCase();
  if (a === "buy" || a === "lean") return "bull";
  if (a === "sell" || a === "fade") return "bear";
  return "neutral";
}

function marketLabel(tier: MotiveRating["tier"]): string {
  switch (tier) {
    case "strong-bullish":
      return "Strong Bullish";
    case "bullish":
      return "Bullish";
    case "bearish":
      return "Bearish";
    case "strong-bearish":
      return "Strong Bearish";
    default:
      return "Neutral";
  }
}

function bettingLabel(tier: MotiveRating["tier"], action: string): string {
  if (tier === "neutral") return "Mixed Line Data";
  if (tier === "strong-bullish" || tier === "bullish") {
    return action === "lean" ? "Lean — Market Signal" : "Higher Probability";
  }
  return "Lower Probability";
}

function predictionsLabel(tier: MotiveRating["tier"]): string {
  if (tier === "neutral") return "Mixed Market Odds";
  if (tier === "strong-bullish" || tier === "bullish") return "Consensus Trend Favors";
  return "Crowd Divergence";
}

function resolveTier(dir: "bull" | "bear" | "neutral", confidence: number): MotiveRating["tier"] {
  if (dir === "neutral") return "neutral";
  const strong = confidence >= 80;
  if (dir === "bull") return strong ? "strong-bullish" : "bullish";
  return strong ? "strong-bearish" : "bearish";
}

function variantForTier(tier: MotiveRating["tier"]): MotiveRatingVariant {
  if (tier === "strong-bullish" || tier === "bullish") return "buy";
  if (tier === "strong-bearish" || tier === "bearish") return "sell";
  return "neutral";
}

export function resolveMotiveRating(
  action: string,
  confidence: number,
  context: MotiveRatingContext = "markets"
): MotiveRating {
  const score = Math.min(100, Math.max(0, Math.round(confidence)));
  const dir = direction(action);
  const tier = resolveTier(dir, score);
  const variant = variantForTier(tier);

  let label: string;
  if (context === "betting") label = bettingLabel(tier, action);
  else if (context === "predictions") label = predictionsLabel(tier);
  else label = marketLabel(tier);

  return {
    score,
    label,
    shortLabel: label,
    variant,
    tier,
  };
}

export function formatMotiveSignalScore(score: number): string {
  return `${score} / 100`;
}

/** Normalize backend signal names into readable reason lines. */
export function formatSignalReasons(signals: string[], reasoning?: string, limit = 5): string[] {
  const fromSignals = signals.filter(Boolean).slice(0, limit);
  if (fromSignals.length) return fromSignals;
  if (reasoning) {
    return reasoning
      .split(/[.;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8)
      .slice(0, limit);
  }
  return [];
}

export function sentimentBadgeClass(tier: MotiveRating["tier"]): string {
  switch (tier) {
    case "strong-bullish":
    case "bullish":
      return "motive-sentiment-bull";
    case "strong-bearish":
    case "bearish":
      return "motive-sentiment-bear";
    default:
      return "motive-sentiment-neutral";
  }
}

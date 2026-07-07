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

/** Prefer explicit reasons from the advisor engine; otherwise expand signals/reasoning into readable lines. */
export function formatSignalReasons(
  signals: string[],
  reasoning?: string,
  limit = 5,
  explicitReasons?: string[]
): string[] {
  if (explicitReasons?.length) return explicitReasons.slice(0, limit);

  const fromReasoning = reasoning
    ? reasoning
        .split(/[.;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 12)
    : [];

  if (fromReasoning.length >= 2) return fromReasoning.slice(0, limit);

  const expanded = signals.filter(Boolean).map((s) => expandSignalToReason(s));
  if (expanded.length) return expanded.slice(0, limit);

  if (reasoning) {
    return reasoning
      .split(/[.;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8)
      .slice(0, limit);
  }
  return [];
}

function expandSignalToReason(signal: string): string {
  const s = signal.toLowerCase();
  if (s.includes("vol/oi") || s.includes("unusual")) {
    return `${signal} — options volume exceeded typical open-interest ranges, a common precursor to directional positioning.`;
  }
  if (s.includes("whale")) {
    return `${signal} — large on-chain transfer flagged; monitor exchange reserves and spot liquidity.`;
  }
  if (s.includes("sharp")) {
    return `${signal} — professional handle diverges from public ticket count on this matchup.`;
  }
  if (s.includes("volume") || s.includes("microcap") || s.includes("pink")) {
    return `${signal} — relative volume spike on a sub-$5 name; elevated volatility context.`;
  }
  if (s.includes("congress") || s.includes("insider")) {
    return `${signal} — recent disclosure cross-referenced with price and flow activity.`;
  }
  if (s.includes("event market") || s.includes("polymarket")) {
    return `${signal} — implied odds from prediction market; reflects crowd consensus, not a forecast.`;
  }
  return `${signal} — flagged by MotiveFX desk scanners and cross-referenced with live feeds.`;
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

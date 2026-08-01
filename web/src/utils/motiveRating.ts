/** MotiveFX proprietary stance rating — descriptive, not prescriptive. */

import {
  expandSignalToReason as expandSignalClarity,
  stancePlainExplain,
  type SignalReasonContext,
} from "./signalClarity";

export type MotiveRatingVariant = "buy" | "sell" | "neutral";

export type MotiveRatingContext = "markets" | "betting" | "predictions";

export type MotiveStance =
  | "long_term_hold"
  | "would_hold"
  | "short_term_hold"
  | "hold"
  | "wouldnt_buy"
  | "would_avoid"
  | "sell";

export interface MotiveRating {
  score: number;
  label: string;
  shortLabel: string;
  variant: MotiveRatingVariant;
  tier: "strong-bullish" | "bullish" | "neutral" | "bearish" | "strong-bearish";
}

export const MOTIVE_RATING_DISCLAIMER =
  "Based on algorithmic analysis of market data. Not financial advice.";

const STANCE_LABELS: Record<string, string> = {
  long_term_hold: "Longer-term attention",
  would_hold: "Supportive context",
  short_term_hold: "Near-term attention",
  hold: "Mixed / watch",
  wouldnt_buy: "Cautious on new entries",
  would_avoid: "Elevated caution",
  sell: "Defensive lean",
  // legacy engine keys
  buy: "Supportive context",
  lean: "Near-term attention",
  fade: "Elevated caution",
};

/** Map composite score (0–100) to a stance key used by the advisor engine. */
export function resolveStanceFromScore(score: number): MotiveStance {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  if (s >= 82) return "long_term_hold";
  if (s >= 72) return "would_hold";
  if (s >= 62) return "short_term_hold";
  if (s >= 48) return "hold";
  if (s >= 40) return "wouldnt_buy";
  if (s >= 32) return "would_avoid";
  return "sell";
}

export function stanceLabel(action: string): string {
  const key = normalizeAction(action);
  if (STANCE_LABELS[key]) return STANCE_LABELS[key];
  // Already a human phrase from the engine
  if (/hold|sell|avoid|wouldn't|would/i.test(action)) return action.trim();
  return "Hold";
}

function normalizeAction(action: string): string {
  return action
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[\s-]+/g, "_");
}

function direction(action: string): "bull" | "bear" | "neutral" {
  const a = normalizeAction(action);
  if (
    a === "buy" ||
    a === "lean" ||
    a === "long_term_hold" ||
    a === "would_hold" ||
    a === "short_term_hold" ||
    a === "i_would_hold" ||
    a === "longterm_hold" ||
    a === "shortterm_hold"
  ) {
    return "bull";
  }
  if (
    a === "sell" ||
    a === "fade" ||
    a === "would_avoid" ||
    a === "i_would_avoid" ||
    a === "wouldnt_buy" ||
    a === "i_wouldnt_buy"
  ) {
    return "bear";
  }
  return "neutral";
}

function bettingLabel(tier: MotiveRating["tier"], action: string): string {
  if (tier === "neutral") return "Mixed Line Data";
  if (tier === "strong-bullish" || tier === "bullish") {
    return action === "lean" ? "Lean — Market Signal" : "Higher Probability";
  }
  return "Lower Probability";
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
  if (context === "betting") {
    label = bettingLabel(tier, action);
  } else {
    // Markets + predictions: stance phrases (Hold, Sell, I wouldn't buy, …)
    label = stanceLabel(action);
  }

  return {
    score,
    label,
    shortLabel: label,
    variant,
    tier,
  };
}

export function formatMotiveSignalScore(score: number): string {
  return `${score} / 100 attention`;
}

/** Prefer explicit reasons from the advisor engine; otherwise expand signals/reasoning into readable lines. */
export function formatSignalReasons(
  signals: string[],
  reasoning?: string,
  limit = 5,
  explicitReasons?: string[],
  ctx?: SignalReasonContext
): string[] {
  if (explicitReasons?.length) {
    const lines = explicitReasons.slice(0, limit);
    if (ctx?.symbol && !lines.some((l) => /not a|informational|attention/i.test(l))) {
      return [...lines, stancePlainExplain("hold")].slice(0, limit + 1);
    }
    return lines;
  }

  const fromReasoning = reasoning
    ? reasoning
        .split(/[.;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 12)
    : [];

  if (fromReasoning.length >= 2) return fromReasoning.slice(0, limit);

  const expanded = signals.filter(Boolean).map((s) => expandSignalClarity(s, ctx));
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

/** @deprecated use signalClarity.expandSignalToReason — kept for any direct imports */
export function expandSignalToReason(signal: string, ctx?: SignalReasonContext): string {
  return expandSignalClarity(signal, ctx);
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

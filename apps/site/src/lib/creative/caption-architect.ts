/**
 * Caption Architect — HOOK → recognition → tension → evidence → reveal → insight → CTA
 */

import type { CampaignBrief, CaptionPackage, MarketStory, ScoredHook } from "./types";

export function buildCaption(
  hook: ScoredHook,
  story: MarketStory,
  brief: CampaignBrief
): CaptionPackage {
  const symbol = story.symbol ?? brief.symbol ?? "the market";

  const traderRecognition =
    brief.trader === "overtrader"
      ? "You know the feeling — entries that feel perfect until they don't."
      : brief.trader === "signal_seeker"
        ? "You're not short on signals. You're short on alignment."
        : brief.trader === "beginner"
          ? "If markets feel overwhelming, it's because one screen isn't the whole story."
          : "Serious traders don't confuse a green indicator with a trade.";

  const marketTension =
    story.tension ||
    "The setup can look bullish while structure, volatility, and confirmation disagree.";

  const evidence =
    brief.mode === "LIVE_MARKET"
      ? `Evidence (approved): ${story.evidence}`
      : "Markets aren't one indicator. Momentum can look bullish while structure, volatility, and broader conditions tell a different story.";

  const motiveReveal =
    "MotiveFX brings the evidence together before forming the signal.\n\nNot:\n“AI says buy.”\n\nBut:\n“Here's what the evidence says—and here's why.”";

  const insight =
    brief.angle === "risk_awareness"
      ? "NO TRADE can be a signal. Clarity sometimes means sitting out."
      : "Trade with context — direction and trade quality aren't the same thing.";

  const cta =
    brief.objective === "signup" || brief.objective === "trial"
      ? "See the evidence. MotiveFX.ai"
      : "Trade with context. MotiveFX.ai";

  const parts = [
    hook.text,
    "",
    traderRecognition,
    "",
    marketTension,
    "",
    evidence,
    "",
    motiveReveal,
    "",
    insight,
    "",
    cta,
  ];

  return {
    hook: hook.text,
    traderRecognition,
    marketTension,
    evidence,
    motiveReveal,
    insight,
    cta,
    fullCaption: parts.join("\n"),
  };
}

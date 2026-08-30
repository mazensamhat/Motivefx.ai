/**
 * MotiveFX Hook Engine — trading-specific hook families (not lifestyle copy).
 */

import type { CampaignBrief, HookCandidate, HookFamily } from "./types";

const FAMILY_BANK: Record<HookFamily, string[]> = {
  market_confusion: [
    "{symbol} is moving. But is there actually a trade?",
    "Price action isn't the same as a decision.",
    "The chart is loud. The evidence might be quiet.",
    "Movement without context is just noise.",
  ],
  signal_overload: [
    "More indicators aren't giving you more clarity.",
    "Twelve panels. Zero confluence.",
    "If everything is a signal, nothing is.",
    "Your screen is full. Your conviction isn't.",
  ],
  contrarian: [
    "Stop asking AI where {symbol} is going.",
    "AI shouldn't predict the market for you.",
    "Prediction theater is not market intelligence.",
    "The opposite of an AI trading bot.",
  ],
  decision_tension: [
    "The setup looks bullish. The evidence doesn't.",
    "Bullish candle. Missing confirmation.",
    "You want to click BUY. Show me why.",
    "Looks clean — until you stack the evidence.",
  ],
  missed_context: [
    "You saw the breakout. Did you see what was behind it?",
    "The move is obvious. The why isn't.",
    "Everyone saw the candle. Few saw the context.",
    "What the chart shows vs what the market is doing.",
  ],
  confluence: [
    "One indicator says buy. Five pieces of evidence say wait.",
    "1 INDICATOR ≠ A TRADE",
    "Confluence isn't consensus — it's evidence alignment.",
    "When sources disagree, MotiveFX doesn't pretend they agree.",
  ],
  timing: [
    "Being right about direction isn't enough.",
    "Right idea. Wrong moment.",
    "Direction and trade quality aren't the same thing.",
    "Timing isn't a feeling. It's confirmation.",
  ],
  demonstration: [
    "{symbol}. 6 signals. 1 conclusion.",
    "4 bullish signals. MotiveFX still says WAIT.",
    "Watch the evidence stack before the call.",
    "Same chart. Different decision — because of evidence.",
  ],
  trader_pain: [
    "Ever enter a trade—and immediately start looking for reasons you were right?",
    "Ever enter a perfect setup that immediately fails?",
    "The worst feeling: confident entry, instant doubt.",
    "You didn't need another indicator. You needed context.",
  ],
  pattern_interrupt: [
    "NO TRADE can be a signal.",
    "WAIT is a decision.",
    "Not every move deserves a position.",
    "Clarity sometimes means sitting out.",
  ],
  evidence_challenge: [
    "Before you click BUY, show me the evidence.",
    "If you can't show the stack, you don't have a trade.",
    "Conviction without evidence is just hope.",
    "What would change your mind? MotiveFX shows it.",
  ],
  ai_misconception: [
    "AI shouldn't predict the market for you. It should help you understand it.",
    "We're not another AI that 'knows' the next candle.",
    "Explain the evidence. Don't invent the future.",
    "Intelligence behind the decision — not a magic BUY button.",
  ],
};

const LANE_BY_FAMILY: Partial<Record<HookFamily, HookCandidate["battleLane"]>> = {
  contrarian: "A",
  missed_context: "B",
  trader_pain: "C",
  demonstration: "D",
  timing: "E",
};

function pickSymbol(brief: CampaignBrief): string {
  return (brief.symbol?.trim() || "EUR/USD").toUpperCase();
}

function fill(template: string, symbol: string): string {
  return template.replaceAll("{symbol}", symbol);
}

/** Generate 12–20 competing hooks across MotiveFX families. */
export function generateHooks(brief: CampaignBrief, count = 16): HookCandidate[] {
  const symbol = pickSymbol(brief);
  const families = Object.keys(FAMILY_BANK) as HookFamily[];
  const angleBoost: HookFamily[] =
    brief.angle === "confluence"
      ? ["confluence", "demonstration", "decision_tension"]
      : brief.angle === "ai_explanation"
        ? ["ai_misconception", "contrarian", "evidence_challenge"]
        : brief.angle === "risk_awareness"
          ? ["pattern_interrupt", "timing", "trader_pain"]
          : brief.angle === "evidence"
            ? ["evidence_challenge", "missed_context", "confluence"]
            : ["market_confusion", "signal_overload", "demonstration"];

  const ordered = [...new Set([...angleBoost, ...families])];
  const out: HookCandidate[] = [];
  let i = 0;
  for (const family of ordered) {
    for (const template of FAMILY_BANK[family]) {
      if (out.length >= count) break;
      out.push({
        id: `hook_${String(++i).padStart(2, "0")}`,
        family,
        text: fill(template, symbol),
        battleLane: LANE_BY_FAMILY[family] ?? "OTHER",
      });
    }
    if (out.length >= count) break;
  }
  return out.slice(0, Math.max(12, Math.min(count, 20)));
}

/**
 * Visual Hook Engine — show the decision, not glowing AI brains.
 */

import type { CampaignBrief, MarketStory, TruthClass, VisualConcept } from "./types";

function truthBanner(truthClass: TruthClass): string {
  if (truthClass === "EVERGREEN") return "Evergreen product illustration — not a live call.";
  if (truthClass === "DEMO" || truthClass === "SIMULATED")
    return `Marked ${truthClass} — not live trading advice.`;
  if (truthClass === "LIVE" || truthClass === "DELAYED" || truthClass === "HISTORICAL")
    return `Values from approved Market Truth (${truthClass}).`;
  return "Truth class required before publish.";
}

export function buildVisualConcepts(brief: CampaignBrief, story: MarketStory): VisualConcept[] {
  const truthClass = story.truthClass;
  const live = brief.mode === "LIVE_MARKET" && brief.marketTruth;
  const rowsFromTruth =
    live && brief.marketTruth
      ? brief.marketTruth.evidence.slice(0, 5).map((e) => ({
          label: e.label,
          value: e.stance,
        }))
      : [
          { label: "Momentum", value: "▲ Bullish" },
          { label: "Structure", value: "▲ Bullish" },
          { label: "Volatility", value: "⚠ Elevated" },
          { label: "Macro", value: "▼ Bearish" },
          { label: "Confirmation", value: "✕ Missing" },
        ];

  const conflicting: VisualConcept = {
    id: "conflicting_evidence",
    headline: "BUY?",
    rows: rowsFromTruth,
    resolution: live && brief.marketTruth?.stance
      ? `MotiveFX: ${brief.marketTruth.stance.toUpperCase()}`
      : "MotiveFX: WAIT",
    truthClass: live ? truthClass : brief.mode === "EVERGREEN" ? "EVERGREEN" : "DEMO",
    notes: truthBanner(live ? truthClass : "DEMO"),
  };

  const confluence: VisualConcept = {
    id: "confluence",
    headline: "1 INDICATOR ≠ A TRADE",
    rows: [
      { label: "Source A", value: "Bullish" },
      { label: "Source B", value: "Bullish" },
      { label: "Source C", value: "Conflict" },
      { label: "Source D", value: "Missing" },
    ],
    resolution: "→ MOTIVE SIGNAL (evidence-aligned)",
    truthClass: "EVERGREEN",
    notes: "Evergreen confluence diagram — no live prices.",
  };

  const symbol = (story.symbol || brief.symbol || "EUR/USD").toUpperCase();
  const confidence: VisualConcept = {
    id: "confidence_board",
    headline: `${symbol}`,
    rows: live && brief.marketTruth
      ? [
          {
            label: "Stance",
            value: (brief.marketTruth.stance || "—").toUpperCase(),
          },
          {
            label: "Confidence",
            value:
              brief.marketTruth.confidence != null
                ? `${brief.marketTruth.confidence}%`
                : "—",
          },
          ...rowsFromTruth.slice(0, 4),
        ]
      : [
          { label: "Stance", value: "BULLISH (DEMO)" },
          { label: "Confidence", value: "78% (DEMO)" },
          { label: "Structure", value: "✓" },
          { label: "Momentum", value: "✓" },
          { label: "Trend", value: "✓" },
          { label: "Volatility", value: "⚠" },
          { label: "Confirmation", value: "✕" },
        ],
    resolution: "WHY? — evidence board, not a tip",
    truthClass: live ? truthClass : "DEMO",
    notes: live
      ? truthBanner(truthClass)
      : "DEMO board only — live values require approved Market Truth.",
  };

  if (brief.angle === "confluence") return [confluence, conflicting, confidence];
  if (brief.angle === "confidence") return [confidence, conflicting, confluence];
  return [conflicting, confluence, confidence];
}

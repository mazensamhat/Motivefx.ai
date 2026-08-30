/**
 * First-3-Seconds Video Engine — open on decision tension, not logo sting.
 */

import type { CampaignBrief, MarketStory, VideoConcept } from "./types";

export function buildVideoConcept(brief: CampaignBrief, story: MarketStory): VideoConcept {
  const symbol = (story.symbol || brief.symbol || "EUR/USD").toUpperCase();

  return {
    title: `${symbol} — Not so fast`,
    beats: [
      {
        startSec: 0,
        endSec: 1,
        onScreen: "Chart moving violently",
        voiceOrSuper: "BUY?",
      },
      {
        startSec: 1,
        endSec: 2,
        onScreen: "Single indicator flashes green",
        voiceOrSuper: "Indicator: BUY",
      },
      {
        startSec: 2,
        endSec: 3,
        onScreen: "Screen freezes",
        voiceOrSuper: "Not so fast.",
      },
      {
        startSec: 3,
        endSec: 6,
        onScreen: "Evidence stack appears",
        voiceOrSuper:
          brief.mode === "LIVE_MARKET" && brief.marketTruth
            ? brief.marketTruth.evidence
                .slice(0, 4)
                .map((e) => `${e.label} ${e.stance}`)
                .join(" · ") || "Evidence stack"
            : "Momentum BUY · Structure BUY · Volatility HIGH · Confirmation MISSING",
      },
      {
        startSec: 6,
        endSec: 9,
        onScreen: "MotiveFX resolution",
        voiceOrSuper: "WAIT",
      },
      {
        startSec: 9,
        endSec: 12,
        onScreen: "Doctrine line",
        voiceOrSuper: "One indicator isn't the market.",
      },
      {
        startSec: 12,
        endSec: 15,
        onScreen: "MotiveFX mark + product",
        voiceOrSuper: "See the evidence.",
      },
    ],
    closingLine: "Don't advertise a prediction. Advertise the intelligence behind the decision.",
  };
}

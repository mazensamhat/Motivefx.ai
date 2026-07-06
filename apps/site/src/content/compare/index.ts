import type { ComparePageContent } from "../types";

const base = (slug: string, competitor: string, lead: string): ComparePageContent => ({
  slug,
  competitor,
  title: `MotiveFX vs ${competitor}`,
  metaDescription: `Compare MotiveFX AI market intelligence to ${competitor}. Multi-market AI briefs, Motive Signal, and portfolio-aware research.`,
  lead,
  motivefxWins: [
    "AI daily briefings with Why It Matters explanations",
    "Five markets in one terminal (stocks, crypto, sports, predictions, pink sheets)",
    "Motive Signal confidence scoring",
    "Portfolio-aware intelligence (Pro+)",
    "Voice briefings and Decision History (Ultra+)",
  ],
  competitorWins: [
    `${competitor} may offer features MotiveFX does not focus on — evaluate your specific workflow.`,
  ],
  sections: [
    {
      heading: "Philosophy",
      paragraphs: [
        `MotiveFX is an AI chief of staff for market intelligence — personalized, multi-market, and explanation-first.`,
        `${competitor} serves a different primary use case. Many traders use both: discovery on MotiveFX, execution elsewhere.`,
      ],
    },
    {
      heading: "Best for",
      paragraphs: [
        "Choose MotiveFX if you want cross-market AI briefs, Motive Signal ranking, and portfolio-linked alerts.",
        `Choose ${competitor} if its specific charting, social, or terminal features are non-negotiable for your stack.`,
      ],
    },
  ],
  faqs: [
    {
      question: `Can I use MotiveFX with ${competitor}?`,
      answer: "Yes. MotiveFX complements charting platforms, brokers, and news terminals — it focuses on intelligence and research.",
    },
  ],
});

export const COMPARE_PAGES: Record<string, ComparePageContent> = {
  tradingview: base("tradingview", "TradingView", "TradingView excels at charting; MotiveFX excels at AI market intelligence and cross-asset briefs."),
  "yahoo-finance": base("yahoo-finance", "Yahoo Finance", "Yahoo Finance is broad financial media; MotiveFX is personalized AI intelligence with Motive Signal."),
  "seeking-alpha": base("seeking-alpha", "Seeking Alpha", "Seeking Alpha emphasizes crowdsourced equity research; MotiveFX delivers AI-structured multi-market intelligence."),
  benzinga: base("benzinga", "Benzinga", "Benzinga focuses on news speed; MotiveFX adds AI synthesis, scoring, and portfolio context."),
  marketwatch: base("marketwatch", "MarketWatch", "MarketWatch covers financial news; MotiveFX is an actionable intelligence terminal."),
  finviz: base("finviz", "Finviz", "Finviz offers screening and heatmaps; MotiveFX adds AI briefs and Motive Signal across five markets."),
  bloomberg: base("bloomberg", "Bloomberg", "Bloomberg is institutional-grade terminal data; MotiveFX brings AI chief-of-staff intelligence at consumer-friendly tiers."),
};

export function getCompare(slug: string) {
  return COMPARE_PAGES[slug];
}

export function allCompareSlugs() {
  return Object.keys(COMPARE_PAGES);
}

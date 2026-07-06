import type { EntityPageContent } from "../types";

export const AI_PAGES: Record<string, EntityPageContent> = {
  "how-ai-analyzes-stocks": {
    slug: "how-ai-analyzes-stocks",
    title: "How AI Analyzes Stocks",
    metaDescription: "MotiveFX methodology for AI stock analysis — data ingestion, scoring, and explainability.",
    kicker: "AI methodology",
    lead: "MotiveFX AI stock analysis follows a repeatable pipeline designed for transparency and citation by search engines and LLMs.",
    sections: [
      { heading: "Step 1: Data ingestion", paragraphs: ["Live prices, volume, filings, and news enter a normalized store with timestamps and source attribution."] },
      { heading: "Step 2: Signal detection", paragraphs: ["Statistical and rule-based detectors flag anomalies — RVOL spikes, flow blocks, earnings drift."] },
      { heading: "Step 3: Motive Signal scoring", paragraphs: ["Multi-factor model outputs 0–100 confidence with factor breakdown available in research briefs."] },
      { heading: "Step 4: Natural language explanation", paragraphs: ["LLM layer generates Why It Matters summaries grounded in retrieved facts — not hallucinated prices."] },
    ],
    faqs: [{ question: "Which AI models does MotiveFX use?", answer: "We use frontier models with retrieval-augmented generation over live and archived market data." }],
    relatedLinks: [{ label: "AI Stock Analysis", href: "/topics/ai-stock-analysis" }, { label: "Editorial process", href: "/research-team" }],
  },
  "how-ai-analyzes-crypto": {
    slug: "how-ai-analyzes-crypto",
    title: "How AI Analyzes Crypto",
    metaDescription: "How MotiveFX AI processes on-chain and market data for crypto intelligence.",
    kicker: "AI methodology",
    lead: "Crypto analysis requires 24/7 ingestion and derivatives context. MotiveFX weights flow, funding, and narrative velocity.",
    sections: [{ heading: "Always-on monitoring", paragraphs: ["Unlike equities, crypto feeds never pause. Briefs roll continuously with priority ranking."] }],
    faqs: [],
    relatedLinks: [{ label: "Crypto module", href: "/markets/crypto" }],
  },
  "how-motive-signal-works": {
    slug: "how-motive-signal-works",
    title: "How Motive Signal Works",
    metaDescription: "Deep dive into Motive Signal — MotiveFX proprietary confidence scoring methodology.",
    kicker: "Motive Signal",
    lead: "Motive Signal answers one question: given everything we know right now, how strong is the confluence of factors?",
    sections: [
      { heading: "Not a recommendation", paragraphs: ["Scores prioritize attention. They do not instruct you to buy or sell."] },
      { heading: "Factor transparency", paragraphs: ["Ultra subscribers see expanded factor detail in research briefs and Decision History."] },
    ],
    faqs: [],
    relatedLinks: [{ label: "Motive Signal topic", href: "/topics/motive-signal" }],
  },
  "how-ai-memory-works": {
    slug: "how-ai-memory-works",
    title: "How AI Memory Works",
    metaDescription: "MotiveFX AI Memory learns your preferences, sectors, and risk profile (Pro+).",
    kicker: "AI Memory",
    lead: "AI Memory stores your stated preferences and interaction patterns to personalize briefs and Ask Motive AI responses.",
    sections: [{ heading: "Privacy", paragraphs: ["Memory is per-account and never sold. See Privacy Policy when published."] }],
    faqs: [],
    relatedLinks: [{ label: "Pricing", href: "/pricing" }],
  },
  "how-ai-predicts-probabilities": {
    slug: "how-ai-predicts-probabilities",
    title: "How AI Predicts Probabilities",
    metaDescription: "How MotiveFX analyzes prediction markets and event probabilities.",
    kicker: "AI methodology",
    lead: "We compare market-implied probabilities to model estimates and historical base rates, then explain gaps.",
    sections: [{ heading: "Calibration", paragraphs: ["Markets can be wrong; our job is to document why repricing happened."] }],
    faqs: [],
    relatedLinks: [{ label: "Prediction markets", href: "/markets/predictions" }],
  },
};

export function getAiPage(slug: string) {
  return AI_PAGES[slug];
}

export function allAiSlugs() {
  return Object.keys(AI_PAGES);
}

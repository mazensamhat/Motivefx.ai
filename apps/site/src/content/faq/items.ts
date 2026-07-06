import type { FaqItem } from "../types";

export const FAQ_ITEMS: FaqItem[] = [
  { question: "Is MotiveFX.AI financial advice?", answer: "No. MotiveFX provides informational market intelligence and research tools for educational purposes. We are not a registered investment advisor. Consult licensed professionals before investing." },
  { question: "What markets do you cover?", answer: "Stocks, crypto, pink sheets (micro-cap/OTC), sports betting analytics, and prediction markets. Choose modules by subscription tier." },
  { question: "What is Motive Signal?", answer: "A proprietary 0–100 confidence score combining volume, flow, momentum, and AI-assessed narrative factors. It prioritizes research — it is not a buy or sell recommendation." },
  { question: "What is your data source?", answer: "Regulated market feeds, SEC EDGAR, exchange data (NASDAQ, NYSE, CBOE), licensed vendors (e.g. Polygon), and event market partners. Full list at /data-sources." },
  { question: "What is options flow?", answer: "Analysis of options trades for unusual size, sweeps, and open interest changes that may indicate informed positioning." },
  { question: "How does institutional buying work?", answer: "Large entities accumulate shares over time via blocks and lit markets. MotiveFX detects patterns vs historical baselines and surfaces in stock intelligence." },
  { question: "What is a dark pool?", answer: "A private trading venue where large orders execute with limited pre-trade transparency. Aggregated prints can supplement flow analysis." },
  { question: "How does Motive Signal work?", answer: "Multi-factor model scoring each opportunity daily and intraday. Each score includes a Why It Matters summary. Details at /ai/how-motive-signal-works." },
  { question: "How accurate is AI analysis?", answer: "AI augments research speed and consistency; markets remain uncertain. Past patterns do not guarantee future results. Use MotiveFX as one input in your process." },
  { question: "What is implied volatility?", answer: "Forward-looking volatility expectation priced into options. Spikes before events; often collapses after (IV crush)." },
  { question: "What is congress trading?", answer: "Disclosed stock transactions by U.S. lawmakers under STOCK Act rules, typically published with delay." },
  { question: "What is unusual volume?", answer: "Trading volume significantly above recent averages, often worth investigating alongside price action." },
  { question: "Can I cancel anytime?", answer: "Yes. Manage billing through Stripe customer portal. Tier access continues through the paid period." },
  { question: "Do you offer a free trial?", answer: "Yes — 7-day trial on eligible plans. See pricing for details." },
];

export function faqSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getFaqBySlug(slug: string) {
  return FAQ_ITEMS.find((f) => faqSlug(f.question) === slug);
}

export function allFaqSlugs() {
  return FAQ_ITEMS.map((f) => faqSlug(f.question));
}

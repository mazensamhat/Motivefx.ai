import type { StockPageContent } from "../types";

function stock(
  ticker: string,
  name: string,
  lead: string,
  sections: StockPageContent["sections"]
): StockPageContent {
  return {
    ticker: ticker.toUpperCase(),
    name,
    metaDescription: `AI analysis for ${name} (${ticker.toUpperCase()}) — Motive Signal, institutional flow, earnings context, and research briefs on MotiveFX.`,
    lead,
    sections,
    faqs: [
      {
        question: `Is this ${ticker.toUpperCase()} analysis financial advice?`,
        answer: "No. Informational research only. Not a recommendation to buy or sell.",
      },
      {
        question: "How often is this page updated?",
        answer: "MotiveFX refreshes intelligence intraday during market hours and publishes daily briefs.",
      },
    ],
    relatedTickers: ["AAPL", "MSFT", "GOOGL", "AMD", "TSLA"].filter((t) => t !== ticker.toUpperCase()).slice(0, 4),
    relatedTopics: [
      { label: "AI Stock Analysis", href: "/topics/ai-stock-analysis" },
      { label: "Institutional Buying", href: "/topics/institutional-buying" },
      { label: "Options Flow", href: "/markets/options" },
      { label: "Semiconductor sector", href: "/topics/market-intelligence" },
    ],
  };
}

export const STOCKS: Record<string, StockPageContent> = {
  nvda: stock("NVDA", "NVIDIA Corporation", "NVIDIA remains a bellwether for AI infrastructure trade. MotiveFX tracks flow, earnings implied moves, and narrative momentum on NVDA daily.", [
    { heading: "Why NVDA matters", paragraphs: ["As AI capex proxy, NVDA price action often leads semiconductor and cloud baskets. Institutional size and options activity are consistently elevated."] },
    { heading: "What MotiveFX monitors on NVDA", paragraphs: ["Unusual volume, block prints, earnings IV, Motive Signal score, and cross-links to AMD/AVGO peers."] },
  ]),
  aapl: stock("AAPL", "Apple Inc.", "Apple combines mega-cap stability with product-cycle catalysts. MotiveFX surfaces services growth narrative and buyback context alongside flow.", [
    { heading: "Catalyst calendar", paragraphs: ["Product launches, earnings, and capital return announcements drive AAPL volatility clusters."] },
  ]),
  tsla: stock("TSLA", "Tesla Inc.", "Tesla trades as auto + energy + AI optionality. MotiveFX flags narrative spikes and high-beta flow patterns.", []),
  amzn: stock("AMZN", "Amazon.com Inc.", "Amazon spans e-commerce, AWS, and advertising. MotiveFX connects cloud capex narrative to peer multiples.", []),
  msft: stock("MSFT", "Microsoft Corporation", "Microsoft anchors enterprise AI spend alongside Azure growth. MotiveFX tracks institutional accumulation trends.", []),
  googl: stock("GOOGL", "Alphabet Inc.", "Alphabet combines search cash flows with AI investment cycle. MotiveFX monitors ad trend signals and capex guidance.", []),
  amd: stock("AMD", "Advanced Micro Devices", "AMD trades in NVDA's shadow with datacenter GPU share narrative. MotiveFX pairs peer correlation analysis.", []),
  btc: stock("BTC", "Bitcoin", "Bitcoin macro sensitivity and ETF flow drive crypto leadership. MotiveFX crypto module covers 24/7.", []),
};

export function getStock(ticker: string) {
  return STOCKS[ticker.toLowerCase()];
}

export function allStockTickers() {
  return Object.keys(STOCKS);
}

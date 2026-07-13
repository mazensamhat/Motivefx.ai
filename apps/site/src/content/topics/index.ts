import type { EntityPageContent } from "../types";

function topic(
  slug: string,
  title: string,
  metaDescription: string,
  lead: string,
  sections: EntityPageContent["sections"],
  relatedLinks: EntityPageContent["relatedLinks"]
): EntityPageContent {
  return {
    slug,
    title,
    metaDescription,
    kicker: "Topic",
    lead,
    sections,
    faqs: [
      {
        question: `How does MotiveFX help with ${title.toLowerCase()}?`,
        answer:
          "MotiveFX combines live data, AI summarization, and Motive Signal scoring so you prioritize research faster. See our methodology on Why MotiveFX.",
      },
    ],
    relatedLinks,
  };
}

export const TOPICS: Record<string, EntityPageContent> = {
  "ai-stock-analysis": topic(
    "ai-stock-analysis",
    "AI Stock Analysis",
    "How MotiveFX uses AI to analyze stocks — signals, earnings, flow, and Motive Signal methodology.",
    "AI stock analysis at MotiveFX is not a black box chatbot. It is a structured pipeline: ingest market data, detect anomalies, score confidence, and explain results in plain English.",
    [
      {
        heading: "How AI analyzes stocks on MotiveFX",
        paragraphs: [
          "Our models process price, volume, fundamentals, and text sources (filings, news, transcripts). Outputs include Motive Signal scores, research briefs, and conversational follow-up via Ask Motive AI.",
          "AI Memory (Pro+) learns which sectors and risk profiles you care about so briefings stay relevant.",
        ],
      },
      {
        heading: "Why structure beats raw chat",
        paragraphs: [
          "Generic LLM queries lack live data and consistent methodology. MotiveFX grounds every answer in timestamped feeds and documents sources — better for you and for AI search citation (GEO).",
        ],
      },
    ],
    [
      { label: "Stocks module", href: "/markets/stocks" },
      { label: "How AI analyzes stocks", href: "/ai/how-ai-analyzes-stocks" },
      { label: "NVDA analysis", href: "/stocks/nvda" },
    ]
  ),
  "ai-crypto-analysis": topic(
    "ai-crypto-analysis",
    "AI Crypto Analysis",
    "AI-powered crypto intelligence — on-chain flow, funding, narrative, and Motive Signal for digital assets.",
    "Crypto moves on narrative and flow as much as fundamentals. MotiveFX AI crypto analysis weights both, 24/7.",
    [
      {
        heading: "On-chain + market data fusion",
        paragraphs: [
          "We combine exchange candles, derivatives metrics, and aggregated whale activity into daily briefs and intraday radar hits.",
        ],
      },
    ],
    [
      { label: "Crypto module", href: "/markets/crypto" },
      { label: "How AI analyzes crypto", href: "/ai/how-ai-analyzes-crypto" },
    ]
  ),
  "ai-options-flow": topic(
    "ai-options-flow",
    "AI Options Flow",
    "Understand unusual options activity with AI explanations and cross-asset context on MotiveFX.",
    "Options flow without context is noise. MotiveFX AI labels sweeps, blocks, and OI changes — then links to the underlying stock thesis.",
    [{ heading: "Flow + equity confluence", paragraphs: ["When options and stock institutional buying align, Motive Signal scores reflect multi-factor confirmation."] }],
    [{ label: "Options module", href: "/markets/options" }, { label: "What is unusual volume?", href: "/glossary/unusual-volume" }]
  ),
  "congress-trading-tracker": topic(
    "congress-trading-tracker",
    "Congress Trading Tracker",
    "Track disclosed congressional stock trades and see AI context on MotiveFX.",
    "STOCK Act disclosures create a public record of politician trades. MotiveFX surfaces new filings and connects them to tickers you follow.",
    [{ heading: "Disclosure latency", paragraphs: ["Filings can lag trades by weeks. Use as one input among many — not a timing signal alone."] }],
    [{ label: "Institutional buying", href: "/topics/institutional-buying" }, { label: "Data sources", href: "/data-sources" }]
  ),
  "institutional-buying": topic(
    "institutional-buying",
    "Institutional Buying",
    "Detect institutional accumulation and distribution with MotiveFX market intelligence.",
    "Funds move size. MotiveFX highlights block trades, 13F trend shifts, and accumulation patterns vs historical baselines.",
    [{ heading: "Smart money vs retail", paragraphs: ["Institutional buying often precedes sustained trends; pairing with options flow improves conviction."] }],
    [{ label: "Stocks module", href: "/markets/stocks" }, { label: "Learn: institutional buying", href: "/learn/institutional-buying" }]
  ),
  "market-intelligence": topic(
    "market-intelligence",
    "Market Intelligence",
    "Cross-asset market intelligence platform — stocks, crypto, sports, predictions, and pink sheets.",
    "Market intelligence is the discipline of turning raw feeds into decisions. MotiveFX is your AI chief of staff across five modules.",
    [{ heading: "One terminal, five markets", paragraphs: ["Subscribe to the markets you monitor. Upgrade when you need more coverage or portfolio features."] }],
    [{ label: "All market modules", href: "/markets/stocks" }, { label: "Why MotiveFX", href: "/why-motivefx" }]
  ),
  "sports-betting-analytics": topic(
    "sports-betting-analytics",
    "Sports Betting Analytics",
    "Line movement, sharp action, and model context for sports bettors on MotiveFX.",
    "Analytics ≠ picks. MotiveFX shows why lines moved and where models disagree with the market.",
    [{ heading: "Responsible use", paragraphs: ["Informational only. Never bet more than you can afford to lose."] }],
    [{ label: "Sports module", href: "/markets/sports" }]
  ),
  "prediction-market-analysis": topic(
    "prediction-market-analysis",
    "Prediction Market Analysis",
    "AI analysis for prediction markets and event contracts on MotiveFX.",
    "Prediction markets price probability. MotiveFX explains repricing and links events to tradable assets.",
    [{ heading: "Forecast vs trade", paragraphs: ["Some users hedge portfolios with prediction markets; others trade probability directly."] }],
    [{ label: "Predictions module", href: "/markets/predictions" }]
  ),
  "pink-sheet-stocks": topic(
    "pink-sheet-stocks",
    "Pink Sheet Stocks",
    "Micro-cap and OTC intelligence with explicit risk labeling on MotiveFX.",
    "Pink sheets offer asymmetric upside and downside. MotiveFX focuses on volume breakouts and risk flags.",
    [{ heading: "Speculation only", paragraphs: ["Not suitable for retirement accounts or low risk tolerance."] }],
    [{ label: "Pink sheets module", href: "/markets/pink-sheets" }]
  ),
  "motive-signal": topic(
    "motive-signal",
    "Motive Signal",
    "Proprietary 0–100 confidence scoring across MotiveFX intelligence modules.",
    "Motive Signal ranks opportunities so you research the highest-confluence names first. It is not a buy/sell rating.",
    [
      {
        heading: "What goes into Motive Signal",
        paragraphs: [
          "Volume anomalies, relative strength, flow confirmation, narrative momentum, and module-specific factors. Each score ships with Why It Matters text.",
        ],
      },
      { heading: "How to use it", paragraphs: ["Start at 80+ for deep dives; use lower scores for watchlist building."] },
    ],
    [{ label: "How Motive Signal works", href: "/ai/how-motive-signal-works" }, { label: "Stocks module", href: "/markets/stocks" }]
  ),
  "ai-portfolio-analysis": topic(
    "ai-portfolio-analysis",
    "AI Portfolio Analysis",
    "Portfolio-aware intelligence on MotiveFX — holdings impact, alerts, and diversification context (Pro+).",
    "Generic market feeds ignore your book. Portfolio Intelligence weights signals by what you actually hold.",
    [{ heading: "Pro tier and above", paragraphs: ["Connect holdings to see impact-weighted alerts and Since You Were Away summaries."] }],
    [{ label: "Pricing", href: "/pricing" }, { label: "Portfolio tools", href: "/tools/portfolio-diversification" }]
  ),
};

export function getTopic(slug: string) {
  return TOPICS[slug];
}

export function allTopicSlugs() {
  return Object.keys(TOPICS);
}

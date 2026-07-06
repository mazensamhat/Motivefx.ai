import type { EntityPageContent } from "../types";

const stocksRelated = [
  { label: "AI Stock Analysis", href: "/topics/ai-stock-analysis" },
  { label: "Institutional Buying", href: "/topics/institutional-buying" },
  { label: "Options Flow", href: "/markets/options" },
  { label: "Motive Signal", href: "/topics/motive-signal" },
  { label: "NVDA analysis", href: "/stocks/nvda" },
  { label: "Learn: AI Investing", href: "/learn/ai-investing" },
];

export const MODULES: Record<string, EntityPageContent> = {
  stocks: {
    slug: "stocks",
    title: "AI Stock Analysis & Market Intelligence",
    metaDescription:
      "MotiveFX AI stock analysis covers equities, earnings, institutional flow, and Motive Signal scores. Real-time intelligence for active traders and investors.",
    kicker: "Stocks intelligence",
    lead: "MotiveFX analyzes thousands of equity signals daily — price action, volume anomalies, institutional footprints, earnings context, and narrative shifts — so you focus only on what matters to your portfolio.",
    sections: [
      {
        heading: "What MotiveFX stock intelligence includes",
        paragraphs: [
          "Our stocks module is built for operators who need speed and context, not another generic screener. Every session surfaces a ranked set of opportunities with Motive Signal confidence scores, plain-English explanations, and links to deeper research briefs.",
          "Coverage spans large-cap leaders, mid-cap growth names, and high-beta movers. We combine market data, SEC filings, earnings transcripts, and flow-derived signals into one terminal experience.",
        ],
      },
      {
        heading: "Motive Signal for equities",
        paragraphs: [
          "Motive Signal is our proprietary 0–100 confidence score. It weights unusual volume, relative strength, institutional accumulation patterns, options activity, and AI-assessed narrative momentum.",
          "Scores above 80 typically indicate multi-factor alignment — not a buy recommendation, but a prioritization signal for further research. Every score ships with a Why It Matters summary you can read in under 90 seconds.",
        ],
      },
      {
        heading: "Institutional buying & smart money flow",
        paragraphs: [
          "Track when funds, insiders, and block traders move size. MotiveFX highlights accumulation and distribution patterns against historical baselines so you see whether today's move is isolated or part of a trend.",
          "Pair institutional context with our congress trading tracker topic page and options flow module for a fuller picture of who is positioned and how.",
        ],
      },
      {
        heading: "Earnings & event intelligence",
        paragraphs: [
          "Before and after earnings, MotiveFX surfaces implied move context, historical post-earnings behavior, and AI-generated briefing notes. Since You Were Away catches overnight gaps and pre-market catalysts so you never open the terminal cold.",
          "Use the earnings analysis learning center for methodology, and individual ticker pages like NVDA or AAPL for company-specific context.",
        ],
      },
      {
        heading: "Portfolio-aware alerts (Pro+)",
        paragraphs: [
          "On Pro and above, Portfolio Intelligence connects holdings to the signal engine. NVDA in your book? You'll see impact-weighted alerts, not generic market noise.",
          "Ultra tier adds voice briefings and Decision History so you can audit what you acted on and why.",
        ],
      },
      {
        heading: "Who this module is for",
        paragraphs: [
          "Day traders scanning for momentum and flow. Swing traders who want narrative + technical confluence. Investors building conviction before sizing up. If you trade equities, this module is your daily starting point.",
        ],
      },
    ],
    useCases: [
      "Morning briefing before the open",
      "Earnings week preparation",
      "Watchlist radar for unusual volume",
      "Portfolio impact on holdings",
      "Deep research via Ask Motive AI",
    ],
    faqs: [
      {
        question: "Is MotiveFX stock analysis financial advice?",
        answer:
          "No. MotiveFX provides informational intelligence and research tools. All content is for educational purposes. Consult a licensed advisor before making investment decisions.",
      },
      {
        question: "What data sources power stock intelligence?",
        answer:
          "We aggregate regulated market data, SEC EDGAR filings, exchange feeds (NASDAQ, NYSE), and licensed vendor streams. See our Data Sources page for the full list.",
      },
      {
        question: "Can I use MotiveFX with only the stocks module?",
        answer:
          "Yes. Lite tier lets you pick exactly one intelligence market — many subscribers start with stocks only.",
      },
      {
        question: "How often is stock intelligence updated?",
        answer:
          "Intraday during market hours for signals and flow; daily AI briefs publish before the US session; research briefs archive continuously.",
      },
    ],
    relatedLinks: stocksRelated,
  },

  crypto: {
    slug: "crypto",
    title: "AI Crypto Analysis & On-Chain Intelligence",
    metaDescription:
      "AI crypto analysis for Bitcoin, Ethereum, and altcoins — whale flow, funding rates, narrative shifts, and Motive Signal scores on MotiveFX.",
    kicker: "Crypto intelligence",
    lead: "Crypto never sleeps. MotiveFX tracks on-chain momentum, exchange flow, funding dynamics, and narrative heat across majors and high-conviction altcoins — distilled into actionable daily intelligence.",
    sections: [
      {
        heading: "24/7 market coverage",
        paragraphs: [
          "Unlike equities, crypto markets trade around the clock. MotiveFX monitors whale wallets, exchange inflows/outflows,  and funding rate extremes so you catch regime shifts whether you're at the desk or not.",
          "Push notifications (Pro+) surface only high-confidence hits on your watchlist — not every tick.",
        ],
      },
      {
        heading: "AI crypto research briefs",
        paragraphs: [
          "Every major move gets context: historical analogs, sector rotation (L1 vs DeFi vs memes), and correlation to macro. Ask Motive AI follow-ups in natural language with memory that learns your risk tolerance.",
        ],
      },
      {
        heading: "Motive Signal for digital assets",
        paragraphs: [
          "Crypto Motive Signal blends price structure, volume profile, derivatives positioning, and social/narrative velocity. Scores help you rank dozens of watchlist names in seconds.",
        ],
      },
      {
        heading: "Integration with multi-market view",
        paragraphs: [
          "Ultra subscribers see crypto alongside stocks, predictions, and sports in one terminal — useful when macro events move every asset class at once.",
        ],
      },
    ],
    faqs: [
      {
        question: "Which cryptocurrencies does MotiveFX cover?",
        answer: "Majors (BTC, ETH, SOL) plus a rotating set of high-activity altcoins based on volume and subscriber watchlists.",
      },
      {
        question: "Do you provide wallet-level tracking?",
        answer: "We surface aggregated whale and exchange flow signals, not personal wallet tracking.",
      },
    ],
    relatedLinks: [
      { label: "AI Crypto Analysis", href: "/topics/ai-crypto-analysis" },
      { label: "Crypto Guides", href: "/learn/crypto-guides" },
      { label: "Bitcoin analysis", href: "/stocks/btc" },
      { label: "Market Intelligence", href: "/topics/market-intelligence" },
    ],
  },

  options: {
    slug: "options",
    title: "AI Options Flow & Unusual Activity Intelligence",
    metaDescription:
      "Track unusual options activity, open interest shifts, gamma exposure, and smart money flow with MotiveFX AI options intelligence.",
    kicker: "Options flow",
    lead: "Options tell you where size is betting. MotiveFX flags unusual volume, sweep activity, and open interest changes — then explains why it might matter for the underlying.",
    sections: [
      {
        heading: "Unusual options activity detection",
        paragraphs: [
          "We benchmark every contract against 30-day volume and open interest baselines. When activity exceeds statistical thresholds, it enters your radar with direction, size, and expiry context.",
        ],
      },
      {
        heading: "Gamma, IV, and event context",
        paragraphs: [
          "Understand dealer positioning and implied volatility ahead of earnings and macro prints. Our glossary covers gamma, IV crush, and open interest in depth.",
        ],
      },
      {
        heading: "Pair with stock intelligence",
        paragraphs: [
          "Options flow on NVDA means more when paired with institutional stock buying and Motive Signal. Internal links connect every layer of the knowledge graph.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is unusual options activity?",
        answer:
          "Volume or open interest that significantly exceeds recent norms, often indicating institutional or informed positioning.",
      },
    ],
    relatedLinks: [
      { label: "AI Options Flow", href: "/topics/ai-options-flow" },
      { label: "What is Open Interest?", href: "/metrics/open-interest" },
      { label: "What is Gamma?", href: "/metrics/gamma" },
      { label: "Options Flow guides", href: "/learn/options-flow" },
    ],
  },

  predictions: {
    slug: "predictions",
    title: "Prediction Market Analysis & Probability Intelligence",
    metaDescription:
      "AI analysis for Polymarket and prediction markets — probability shifts, event catalysts, and MotiveFX intelligence for forecast traders.",
    kicker: "Prediction markets",
    lead: "When probabilities move, something changed. MotiveFX tracks prediction markets — elections, macro, crypto events — and explains repricing in plain English.",
    sections: [
      {
        heading: "Probability shift detection",
        paragraphs: [
          "We alert when contracts reprice beyond historical volatility bands, with catalyst tagging and cross-market consistency checks.",
        ],
      },
      {
        heading: "Event-linked research",
        paragraphs: [
          "Every major contract gets a research brief: resolution criteria, liquidity depth, historical accuracy of similar markets, and related equities/crypto exposure.",
        ],
      },
    ],
    faqs: [
      {
        question: "Which prediction markets do you cover?",
        answer: "Primary coverage includes Polymarket and major regulated event markets; expansion is continuous.",
      },
    ],
    relatedLinks: [
      { label: "Prediction Market Analysis", href: "/topics/prediction-market-analysis" },
      { label: "Learn: Prediction Markets", href: "/learn/prediction-markets" },
      { label: "Polymarket data sources", href: "/data-sources" },
    ],
  },

  sports: {
    slug: "sports",
    title: "Sports Betting Analytics & Line Intelligence",
    metaDescription:
      "AI sports betting analytics — line movement, sharp action, model edges, and MotiveFX intelligence for serious bettors.",
    kicker: "Sports betting",
    lead: "Lines move for a reason. MotiveFX tracks sharp vs public money, injury-driven repricing, and model divergence so you bet with context, not gut feel.",
    sections: [
      {
        heading: "Line movement intelligence",
        paragraphs: [
          "See when books move numbers against public ticket count — a classic sharp signal. MotiveFX timestamps moves and tags likely catalysts.",
        ],
      },
      {
        heading: "Multi-sport coverage",
        paragraphs: [
          "NFL, NBA, MLB, NHL, soccer, and major combat cards during season. Daily sports intelligence pages publish fresh summaries.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is this a picks service?",
        answer: "No. We provide analytics and context, not guaranteed picks. Gamble responsibly.",
      },
    ],
    relatedLinks: [
      { label: "Sports Betting Analytics", href: "/topics/sports-betting-analytics" },
      { label: "Learn: Sports Betting", href: "/learn/sports-betting-analytics" },
      { label: "Today's Sports Intelligence", href: "/daily/sports-intelligence" },
    ],
  },

  "pink-sheets": {
    slug: "pink-sheets",
    title: "Pink Sheet & Micro-Cap Stock Intelligence",
    metaDescription:
      "Pink sheet and micro-cap radar — breakout detection, volume anomalies, and AI analysis for high-risk OTC names on MotiveFX.",
    kicker: "Pink sheets",
    lead: "Micro-caps move fast and fail often. MotiveFX Pink Slips module focuses on volume breakouts, dilution risk flags, and narrative spikes — with explicit risk labeling.",
    sections: [
      {
        heading: "Breakout radar",
        paragraphs: [
          "Scan for first-day volume explosions and multi-day accumulation patterns on OTC and low-float names. Every hit includes float context and recent filing flags when available.",
        ],
      },
      {
        heading: "Risk-first design",
        paragraphs: [
          "Pink sheet trading is high risk. We surface dilution, reverse split history, and promotion patterns where data exists — so hype is never the only story.",
        ],
      },
    ],
    faqs: [
      {
        question: "Are pink sheet stocks suitable for everyone?",
        answer: "No. These are speculative instruments. Only risk capital; many names lack liquidity.",
      },
    ],
    relatedLinks: [
      { label: "Pink Sheet Stocks topic", href: "/topics/pink-sheet-stocks" },
      { label: "What is Relative Volume?", href: "/metrics/relative-volume" },
      { label: "Stocks module", href: "/markets/stocks" },
    ],
  },
};

export function getModule(slug: string): EntityPageContent | undefined {
  return MODULES[slug];
}

export function allModuleSlugs(): string[] {
  return Object.keys(MODULES);
}

import { DEFAULT_CONTACT_EMAIL } from "@/lib/email-config";

export const SITE = {
  name: "MotiveFX.AI",
  tagline: "AI Market Intelligence Platform",
  url: process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://motivefxai.com",
  description:
    "Your AI Chief of Staff for market intelligence — stocks, crypto, sports betting, prediction markets, and pink sheets.",
  email: DEFAULT_CONTACT_EMAIL,
} as const;

export const MARKET_ROUTES = [
  { slug: "stocks", label: "Stocks", href: "/stocks" },
  { slug: "crypto", label: "Crypto", href: "/crypto" },
  { slug: "options", label: "Options Flow", href: "/options" },
  { slug: "predictions", label: "Prediction Markets", href: "/predictions" },
  { slug: "sports", label: "Sports Betting", href: "/sports" },
  { slug: "pink-sheets", label: "Pink Sheets", href: "/pink-sheets" },
] as const;

export const TOPIC_ROUTES = [
  { slug: "ai-stock-analysis", label: "AI Stock Analysis", href: "/topics/ai-stock-analysis" },
  { slug: "ai-crypto-analysis", label: "AI Crypto Analysis", href: "/topics/ai-crypto-analysis" },
  { slug: "ai-options-flow", label: "AI Options Flow", href: "/topics/ai-options-flow" },
  { slug: "congress-trading-tracker", label: "Congress Trading Tracker", href: "/topics/congress-trading-tracker" },
  { slug: "institutional-buying", label: "Institutional Buying", href: "/topics/institutional-buying" },
  { slug: "market-intelligence", label: "Market Intelligence", href: "/topics/market-intelligence" },
  { slug: "sports-betting-analytics", label: "Sports Betting Analytics", href: "/topics/sports-betting-analytics" },
  { slug: "prediction-market-analysis", label: "Prediction Market Analysis", href: "/topics/prediction-market-analysis" },
  { slug: "pink-sheet-stocks", label: "Pink Sheet Stocks", href: "/topics/pink-sheet-stocks" },
  { slug: "motive-signal", label: "Motive Signal", href: "/motive-signal" },
  { slug: "ai-portfolio-analysis", label: "AI Portfolio Analysis", href: "/topics/ai-portfolio-analysis" },
] as const;

/** Learning Center tracks — aligned to MotiveFX product modules + core skills. */
export const LEARN_CATEGORIES = [
  { slug: "stocks", label: "Stocks", href: "/learn/stocks" },
  { slug: "crypto-guides", label: "Crypto", href: "/learn/crypto-guides" },
  { slug: "options-flow", label: "Options Flow", href: "/learn/options-flow" },
  { slug: "prediction-markets", label: "Prediction Markets", href: "/learn/prediction-markets" },
  { slug: "sports-betting-analytics", label: "Sports Betting", href: "/learn/sports-betting-analytics" },
  { slug: "pink-sheets", label: "Pink Slips", href: "/learn/pink-sheets" },
  { slug: "ai-investing", label: "AI Investing", href: "/learn/ai-investing" },
  { slug: "institutional-buying", label: "Institutional Buying", href: "/learn/institutional-buying" },
  { slug: "earnings-analysis", label: "Earnings Analysis", href: "/learn/earnings-analysis" },
  { slug: "technical-analysis", label: "Technical Analysis", href: "/learn/technical-analysis" },
  { slug: "market-psychology", label: "Market Psychology", href: "/learn/market-psychology" },
] as const;

export const COMPARE_SLUGS = [
  "tradingview",
  "yahoo-finance",
  "seeking-alpha",
  "benzinga",
  "marketwatch",
  "finviz",
  "bloomberg",
] as const;

/** Live / configured providers — keep in sync with README + `/api/health` feed keys. */
export type DataSourceStatus = "live" | "demo" | "infra";

export type DataSourceEntry = {
  name: string;
  status: DataSourceStatus;
  detail: string;
};

export const DATA_SOURCES: DataSourceEntry[] = [
  {
    name: "Finnhub",
    status: "live",
    detail: "Equity quotes, insider / Form 4–style filings when FINNHUB_API_KEY is set.",
  },
  {
    name: "CoinStats / CoinGecko",
    status: "live",
    detail: "Crypto market data and whale-style volume proxies (CoinStats key optional; CoinGecko fallback).",
  },
  {
    name: "The Odds API",
    status: "live",
    detail:
      "Sports odds / line board when THE_ODDS_API_KEY is set. Server-cached ~10 min; max 3 sports per refresh. See docs/ODDS_DATA_SOURCES.md.",
  },
  {
    name: "Polymarket Gamma API",
    status: "live",
    detail: "Public prediction-market events and prices (no API key). Never uses The Odds API.",
  },
  {
    name: "OpenAI",
    status: "live",
    detail: "LLM layer for Why It Matters briefs and Ask Motive AI when OPENAI_API_KEY is set.",
  },
  {
    name: "Stripe",
    status: "infra",
    detail: "Subscription checkout and billing (not a market feed).",
  },
  {
    name: "Unusual options flow",
    status: "demo",
    detail: "Simulated options-block samples until a dedicated options-flow vendor is wired.",
  },
  {
    name: "Congress / politician trades",
    status: "demo",
    detail: "Illustrative sample filings — not a live congressional disclosure feed.",
  },
  {
    name: "Sharp-money / public-vs-money splits",
    status: "demo",
    detail: "Unavailable — no live public/sharp ticket-split vendor; Bets UI shows an empty state instead of sample NFL/NBA slips.",
  },
  {
    name: "Pink-sheet / microcap movers",
    status: "demo",
    detail: "Scanner uses curated demo movers pending a dedicated OTC tape provider.",
  },
];

/** @deprecated Prefer DATA_SOURCES entries; kept for any string-only consumers. */
export const DATA_SOURCE_NAMES = DATA_SOURCES.map((s) => s.name);

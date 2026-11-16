import { DEFAULT_CONTACT_EMAIL } from "@/lib/email-config";

export const SITE = {
  name: "MotiveFX.AI",
  tagline: "Predictive Market Intelligence",
  url: process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.motivefxai.com",
  description:
    "MotiveFX is the predictive market intelligence platform that connects signals across markets — Motive Signal™, Opportunity Radar™, and Relationship Graph™ — so you see what's next before it becomes a headline.",
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

/** Static integration catalog. These labels do not assert current provider health. */
export type DataSourceStatus = "integrated" | "derived" | "demo" | "infra";

export type DataSourceEntry = {
  name: string;
  status: DataSourceStatus;
  detail: string;
};

export const DATA_SOURCES: DataSourceEntry[] = [
  {
    name: "Finnhub",
    status: "integrated",
    detail: "Equity quotes and insider filings where provider access and coverage are available. Historical price validation has separate data requirements.",
  },
  {
    name: "CoinStats / CoinGecko",
    status: "integrated",
    detail: "Crypto quotes and market activity. Volume-based activity indicators are proxies, not verified wallet transfers or proof of whale ownership.",
  },
  {
    name: "SharpAPI",
    status: "integrated",
    detail:
      "Sports odds and line comparisons where event coverage is available. Published odds can be delayed; use the source timestamp when assessing freshness.",
  },
  {
    name: "The Odds API",
    status: "integrated",
    detail:
      "Alternative sports odds coverage. Available events and refresh timing depend on provider access; cached observations retain their source timestamps.",
  },
  {
    name: "Polymarket Gamma API",
    status: "integrated",
    detail:
      "Public prediction-market events, prices and volume. Market-implied prices are distinct from MotiveFX scores and calibrated forecast probabilities.",
  },
  {
    name: "OpenAI",
    status: "integrated",
    detail: "AI summaries and Ask Motive explanations grounded in available evidence. AI output is not an independent market-data source or a guarantee of accuracy.",
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
    name: "Bookmaker consensus",
    status: "derived",
    detail:
      "A comparison derived from available bookmaker moneylines. It does not measure actual ticket counts, betting handle, or public-versus-money splits.",
  },
  {
    name: "Bitquery Polymarket sports",
    status: "integrated",
    detail:
      "Optional sports-event enrichment where provider access and sport coverage are enabled. Polymarket Gamma remains the primary prediction-market source.",
  },
  {
    name: "Pink-sheet / microcap movers",
    status: "demo",
    detail: "Scanner uses curated demo movers pending a dedicated OTC tape provider.",
  },
];

/** @deprecated Prefer DATA_SOURCES entries; kept for any string-only consumers. */
export const DATA_SOURCE_NAMES = DATA_SOURCES.map((s) => s.name);

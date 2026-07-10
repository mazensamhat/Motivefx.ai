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
  { slug: "motive-signal", label: "Motive Signal", href: "/topics/motive-signal" },
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

export const DATA_SOURCES = [
  "SEC EDGAR",
  "FINRA",
  "Polygon.io",
  "NASDAQ",
  "NYSE",
  "CBOE",
  "Coinbase",
  "Tradier",
  "Polymarket",
  "Government disclosures",
] as const;

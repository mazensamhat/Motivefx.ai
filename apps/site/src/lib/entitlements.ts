import type { IntelligenceMarketId, PricingTierId } from "./tiers";
import { INTELLIGENCE_MARKETS, tierById } from "./tiers";

export const APP_MARKET_SLUGS = [
  "stocks",
  "crypto",
  "pink-slips",
  "sports",
  "predictions",
  "options",
] as const;

export type AppMarketSlug = (typeof APP_MARKET_SLUGS)[number];

export const APP_MARKETS: {
  slug: AppMarketSlug;
  marketId: IntelligenceMarketId | "options";
  label: string;
  description: string;
}[] = [
  {
    slug: "stocks",
    marketId: "stocks",
    label: "Stocks",
    description: "Unusual options, congress trades, institutional flow",
  },
  {
    slug: "crypto",
    marketId: "crypto",
    label: "Crypto",
    description: "Whale alerts, exchange flows, prediction odds",
  },
  {
    slug: "pink-slips",
    marketId: "pink_slips",
    label: "Pink Slips",
    description: "Sub-$5 momentum and volume scanners",
  },
  {
    slug: "sports",
    marketId: "sports_betting",
    label: "Sports",
    description: "Line movement, sharp money, model edges",
  },
  {
    slug: "predictions",
    marketId: "prediction_markets",
    label: "Predictions",
    description: "Polymarket and event-market intelligence",
  },
  {
    slug: "options",
    marketId: "options",
    label: "Options Flow",
    description: "Gamma, OI clusters, and sweep detection",
  },
];

export function marketBySlug(slug: string) {
  return APP_MARKETS.find((m) => m.slug === slug);
}

export function parseUserMarkets(raw: string | null): IntelligenceMarketId[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(INTELLIGENCE_MARKETS.map((m) => m.id));
    return parsed.filter((m): m is IntelligenceMarketId => typeof m === "string" && valid.has(m as IntelligenceMarketId));
  } catch {
    return [];
  }
}

export function userHasLiveMarketAccess(
  tier: string,
  selectedMarkets: IntelligenceMarketId[],
  marketId: IntelligenceMarketId | "options",
  hasSubscription: boolean
): boolean {
  if (!hasSubscription) return false;
  if (marketId === "options") {
    return tierById(tier as PricingTierId).intelligenceMarketsIncluded === "all" || selectedMarkets.includes("stocks");
  }
  const tierConfig = tierById(tier as PricingTierId);
  if (tierConfig.intelligenceMarketsIncluded === "all") return true;
  return selectedMarkets.includes(marketId);
}

export function previewSignals(slug: AppMarketSlug) {
  const samples: Record<AppMarketSlug, { symbol: string; signal: number; note: string }[]> = {
    stocks: [
      { symbol: "NVDA", signal: 92, note: "Unusual call volume · earnings week" },
      { symbol: "AAPL", signal: 68, note: "Institutional accumulation" },
      { symbol: "MSFT", signal: 74, note: "Congress disclosure cluster" },
    ],
    crypto: [
      { symbol: "BTC", signal: 81, note: "Exchange outflows · 7d high" },
      { symbol: "ETH", signal: 76, note: "Whale wallet accumulation" },
      { symbol: "SOL", signal: 69, note: "Social momentum spike" },
    ],
    "pink-slips": [
      { symbol: "SNDL", signal: 71, note: "Volume 4.2× vs 5-day avg" },
      { symbol: "MULN", signal: 63, note: "Retail flow surge" },
    ],
    sports: [
      { symbol: "LAL/BOS", signal: 68, note: "Sharp line move · total" },
      { symbol: "KC/Chiefs", signal: 72, note: "Model edge vs market" },
    ],
    predictions: [
      { symbol: "Fed cut Q3", signal: 77, note: "Polymarket odds shift" },
      { symbol: "BTC $150k", signal: 64, note: "Volume spike on Yes" },
    ],
    options: [
      { symbol: "SPY", signal: 85, note: "Gamma flip zone approaching" },
      { symbol: "QQQ", signal: 79, note: "Large call sweep detected" },
    ],
  };
  return samples[slug] ?? [];
}

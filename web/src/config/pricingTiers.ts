/**
 * Intelligence market plans — capabilities unlock by tier, not module count alone.
 * Individual market price anchor: $29.99/mo (Lite = 1 market).
 */

export type PricingTierId = "lite" | "pro" | "ultra" | "ultra_plus" | "elite";

export type IntelligenceMarketId = "stocks" | "crypto" | "pink_slips" | "sports_betting" | "prediction_markets";

export interface PricingTier {
  id: PricingTierId;
  name: string;
  tagline: string;
  monthlyUsd: number | null;
  annualUsd: number | null;
  featured?: boolean;
  /** How many intelligence markets the subscriber selects (5 = all). */
  intelligenceMarketsIncluded: number | "all";
  /** Target share of paid subscribers */
  targetMixPct?: string;
}

export const MARKET_PRICE_USD = 29.99;

/** All intelligence markets a subscriber may choose from (Lite picks exactly one). */
export const INTELLIGENCE_MARKETS: { id: IntelligenceMarketId; label: string }[] = [
  { id: "stocks", label: "Stocks" },
  { id: "crypto", label: "Crypto" },
  { id: "pink_slips", label: "Pink Slips" },
  { id: "sports_betting", label: "Sports betting" },
  { id: "prediction_markets", label: "Prediction markets" },
];

/** Lite: subscriber picks exactly one market — not stocks by default, not two. */
export const LITE_MARKET_PICK_COUNT = 1 as const;
export const PRO_MARKET_PICK_COUNT = 2 as const;

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "lite",
    name: "Lite",
    tagline: "Pick exactly one intelligence market",
    monthlyUsd: 29.99,
    annualUsd: null,
    intelligenceMarketsIncluded: 1,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Two markets + portfolio intelligence",
    monthlyUsd: 59.99,
    annualUsd: null,
    featured: true,
    intelligenceMarketsIncluded: 2,
    targetMixPct: "60–70%",
  },
  {
    id: "ultra",
    name: "Ultra",
    tagline: "All 5 markets · voice & analytics",
    monthlyUsd: 99.99,
    annualUsd: null,
    intelligenceMarketsIncluded: "all",
  },
  {
    id: "ultra_plus",
    name: "Ultra+",
    tagline: "For professionals & teams",
    monthlyUsd: 149.99,
    annualUsd: null,
    intelligenceMarketsIncluded: "all",
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "VIP access · influence the roadmap",
    monthlyUsd: null,
    annualUsd: 999,
    intelligenceMarketsIncluded: "all",
  },
];

/** Feature matrix cell: true | false | string label */
export type FeatureCell = boolean | string;

export interface PricingFeatureRow {
  feature: string;
  lite: FeatureCell;
  pro: FeatureCell;
  ultra: FeatureCell;
  ultraPlus: FeatureCell;
  elite: FeatureCell;
}

export const PRICING_FEATURE_MATRIX: PricingFeatureRow[] = [
  {
    feature: "Intelligence markets included",
    lite: "Pick exactly 1",
    pro: "Pick exactly 2",
    ultra: "All 5",
    ultraPlus: "All 5",
    elite: "All 5",
  },
  { feature: "Stocks", lite: "Available", pro: "Available", ultra: true, ultraPlus: true, elite: true },
  { feature: "Crypto", lite: "Available", pro: "Available", ultra: true, ultraPlus: true, elite: true },
  { feature: "Pink Slips", lite: "Available", pro: "Available", ultra: true, ultraPlus: true, elite: true },
  { feature: "Sports betting", lite: "Available", pro: "Available", ultra: true, ultraPlus: true, elite: true },
  { feature: "Prediction markets", lite: "Available", pro: "Available", ultra: true, ultraPlus: true, elite: true },
  { feature: "AI Brief", lite: true, pro: true, ultra: true, ultraPlus: true, elite: true },
  { feature: "Ask Motive AI", lite: true, pro: true, ultra: true, ultraPlus: true, elite: true },
  { feature: "Research Briefs", lite: "Limited", pro: "Unlimited", ultra: "Unlimited", ultraPlus: "Unlimited", elite: "Unlimited" },
  { feature: "Following", lite: true, pro: true, ultra: true, ultraPlus: true, elite: true },
  { feature: "Market Intelligence", lite: true, pro: true, ultra: true, ultraPlus: true, elite: true },
  { feature: "Portfolio Intelligence", lite: false, pro: true, ultra: true, ultraPlus: true, elite: true },
  { feature: "AI Memory", lite: false, pro: true, ultra: true, ultraPlus: true, elite: true },
  { feature: "Since You Were Away", lite: false, pro: true, ultra: true, ultraPlus: true, elite: true },
  { feature: "Push notifications", lite: false, pro: true, ultra: true, ultraPlus: true, elite: true },
  { feature: "Voice briefing", lite: false, pro: false, ultra: true, ultraPlus: true, elite: true },
  { feature: "Motive Daily (email)", lite: false, pro: true, ultra: true, ultraPlus: true, elite: true },
  { feature: "Motive Daily (voice / podcast)", lite: false, pro: false, ultra: true, ultraPlus: true, elite: true },
  { feature: "Decision History", lite: false, pro: false, ultra: true, ultraPlus: true, elite: true },
  { feature: "Advanced analytics", lite: false, pro: false, ultra: true, ultraPlus: true, elite: true },
  { feature: "API access", lite: false, pro: false, ultra: false, ultraPlus: true, elite: true },
  { feature: "Multiple portfolios", lite: false, pro: false, ultra: false, ultraPlus: true, elite: true },
  { feature: "Team workspace", lite: false, pro: false, ultra: false, ultraPlus: true, elite: true },
  { feature: "Beta features", lite: false, pro: false, ultra: false, ultraPlus: true, elite: true },
  { feature: "Concierge support", lite: false, pro: false, ultra: false, ultraPlus: true, elite: true },
  { feature: "White-glove onboarding", lite: false, pro: false, ultra: false, ultraPlus: false, elite: true },
  { feature: "Direct product feedback", lite: false, pro: false, ultra: false, ultraPlus: false, elite: true },
  { feature: "Early access to AI models", lite: false, pro: false, ultra: false, ultraPlus: false, elite: true },
];

export function alacarteFiveMarketsMonthly(): number {
  return MARKET_PRICE_USD * 5;
}

export function tierById(id: PricingTierId): PricingTier {
  const t = PRICING_TIERS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tier: ${id}`);
  return t;
}

/** Backend module keys used in subscriptions and entitlements. */
export const MARKET_TO_MODULE: Record<IntelligenceMarketId, string> = {
  stocks: "trades",
  crypto: "crypto",
  pink_slips: "penny",
  sports_betting: "betting",
  prediction_markets: "predictions",
};

export const MODULE_TO_MARKET: Record<string, IntelligenceMarketId> = Object.fromEntries(
  Object.entries(MARKET_TO_MODULE).map(([market, mod]) => [mod, market as IntelligenceMarketId])
) as Record<string, IntelligenceMarketId>;

export function requiredMarketPicks(tierId: PricingTierId): number | null {
  const t = tierById(tierId);
  if (t.intelligenceMarketsIncluded === "all") return null;
  return t.intelligenceMarketsIncluded;
}

export function formatTierPrice(tier: PricingTier): string {
  if (tier.annualUsd != null) return `$${tier.annualUsd}/yr`;
  if (tier.monthlyUsd != null) return `$${tier.monthlyUsd.toFixed(2)}/mo`;
  return "Contact us";
}

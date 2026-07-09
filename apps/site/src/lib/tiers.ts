export type PricingTierId = "lite" | "pro" | "ultra" | "ultra_plus" | "elite";

export type IntelligenceMarketId =
  | "stocks"
  | "crypto"
  | "pink_slips"
  | "sports_betting"
  | "prediction_markets";

export interface PricingTier {
  id: PricingTierId;
  name: string;
  tagline: string;
  monthlyUsd: number | null;
  annualUsd: number | null;
  featured?: boolean;
  intelligenceMarketsIncluded: number | "all";
}

export const INTELLIGENCE_MARKETS: { id: IntelligenceMarketId; label: string }[] = [
  { id: "stocks", label: "Stocks" },
  { id: "crypto", label: "Crypto" },
  { id: "pink_slips", label: "Pink Slips" },
  { id: "sports_betting", label: "Sports betting" },
  { id: "prediction_markets", label: "Prediction markets" },
];

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

export function tierById(id: PricingTierId): PricingTier {
  const t = PRICING_TIERS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tier: ${id}`);
  return t;
}

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

/** Lite < Pro < Ultra < Ultra+ < Elite */
export const TIER_RANK: Record<PricingTierId, number> = {
  lite: 0,
  pro: 1,
  ultra: 2,
  ultra_plus: 3,
  elite: 4,
};

export function tierRank(tier: PricingTierId): number {
  return TIER_RANK[tier] ?? 0;
}

/**
 * Subscribed users only see upgrade tiers (strictly higher rank).
 * Elite / top tier → empty list (no downgrade CTAs).
 * Unsubscribed / anonymous → all tiers.
 */
export function upgradeTiersFrom(
  currentTier: PricingTierId | null | undefined,
  opts?: { subscribed?: boolean }
): PricingTier[] {
  if (!opts?.subscribed || !currentTier) return [...PRICING_TIERS];
  const rank = tierRank(currentTier);
  return PRICING_TIERS.filter((t) => tierRank(t.id) > rank);
}

export function validateSelectedMarkets(
  tierId: PricingTierId,
  selected: IntelligenceMarketId[]
): IntelligenceMarketId[] {
  const valid = new Set(INTELLIGENCE_MARKETS.map((m) => m.id));
  const cleaned = selected.filter((m) => valid.has(m));
  const required = requiredMarketPicks(tierId);
  if (required === null) {
    return INTELLIGENCE_MARKETS.map((m) => m.id);
  }
  if (cleaned.length !== required) {
    throw new Error(`Tier '${tierId}' requires exactly ${required} market(s).`);
  }
  return cleaned;
}

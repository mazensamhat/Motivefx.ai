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
  /** Concrete bullets shown on pricing cards (Ultra vs Ultra+ must differ visibly). */
  highlights: string[];
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
    tagline: "Explorer depth · Daily Brief + one market",
    monthlyUsd: 29.99,
    annualUsd: null,
    intelligenceMarketsIncluded: 1,
    highlights: [
      "Explorer intelligence depth",
      "1 market desk of your choice",
      "Daily Brief + Ask Motive AI",
      "Motive Signal on your watch themes",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Professional depth · Opportunity Radar",
    monthlyUsd: 59.99,
    annualUsd: null,
    featured: true,
    intelligenceMarketsIncluded: 2,
    highlights: [
      "Professional intelligence depth",
      "Opportunity Radar across 2 desks",
      "Portfolio Intelligence + AI Memory",
      "Push alerts + Motive Daily email",
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    tagline: "Full-desk intelligence · voice brief",
    monthlyUsd: 99.99,
    annualUsd: null,
    intelligenceMarketsIncluded: "all",
    highlights: [
      "Full-market intelligence depth",
      "Voice Daily Brief + Decision History",
      "Advanced Opportunity Radar analytics",
      "Relationship Graph across all desks",
    ],
  },
  {
    id: "ultra_plus",
    name: "Ultra+",
    tagline: "Institutional depth · teams & API",
    monthlyUsd: 249.99,
    annualUsd: null,
    intelligenceMarketsIncluded: "all",
    highlights: [
      "Institutional intelligence workflows",
      "API access + team workspace",
      "Multiple portfolios",
      "Concierge support",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "Enterprise VIP · white-glove onboarding",
    monthlyUsd: null,
    annualUsd: 1299,
    intelligenceMarketsIncluded: "all",
    highlights: [
      "Enterprise annual access",
      "White-glove onboarding",
      "Direct product channel",
      "Early AI model access",
    ],
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

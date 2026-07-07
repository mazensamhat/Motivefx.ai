import {
  tierHasFeature,
  type EntitlementFeature,
} from "./entitlements";
import type { IntelligenceMarketId, PricingTierId } from "../config/pricingTiers";
import { PRICING_TIERS } from "../config/pricingTiers";

export interface SitePlan {
  tier: PricingTierId;
  selectedMarkets: IntelligenceMarketId[];
  hasSubscription: boolean;
}

const SITE_TO_MODULE: Record<IntelligenceMarketId, string> = {
  stocks: "trades",
  crypto: "crypto",
  pink_slips: "penny",
  sports_betting: "betting",
  prediction_markets: "predictions",
};

const ALL_MODULES = ["trades", "crypto", "penny", "betting", "predictions"];

export function backendModulesForSitePlan(plan: SitePlan): string[] {
  if (!plan.hasSubscription) return [];
  const tier = PRICING_TIERS.find((t) => t.id === plan.tier);
  if (!tier) return [];
  if (tier.intelligenceMarketsIncluded === "all") return [...ALL_MODULES];
  const cap =
    typeof tier.intelligenceMarketsIncluded === "number"
      ? tier.intelligenceMarketsIncluded
      : 1;
  return plan.selectedMarkets
    .map((m) => SITE_TO_MODULE[m])
    .filter(Boolean)
    .slice(0, cap);
}

const ALL_ENTITLEMENT_FEATURES: EntitlementFeature[] = [
  "ai_brief",
  "ask_motive",
  "research_briefs_limited",
  "following",
  "market_intelligence",
  "research_briefs_unlimited",
  "portfolio_intelligence",
  "ai_memory",
  "since_you_were_away",
  "push_notifications",
  "motive_daily_email",
  "voice_briefing",
  "motive_daily_voice",
  "decision_history",
  "advanced_analytics",
  "api_access",
  "multiple_portfolios",
  "team_workspace",
  "beta_features",
  "concierge_support",
  "white_glove_onboarding",
  "direct_product_feedback",
  "early_ai_models",
];

export function featuresForSiteTier(tier: PricingTierId): Record<string, boolean> {
  const features: Record<string, boolean> = {};
  for (const feature of ALL_ENTITLEMENT_FEATURES) {
    features[feature] = tierHasFeature(tier, feature);
  }
  return features;
}

export async function fetchSitePlan(): Promise<SitePlan | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      user?: {
        intelligenceTier?: string;
        selectedMarkets?: string[];
        hasSubscription?: boolean;
      };
    };
    const user = data.user;
    if (!user?.intelligenceTier) return null;
    return {
      tier: user.intelligenceTier as PricingTierId,
      selectedMarkets: (user.selectedMarkets ?? []).filter(
        (m): m is IntelligenceMarketId =>
          typeof m === "string" && m in SITE_TO_MODULE
      ),
      hasSubscription: Boolean(user.hasSubscription),
    };
  } catch {
    return null;
  }
}

export function applySitePlanToModulesPayload<T extends {
  active?: string[];
  allowedMarkets?: string[];
  tier?: PricingTierId;
  features?: Record<string, boolean>;
  hasAnnual?: boolean;
}>(data: T, sitePlan: SitePlan | null): T {
  if (!sitePlan?.hasSubscription) return data;
  const modules = backendModulesForSitePlan(sitePlan);
  if (modules.length === 0) return data;
  return {
    ...data,
    active: modules,
    allowedMarkets: modules,
    tier: sitePlan.tier,
    features: featuresForSiteTier(sitePlan.tier),
    hasAnnual: sitePlan.tier === "elite" ? true : data.hasAnnual,
  };
}

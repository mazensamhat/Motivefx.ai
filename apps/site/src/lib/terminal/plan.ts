import type { IntelligenceMarketId, PricingTierId } from "../tiers";
import { INTELLIGENCE_MARKETS, tierById } from "../tiers";
import { parseUserMarkets } from "../entitlements";
import { userHasActiveSubscription } from "../subscription-access";
import type { User } from "@prisma/client";

export type TerminalFeature =
  | "ai_brief"
  | "ask_motive"
  | "research_briefs_limited"
  | "following"
  | "market_intelligence"
  | "research_briefs_unlimited"
  | "portfolio_intelligence"
  | "ai_memory"
  | "since_you_were_away"
  | "push_notifications"
  | "motive_daily_email"
  | "voice_briefing"
  | "motive_daily_voice"
  | "decision_history"
  | "advanced_analytics"
  | "api_access"
  | "multiple_portfolios"
  | "team_workspace"
  | "beta_features"
  | "concierge_support"
  | "white_glove_onboarding"
  | "direct_product_feedback"
  | "early_ai_models";

const TIER_ORDER: PricingTierId[] = ["lite", "pro", "ultra", "ultra_plus", "elite"];

const FEATURE_MIN_TIER: Record<TerminalFeature, PricingTierId> = {
  ai_brief: "lite",
  ask_motive: "lite",
  research_briefs_limited: "lite",
  following: "lite",
  market_intelligence: "lite",
  research_briefs_unlimited: "pro",
  portfolio_intelligence: "pro",
  ai_memory: "pro",
  since_you_were_away: "pro",
  push_notifications: "pro",
  motive_daily_email: "pro",
  voice_briefing: "ultra",
  motive_daily_voice: "ultra",
  decision_history: "ultra",
  advanced_analytics: "ultra",
  api_access: "ultra_plus",
  multiple_portfolios: "ultra_plus",
  team_workspace: "ultra_plus",
  beta_features: "ultra_plus",
  concierge_support: "ultra_plus",
  white_glove_onboarding: "elite",
  direct_product_feedback: "elite",
  early_ai_models: "elite",
};

const SITE_TO_MODULE: Record<IntelligenceMarketId, string> = {
  stocks: "trades",
  crypto: "crypto",
  pink_slips: "penny",
  sports_betting: "betting",
  prediction_markets: "predictions",
};

const ALL_MODULES = ["trades", "crypto", "penny", "betting", "predictions"];

function tierRank(tier: PricingTierId): number {
  const i = TIER_ORDER.indexOf(tier);
  return i >= 0 ? i : 0;
}

export function tierHasFeature(tier: PricingTierId, feature: TerminalFeature): boolean {
  return tierRank(tier) >= tierRank(FEATURE_MIN_TIER[feature]);
}

export function backendModulesForTier(
  tier: PricingTierId,
  selectedMarkets: IntelligenceMarketId[]
): string[] {
  const t = tierById(tier);
  if (t.intelligenceMarketsIncluded === "all") return [...ALL_MODULES];
  const cap = t.intelligenceMarketsIncluded;
  return selectedMarkets
    .map((m) => SITE_TO_MODULE[m])
    .filter(Boolean)
    .slice(0, cap);
}

export interface TerminalPlan {
  tier: PricingTierId;
  selectedMarkets: IntelligenceMarketId[];
  allowedMarkets: string[];
  active: string[];
  features: Record<string, boolean>;
  entitlements: string[];
  hasAnnual: boolean;
  hasSubscription: boolean;
}

export function planForUser(user: User): TerminalPlan {
  const tier = (user.intelligenceTier ?? "lite") as PricingTierId;
  const selectedMarkets = parseUserMarkets(user.selectedMarkets);
  const hasSubscription = userHasActiveSubscription(user);
  const allowedMarkets = hasSubscription ? backendModulesForTier(tier, selectedMarkets) : [];
  const features: Record<string, boolean> = {};
  const entitlements: string[] = [];

  for (const feature of Object.keys(FEATURE_MIN_TIER) as TerminalFeature[]) {
    const ok = hasSubscription && tierHasFeature(tier, feature);
    features[feature] = ok;
    if (ok) entitlements.push(feature);
  }

  return {
    tier,
    selectedMarkets,
    allowedMarkets,
    active: allowedMarkets,
    features,
    entitlements,
    hasAnnual: hasSubscription && tier === "elite",
    hasSubscription,
  };
}

export function hasModule(plan: TerminalPlan, module: string): boolean {
  return plan.hasSubscription && plan.allowedMarkets.includes(module);
}

export function hasFeature(plan: TerminalPlan, feature: TerminalFeature): boolean {
  return Boolean(plan.features[feature]);
}

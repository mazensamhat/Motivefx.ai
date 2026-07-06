import type { PricingTierId } from "../config/pricingTiers";

export type EntitlementFeature =
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

const FEATURE_MIN_TIER: Record<EntitlementFeature, PricingTierId> = {
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

const TIER_LABELS: Record<PricingTierId, string> = {
  lite: "Lite",
  pro: "Pro",
  ultra: "Ultra",
  ultra_plus: "Ultra+",
  elite: "Elite",
};

const FEATURE_LABELS: Partial<Record<EntitlementFeature, string>> = {
  portfolio_intelligence: "Portfolio Intelligence",
  ai_memory: "AI Memory",
  since_you_were_away: "Since You Were Away",
  push_notifications: "Push notifications",
  voice_briefing: "Voice briefing",
  decision_history: "Decision History",
  advanced_analytics: "Advanced analytics",
  api_access: "API access",
};

function tierRank(tier: PricingTierId): number {
  const i = TIER_ORDER.indexOf(tier);
  return i >= 0 ? i : 0;
}

export function tierHasFeature(tier: PricingTierId, feature: EntitlementFeature): boolean {
  const min = FEATURE_MIN_TIER[feature];
  return tierRank(tier) >= tierRank(min);
}

export function requiredTierForFeature(feature: EntitlementFeature): PricingTierId {
  return FEATURE_MIN_TIER[feature];
}

export function requiredTierLabel(feature: EntitlementFeature): string {
  return TIER_LABELS[FEATURE_MIN_TIER[feature]];
}

export function featureLabel(feature: EntitlementFeature): string {
  return FEATURE_LABELS[feature] ?? feature.replace(/_/g, " ");
}

export function hasFeatureFromMap(
  features: Record<string, boolean> | undefined,
  feature: EntitlementFeature
): boolean {
  if (features && feature in features) return Boolean(features[feature]);
  return false;
}

export interface UserPlanSnapshot {
  tier: PricingTierId;
  selectedMarkets: string[];
  allowedMarkets: string[];
  features: Record<string, boolean>;
  entitlements: string[];
  hasAnnual: boolean;
}

export const DEFAULT_PLAN: UserPlanSnapshot = {
  tier: "lite",
  selectedMarkets: [],
  allowedMarkets: [],
  features: {},
  entitlements: [],
  hasAnnual: false,
};

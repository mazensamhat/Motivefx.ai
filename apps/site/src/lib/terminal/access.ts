import type { User } from "@prisma/client";
import type { TerminalPlan } from "./plan";
import { hasFeature, hasModule } from "./plan";
import type { TerminalFeature } from "./plan";
import { FeatureLockedError, ModuleLockedError } from "./auth";
import { simHasModule } from "./simulation";

const FEATURE_LABELS: Partial<Record<TerminalFeature, string>> = {
  portfolio_intelligence: "Portfolio Intelligence",
  ai_memory: "AI Memory",
  since_you_were_away: "Since You Were Away",
  push_notifications: "Push notifications",
  voice_briefing: "Voice briefing",
  decision_history: "Decision History",
  advanced_analytics: "Advanced analytics",
  api_access: "API access",
};

export function requireModule(plan: TerminalPlan, module: string) {
  if (!hasModule(plan, module)) {
    throw new ModuleLockedError(module);
  }
}

/** Paid module OR active betting/predictions simulation trial. */
export function requireModuleOrSim(plan: TerminalPlan, user: User, module: string) {
  if (hasModule(plan, module)) return;
  if (simHasModule(user, module)) return;
  throw new ModuleLockedError(module);
}

export function requireFeature(plan: TerminalPlan, feature: TerminalFeature) {
  if (!hasFeature(plan, feature)) {
    throw new FeatureLockedError(feature, FEATURE_LABELS[feature] ?? feature.replace(/_/g, " "));
  }
}

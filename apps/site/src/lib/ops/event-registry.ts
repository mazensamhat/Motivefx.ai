/**
 * Canonical MotiveFX Ops event registry (Ops Master Plan §6).
 * Every telemetry eventName must resolve here or become UNKNOWN.
 */

export const MOTIVEFX_EVENTS = [
  // ACCOUNT
  "account.created",
  "account.login",
  "account.logout",
  // PRODUCT
  "product.session.started",
  "product.feature.opened",
  "product.search.executed",
  // SIGNALS
  "signal.generated",
  "signal.updated",
  "signal.strengthened",
  "signal.weakened",
  "signal.invalidated",
  "signal.expired",
  "signal.published",
  "signal.suppressed",
  // OPPORTUNITY RADAR
  "opportunity.created",
  "opportunity.updated",
  "opportunity.promoted",
  "opportunity.demoted",
  "opportunity.invalidated",
  "opportunity.expired",
  "opportunity.opened",
  // SIGNAL GRAPH
  "graph.opened",
  "graph.node.opened",
  "graph.relationship.opened",
  "graph.relationship.calculated",
  "graph.relationship.invalidated",
  // MARKET DNA
  "dna.generated",
  "dna.updated",
  "dna.factor.added",
  "dna.factor.invalidated",
  // DAILY BRIEF
  "brief.generated",
  "brief.published",
  "brief.opened",
  "brief.item.opened",
  // AI
  "ai.request.started",
  "ai.request.completed",
  "ai.request.failed",
  "ai.answer.corrected",
  // DATA
  "provider.request.started",
  "provider.request.completed",
  "provider.request.failed",
  "provider.feed.stale",
  "provider.rate_limited",
  // PORTFOLIO
  "portfolio.created",
  "portfolio.asset.added",
  "portfolio.asset.removed",
  "portfolio.insight.generated",
  // SUBSCRIPTION
  "subscription.trial_started",
  "subscription.converted",
  "subscription.upgraded",
  "subscription.cancelled",
  "subscription.payment_failed",
  // OPS
  "ops.user.viewed",
  "ops.user.modified",
  "ops.impersonation.started",
  "ops.impersonation.ended",
  "ops.signal.modified",
  "ops.provider.modified",
  "ops.market_truth.override",
  "ops.sensitive_data.viewed",
  "UNKNOWN",
] as const;

export type MotiveFxEventName = (typeof MOTIVEFX_EVENTS)[number];

const EVENT_SET = new Set<string>(MOTIVEFX_EVENTS);

export function resolveEventName(raw: string | null | undefined): {
  value: MotiveFxEventName;
  known: boolean;
  raw: string;
} {
  const key = (raw ?? "").trim();
  if (!key) return { value: "UNKNOWN", known: false, raw: key };
  if (EVENT_SET.has(key)) return { value: key as MotiveFxEventName, known: key !== "UNKNOWN", raw: key };
  return { value: "UNKNOWN", known: false, raw: key };
}

export function isKnownEvent(name: string): name is MotiveFxEventName {
  return EVENT_SET.has(name) && name !== "UNKNOWN";
}

export type EventDomain =
  | "account"
  | "product"
  | "signal"
  | "opportunity"
  | "graph"
  | "dna"
  | "brief"
  | "ai"
  | "provider"
  | "portfolio"
  | "subscription"
  | "ops"
  | "unknown";

export function eventDomain(name: MotiveFxEventName): EventDomain {
  if (name === "UNKNOWN") return "unknown";
  const prefix = name.split(".")[0];
  switch (prefix) {
    case "account":
      return "account";
    case "product":
      return "product";
    case "signal":
      return "signal";
    case "opportunity":
      return "opportunity";
    case "graph":
      return "graph";
    case "dna":
      return "dna";
    case "brief":
      return "brief";
    case "ai":
      return "ai";
    case "provider":
      return "provider";
    case "portfolio":
      return "portfolio";
    case "subscription":
      return "subscription";
    case "ops":
      return "ops";
    default:
      return "unknown";
  }
}

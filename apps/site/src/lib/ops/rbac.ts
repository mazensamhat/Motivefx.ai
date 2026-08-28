/**
 * Ops RBAC capability model (Ops Master Plan §75–76).
 * Today: admin email → full capability set.
 * Tomorrow: role → capability grants.
 */

export const OPS_CAPABILITIES = [
  "view_users",
  "manage_users",
  "view_market_truth",
  "manage_market_truth",
  "view_signals",
  "manage_signals",
  "view_providers",
  "manage_providers",
  "view_ai_ops",
  "manage_ai_config",
  "view_revenue",
  "manage_billing",
  "view_security",
  "manage_security",
  "view_audit",
  "impersonate_user_readonly",
  "impersonate_user_support",
  "impersonate_sensitive_user",
  "view_source_rights",
  "manage_source_rights",
  "manage_runtime_config",
] as const;

export type OpsCapability = (typeof OPS_CAPABILITIES)[number];

export type OpsRiskClass = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const CAPABILITY_RISK: Record<OpsCapability, OpsRiskClass> = {
  view_users: "LOW",
  manage_users: "MEDIUM",
  view_market_truth: "LOW",
  manage_market_truth: "CRITICAL",
  view_signals: "LOW",
  manage_signals: "HIGH",
  view_providers: "LOW",
  manage_providers: "HIGH",
  view_ai_ops: "LOW",
  manage_ai_config: "HIGH",
  view_revenue: "MEDIUM",
  manage_billing: "HIGH",
  view_security: "MEDIUM",
  manage_security: "CRITICAL",
  view_audit: "MEDIUM",
  impersonate_user_readonly: "HIGH",
  impersonate_user_support: "HIGH",
  impersonate_sensitive_user: "CRITICAL",
  view_source_rights: "MEDIUM",
  manage_source_rights: "CRITICAL",
  manage_runtime_config: "HIGH",
};

/** Full admin grant — used until multi-role roles land. */
export const FULL_ADMIN_CAPABILITIES: ReadonlySet<OpsCapability> = new Set(OPS_CAPABILITIES);

export type OpsActor = {
  id: string;
  email: string;
  capabilities: ReadonlySet<OpsCapability>;
};

export function actorHas(actor: OpsActor, capability: OpsCapability): boolean {
  return actor.capabilities.has(capability);
}

export function requireCapability(actor: OpsActor, capability: OpsCapability): void {
  if (!actorHas(actor, capability)) {
    throw new Error(`Missing capability: ${capability}`);
  }
}

export function adminActorFromSession(session: { id: string; email: string }): OpsActor {
  return {
    id: session.id,
    email: session.email,
    capabilities: FULL_ADMIN_CAPABILITIES,
  };
}

/** Impersonation session contract (Ops Master Plan §54). UI wiring is P1. */
export type ImpersonationMode = "VIEW_AS_USER" | "SUPPORT_MODE" | "ELEVATED_SUPPORT";

export type ImpersonationSession = {
  authenticatedActorId: string;
  effectiveUserId: string;
  impersonationSessionId: string;
  mode: ImpersonationMode;
  reason: string;
  ticketId?: string;
  startedAt: string;
  expiresAt: string;
};

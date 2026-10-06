/**
 * Ops RBAC capability model (Ops Master Plan §75–76).
 * Backward-compatible default: ADMIN_EMAILS users are full_admin unless OPS_ROLE_ASSIGNMENTS says otherwise.
 *
 * OPS_ROLE_ASSIGNMENTS supports either JSON:
 *   {"admin@example.com":"ops_operator","support@example.com":"support"}
 * or CSV:
 *   admin@example.com=ops_operator,support@example.com=support
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
export type OpsRole = "full_admin" | "ops_operator" | "support" | "readonly";

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

export const FULL_ADMIN_CAPABILITIES: ReadonlySet<OpsCapability> = new Set(OPS_CAPABILITIES);

const ROLE_CAPABILITIES: Record<OpsRole, ReadonlySet<OpsCapability>> = {
  full_admin: FULL_ADMIN_CAPABILITIES,
  ops_operator: new Set<OpsCapability>([
    "view_users",
    "view_market_truth",
    "manage_market_truth",
    "view_signals",
    "manage_signals",
    "view_providers",
    "manage_providers",
    "view_ai_ops",
    "view_revenue",
    "view_security",
    "view_audit",
    "impersonate_user_readonly",
    "view_source_rights",
    "manage_runtime_config",
  ]),
  support: new Set<OpsCapability>([
    "view_users",
    "manage_users",
    "view_market_truth",
    "view_signals",
    "view_providers",
    "view_ai_ops",
    "view_revenue",
    "view_security",
    "view_audit",
    "impersonate_user_readonly",
    "impersonate_user_support",
  ]),
  readonly: new Set<OpsCapability>([
    "view_users",
    "view_market_truth",
    "view_signals",
    "view_providers",
    "view_ai_ops",
    "view_revenue",
    "view_security",
    "view_audit",
    "view_source_rights",
  ]),
};

function normalizeRole(value: unknown): OpsRole | null {
  return value === "full_admin" || value === "ops_operator" || value === "support" || value === "readonly"
    ? value
    : null;
}

export function resolveOpsRole(email: string): OpsRole {
  const raw = process.env.OPS_ROLE_ASSIGNMENTS?.trim();
  if (!raw) return "full_admin";

  const normalizedEmail = email.trim().toLowerCase();

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const [candidate, value] of Object.entries(parsed)) {
        if (candidate.trim().toLowerCase() !== normalizedEmail) continue;
        return normalizeRole(value) ?? "full_admin";
      }
    } catch {
      return "full_admin";
    }
  } else {
    for (const entry of raw.split(",")) {
      const [candidate, value] = entry.split("=").map((v) => v?.trim());
      if (!candidate || candidate.toLowerCase() !== normalizedEmail) continue;
      return normalizeRole(value) ?? "full_admin";
    }
  }

  return "full_admin";
}

export function capabilitiesForRole(role: OpsRole): ReadonlySet<OpsCapability> {
  return ROLE_CAPABILITIES[role];
}

export type OpsActor = {
  id: string;
  email: string;
  role: OpsRole;
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
  const role = resolveOpsRole(session.email);
  return {
    id: session.id,
    email: session.email,
    role,
    capabilities: capabilitiesForRole(role),
  };
}

/** Impersonation session contract (Ops Master Plan §54). */
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

/**
 * Secure impersonation sessions (Ops Master Plan §54–58).
 * Never uses the user's password. In-process until durable store lands.
 */

import type { ImpersonationMode, ImpersonationSession } from "./rbac";
import { recordAudit } from "./audit";
import { recordTelemetry } from "./telemetry-envelope";

const sessions = new Map<string, ImpersonationSession>();
const byOperator = new Map<string, string>();

const DEFAULT_TTL_MS = 30 * 60 * 1000;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `imp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getActiveImpersonation(operatorId: string): ImpersonationSession | null {
  const id = byOperator.get(operatorId);
  if (!id) return null;
  const session = sessions.get(id);
  if (!session) {
    byOperator.delete(operatorId);
    return null;
  }
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    sessions.delete(id);
    byOperator.delete(operatorId);
    return null;
  }
  return session;
}

export function startImpersonation(input: {
  operatorId: string;
  operatorEmail: string;
  effectiveUserId: string;
  effectiveUserEmail: string;
  mode?: ImpersonationMode;
  reason: string;
  ticketId?: string;
  ttlMs?: number;
}): ImpersonationSession {
  const existing = getActiveImpersonation(input.operatorId);
  if (existing) endImpersonation(input.operatorId, input.operatorEmail, "replaced");

  const now = Date.now();
  const session: ImpersonationSession = {
    authenticatedActorId: input.operatorId,
    effectiveUserId: input.effectiveUserId,
    impersonationSessionId: newId(),
    mode: input.mode ?? "VIEW_AS_USER",
    reason: input.reason.trim() || "Support investigation",
    ticketId: input.ticketId,
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (input.ttlMs ?? DEFAULT_TTL_MS)).toISOString(),
  };

  sessions.set(session.impersonationSessionId, session);
  byOperator.set(input.operatorId, session.impersonationSessionId);

  recordAudit({
    actorId: input.operatorId,
    actorEmail: input.operatorEmail,
    action: "ops.impersonation.started",
    capability: "impersonate_user_readonly",
    targetType: "user",
    targetId: input.effectiveUserId,
    reason: `${session.reason}${input.effectiveUserEmail ? ` (${input.effectiveUserEmail})` : ""}`,
    result: "success",
    after: { mode: session.mode, expiresAt: session.expiresAt },
  });

  recordTelemetry({
    eventName: "ops.impersonation.started",
    userId: input.operatorId,
    sourceClass: "ops",
    privacyClass: "sensitive",
    metadata: {
      effectiveUserId: input.effectiveUserId,
      mode: session.mode,
      sessionId: session.impersonationSessionId,
    },
  });

  return session;
}

export function endImpersonation(
  operatorId: string,
  operatorEmail: string,
  reason = "operator_exit"
): ImpersonationSession | null {
  const session = getActiveImpersonation(operatorId);
  if (!session) return null;

  sessions.delete(session.impersonationSessionId);
  byOperator.delete(operatorId);

  recordAudit({
    actorId: operatorId,
    actorEmail: operatorEmail,
    action: "ops.impersonation.ended",
    capability: "impersonate_user_readonly",
    targetType: "user",
    targetId: session.effectiveUserId,
    reason,
    result: "success",
    before: { mode: session.mode, startedAt: session.startedAt },
  });

  recordTelemetry({
    eventName: "ops.impersonation.ended",
    userId: operatorId,
    sourceClass: "ops",
    privacyClass: "sensitive",
    metadata: { sessionId: session.impersonationSessionId, reason },
  });

  return session;
}

/** Restricted actions while impersonating (Ops Master Plan §57). */
export const IMPERSONATION_BLOCKED_ACTIONS = [
  "payment_method_change",
  "account_deletion",
  "credential_change",
  "sensitive_export",
  "subscription_purchase",
  "security_change",
  "api_key_access",
] as const;

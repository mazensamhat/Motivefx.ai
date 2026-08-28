/**
 * Ops audit engine (Ops Master Plan §77).
 * Sensitive actions: WHO / WHAT / TARGET / WHEN / WHY / BEFORE / AFTER / RESULT.
 */

import { recordTelemetry } from "./telemetry-envelope";
import type { OpsCapability, OpsRiskClass } from "./rbac";
import { CAPABILITY_RISK } from "./rbac";

export type AuditResult = "success" | "denied" | "error" | "partial";

export type AuditRecord = {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  capability?: OpsCapability;
  risk: OpsRiskClass;
  targetType?: string;
  targetId?: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
  result: AuditResult;
  environment: string;
  requestId?: string;
  observedAt: string;
};

export type AuditInput = {
  actorId: string;
  actorEmail: string;
  action: string;
  capability?: OpsCapability;
  risk?: OpsRiskClass;
  targetType?: string;
  targetId?: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
  result: AuditResult;
  requestId?: string;
};

const AUDIT_MAX = 500;
const auditRing: AuditRecord[] = [];

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function recordAudit(input: AuditInput): AuditRecord {
  const risk =
    input.risk ??
    (input.capability ? CAPABILITY_RISK[input.capability] : "MEDIUM");
  const record: AuditRecord = {
    id: newId(),
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    action: input.action,
    capability: input.capability,
    risk,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    before: input.before,
    after: input.after,
    result: input.result,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    requestId: input.requestId,
    observedAt: new Date().toISOString(),
  };

  auditRing.unshift(record);
  if (auditRing.length > AUDIT_MAX) auditRing.length = AUDIT_MAX;

  // Mirror into telemetry for Live Ops feed.
  const eventName =
    input.action.startsWith("ops.impersonation")
      ? input.action.includes("started")
        ? "ops.impersonation.started"
        : "ops.impersonation.ended"
      : input.action.includes("market_truth")
        ? "ops.market_truth.override"
        : input.action.includes("provider")
          ? "ops.provider.modified"
          : input.action.includes("signal")
            ? "ops.signal.modified"
            : input.action.includes("user")
              ? "ops.user.modified"
              : "ops.sensitive_data.viewed";

  recordTelemetry({
    eventName,
    userId: input.actorId,
    sourceClass: "ops",
    privacyClass: risk === "CRITICAL" || risk === "HIGH" ? "sensitive" : "internal",
    status: input.result === "success" ? "ok" : "error",
    metadata: {
      auditId: record.id,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      risk,
      result: input.result,
    },
  });

  return record;
}

export function getRecentAudit(limit = 50): AuditRecord[] {
  return auditRing.slice(0, Math.max(1, Math.min(limit, AUDIT_MAX)));
}

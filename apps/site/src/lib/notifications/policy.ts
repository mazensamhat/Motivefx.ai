import { createHash } from "node:crypto";

export type DeliveryChannel = "daily_email" | "expo_push";
export type DeliveryState = "queued" | "processing" | "retry" | "accepted" | "provider_confirmed" | "suppressed" | "failed" | "unknown";
export type DeliveryJob = {
  key: string;
  userId: string;
  channel: DeliveryChannel;
  eventKey: string;
  targetRef: string;
  content: { title: string; body: string; path: string };
  createdAt: number;
  expiresAt: number;
  attempts: number;
};
export type DeliveryRecipient = {
  userId: string;
  disabled: boolean;
  entitled: boolean;
  consentAt: number | null;
  revokedAt: number | null;
  suppressed: boolean;
  targetRef: string;
  email?: string;
  emailConfirmedAt?: number | null;
  confirmedEmailHash?: string | null;
  pushToken?: string;
};

export const MAX_DELIVERY_ATTEMPTS = 4;
// Resend's provider idempotency window is 24h. Stop earlier, never retry after it.
export const MAX_DELIVERY_AGE_MS = 20 * 60 * 60 * 1000;

export function emailHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function deliveryKey(channel: DeliveryChannel, userId: string, eventKey: string, targetRef: string): string {
  if (![userId, eventKey, targetRef].every(value => value.length > 0 && value.length <= 200)) throw new Error("Invalid delivery identity");
  return `motivefx-v1-${createHash("sha256").update(JSON.stringify([channel, userId, eventKey, targetRef])).digest("hex")}`;
}

export function dailyEventKey(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) throw new Error("Invalid UTC briefing date");
  return `daily:${day}`;
}

export function deliveryEligibility(job: DeliveryJob, recipient: DeliveryRecipient | null, now: number): string | null {
  if (!recipient || recipient.userId !== job.userId) return "recipient_unavailable";
  if (recipient.disabled) return "account_disabled";
  if (!recipient.entitled) return "not_entitled";
  if (recipient.suppressed) return "recipient_suppressed";
  if (!Number.isFinite(recipient.consentAt) || !recipient.consentAt || recipient.consentAt > now) return "consent_required";
  if (recipient.revokedAt != null && recipient.revokedAt >= recipient.consentAt) return "consent_revoked";
  if (recipient.targetRef !== job.targetRef) return "target_changed";
  if (!Number.isFinite(now) || !Number.isFinite(job.createdAt) || !Number.isFinite(job.expiresAt) ||
      job.createdAt > now || job.expiresAt <= now || now - job.createdAt >= MAX_DELIVERY_AGE_MS) return "event_expired";
  if (job.attempts >= MAX_DELIVERY_ATTEMPTS) return "attempt_limit";
  if (job.channel === "daily_email") {
    if (!recipient.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) return "email_unavailable";
    if (!recipient.emailConfirmedAt || !Number.isFinite(recipient.emailConfirmedAt) ||
        recipient.emailConfirmedAt < recipient.consentAt || recipient.emailConfirmedAt > now ||
        recipient.confirmedEmailHash !== emailHash(recipient.email)) return "confirmed_consent_required";
  } else if (!recipient.pushToken || !/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(recipient.pushToken)) {
    return "device_unavailable";
  }
  return null;
}

export function retryAt(job: DeliveryJob, now: number): number | null {
  const next = now + Math.min(60 * 60_000, 60_000 * 2 ** Math.max(0, job.attempts - 1));
  return job.attempts >= MAX_DELIVERY_ATTEMPTS || next >= job.expiresAt || next - job.createdAt >= MAX_DELIVERY_AGE_MS ? null : next;
}

export function safeNotificationContent(content: DeliveryJob["content"]): DeliveryJob["content"] {
  // Only same-site application paths; never accept an arbitrary destination URL.
  if (!content.path.startsWith("/") || content.path.startsWith("//") || /[\\\r\n]/.test(content.path)) throw new Error("Invalid notification path");
  if (!content.title.trim() || !content.body.trim()) throw new Error("Notification content required");
  return { title: content.title.slice(0, 120), body: content.body.slice(0, 1800), path: content.path.slice(0, 300) };
}

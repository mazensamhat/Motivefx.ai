import { prisma } from "@motivefx/database";
import { planForUser } from "../terminal/plan";
import { deliveryKey, emailHash, MAX_DELIVERY_AGE_MS, MAX_DELIVERY_ATTEMPTS, safeNotificationContent, type DeliveryChannel, type DeliveryJob } from "./policy";
import type { DeliveryStore } from "./worker";

export function notificationStorageEnabled(): boolean {
  return process.env.MOTIVE_NOTIFICATION_STORAGE_ENABLED === "true";
}
export function notificationSendingEnabled(): boolean {
  return notificationStorageEnabled() && process.env.MOTIVE_NOTIFICATION_SEND_ENABLED === "true";
}
function requireStorage() { if (!notificationStorageEnabled()) throw new Error("notification_storage_disabled"); }

export async function enqueueNotification(input: {
  userId: string; channel: DeliveryChannel; eventKey: string; targetRef: string; content: DeliveryJob["content"];
}, now = Date.now()): Promise<string> {
  requireStorage();
  const key = deliveryKey(input.channel, input.userId, input.eventKey, input.targetRef);
  const content = safeNotificationContent(input.content);
  // Prisma's empty-update upsert can race on a missing row. A single INSERT
  // ON CONFLICT DO NOTHING keeps the first payload immutable under concurrency.
  await prisma.notificationDelivery.createMany({
    skipDuplicates: true,
    data: { key, userId: input.userId, channel: input.channel, eventKey: input.eventKey, targetRef: input.targetRef,
      contentJson: JSON.stringify(content), createdAt: new Date(now), availableAt: new Date(now), expiresAt: new Date(now + MAX_DELIVERY_AGE_MS) },
  });
  return key;
}

export const notificationStore: DeliveryStore = {
  async claim(key, now) {
    requireStorage();
    return prisma.$transaction(async (tx) => {
      const row = await tx.notificationDelivery.findUnique({ where: { key } });
      if (!row || !["queued", "retry"].includes(row.state) || row.availableAt.getTime() > now || row.expiresAt.getTime() <= now || row.attempts >= MAX_DELIVERY_ATTEMPTS) return null;
      const content = safeNotificationContent(JSON.parse(row.contentJson));
      if (row.channel !== "daily_email" && row.channel !== "expo_push") return null;
      const claimed = await tx.notificationDelivery.updateMany({
        where: { key, state: row.state, attempts: row.attempts },
        data: { state: "processing", attempts: { increment: 1 }, attemptedAt: new Date(now) },
      });
      if (claimed.count !== 1) return null;
      return { key, userId: row.userId, channel: row.channel, eventKey: row.eventKey, targetRef: row.targetRef,
        content, createdAt: row.createdAt.getTime(), expiresAt: row.expiresAt.getTime(), attempts: row.attempts + 1 };
    });
  },
  async loadRecipient(job) {
    requireStorage();
    const [user, consent] = await Promise.all([
      prisma.user.findUnique({ where: { id: job.userId } }),
      prisma.notificationConsent.findUnique({ where: { userId: job.userId } }),
    ]);
    if (!user || !consent) return null;
    const plan = planForUser(user);
    if (job.channel === "daily_email") return {
      userId: user.id, disabled: !!user.disabledAt, entitled: !!plan.features.motive_daily_email,
      consentAt: consent.dailyEmailConsentAt?.getTime() ?? null, revokedAt: consent.dailyEmailRevokedAt?.getTime() ?? null,
      suppressed: !!consent.emailSuppressedAt, targetRef: emailHash(user.email), email: user.email,
      emailConfirmedAt: consent.dailyEmailConfirmedAt?.getTime() ?? null, confirmedEmailHash: consent.confirmedEmailHash,
    };
    const device = await prisma.notificationDevice.findFirst({ where: { id: job.targetRef, userId: user.id, provider: "expo" } });
    return {
      userId: user.id, disabled: !!user.disabledAt, entitled: !!plan.features.push_notifications,
      consentAt: consent.pushConsentAt && device ? Math.max(consent.pushConsentAt.getTime(), device.consentAt.getTime()) : null,
      revokedAt: consent.pushRevokedAt?.getTime() ?? null,
      suppressed: !device || !!device.revokedAt, targetRef: device?.id ?? "", pushToken: device?.token,
    };
  },
  async finish(key, attempt, result) {
    requireStorage();
    const changed = await prisma.notificationDelivery.updateMany({
      where: { key, state: "processing", attempts: attempt },
      data: { state: result.state, providerId: result.providerId, lastCode: result.code,
        ...(result.nextAttemptAt != null ? { availableAt: new Date(result.nextAttemptAt) } : {}) },
    });
    if (changed.count !== 1) throw new Error("notification_claim_lost");
  },
  async revokeDevice(job) {
    requireStorage();
    await prisma.notificationDevice.updateMany({ where: { id: job.targetRef, userId: job.userId }, data: { revokedAt: new Date() } });
  },
};

/** A process may die after a provider accepted the message. Never automatically
 * requeue abandoned claims: reconcile receipts/provider idempotency first. */
export async function quarantineAbandonedNotifications(now = Date.now()) {
  requireStorage();
  return prisma.notificationDelivery.updateMany({
    where: { state: "processing", attemptedAt: { lt: new Date(now - 10 * 60_000) } },
    data: { state: "unknown", lastCode: "abandoned_claim_requires_reconciliation" },
  });
}

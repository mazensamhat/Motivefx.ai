import { prisma } from "@motivefx/database";
import { enqueueNotification, notificationStorageEnabled } from "./store";
import { MAX_DELIVERY_AGE_MS } from "./policy";

/** Durable alert IDs are business events. Re-upserting the same alert cannot
 * create a second delivery for the same registered device. No provider I/O. */
export async function queueWatchAlertPush(alert: { id: string; userId: string; title: string; body: string | null; createdAt: Date }) {
  if (!notificationStorageEnabled()) return;
  if (alert.createdAt.getTime() > Date.now() || Date.now() - alert.createdAt.getTime() >= MAX_DELIVERY_AGE_MS) return;
  const consent = await prisma.notificationConsent.findUnique({ where: { userId: alert.userId } });
  if (!consent?.pushConsentAt || consent.pushConsentAt > alert.createdAt || (consent.pushRevokedAt && consent.pushRevokedAt >= consent.pushConsentAt)) return;
  const devices = await prisma.notificationDevice.findMany({
    where: { userId: alert.userId, provider: "expo", revokedAt: null, consentAt: { lte: alert.createdAt } },
    orderBy: { createdAt: "desc" }, take: 10,
  });
  await Promise.all(devices.map(device => enqueueNotification({
    userId: alert.userId, channel: "expo_push", eventKey: `alert:${alert.id}`, targetRef: device.id,
    content: { title: "MotiveFX Watch Agent", body: "New research alert. Open MotiveFX to review the evidence.", path: "/terminal/" },
  }, alert.createdAt.getTime())));
}

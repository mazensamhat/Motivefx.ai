import { prisma } from "@motivefx/database";
import { notificationSendingEnabled } from "./store";
import { classifyPushReceipt } from "./receipts";

export async function pollPushReceipts(now = Date.now()) {
  if (!notificationSendingEnabled()) return { checked: 0, state: "disabled" };
  const jobs = await prisma.notificationDelivery.findMany({
    where: { channel: "expo_push", state: "accepted", providerId: { not: null }, attemptedAt: { lt: new Date(now - 15 * 60_000) } },
    orderBy: { attemptedAt: "asc" }, take: 100,
  });
  if (!jobs.length) return { checked: 0, state: "empty" };
  const accessToken = process.env.MOTIVE_EXPO_ACCESS_TOKEN?.trim();
  const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST", signal: AbortSignal.timeout(8_000),
    headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify({ ids: jobs.map(job => job.providerId) }),
  });
  if (!response.ok) return { checked: 0, state: "provider_unavailable" };
  const payload = await response.json() as { data?: Record<string, unknown> };
  for (const job of jobs) {
    const result = classifyPushReceipt(payload.data?.[job.providerId!]);
    if (result === "pending" && job.attemptedAt!.getTime() > now - 24 * 60 * 60_000) continue;
    await prisma.$transaction(async tx => {
      await tx.notificationDelivery.updateMany({ where: { key: job.key, state: "accepted" }, data: {
        state: result === "pending" ? "unknown" : result === "revoke_device" ? "suppressed" : result,
        lastCode: result === "pending" ? "push_receipt_unavailable" : result === "revoke_device" ? "device_not_registered" : "expo_receipt",
      } });
      if (result === "revoke_device") {
        await tx.notificationDevice.updateMany({ where: { id: job.targetRef, userId: job.userId }, data: { revokedAt: new Date(now) } });
        await tx.notificationDelivery.updateMany({ where: { userId: job.userId, targetRef: job.targetRef, channel: "expo_push", state: { in: ["queued", "retry"] } }, data: { state: "suppressed", lastCode: "device_not_registered" } });
      }
    });
  }
  return { checked: jobs.length, state: "checked" };
}

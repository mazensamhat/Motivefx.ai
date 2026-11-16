import { prisma } from "@motivefx/database";
import { getEmailFrom, getResendApiKey } from "@/lib/email";
import { SITE } from "@/lib/site-config";
import { notificationSendingEnabled, notificationStore, quarantineAbandonedNotifications } from "@/lib/notifications/store";
import { runDelivery } from "@/lib/notifications/worker";
import { sendDelivery } from "@/lib/notifications/transports";
import { createUnsubscribeToken } from "@/lib/notifications/unsubscribe";
import { pollPushReceipts } from "@/lib/notifications/push-receipts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // No schedule is added until delivery acceptance. Both gates default off.
  if (!notificationSendingEnabled()) return Response.json({ ok: true, state: "disabled", dispatched: 0 }, { headers: { "Cache-Control": "no-store" } });
  const started = Date.now();
  await quarantineAbandonedNotifications(started);
  const receipts = await pollPushReceipts(started).catch(() => ({ checked: 0, state: "provider_unavailable" }));
  const jobs = await prisma.notificationDelivery.findMany({ where: { state: { in: ["queued", "retry"] }, availableAt: { lte: new Date(started) }, expiresAt: { gt: new Date(started) } }, select: { key: true }, take: 20, orderBy: [{ availableAt: "asc" }, { key: "asc" }] });
  const states: Record<string, number> = {};
  for (const job of jobs) {
    if (Date.now() - started > 40_000) break;
    const result = await runDelivery(job.key, {
      enabled: notificationSendingEnabled(), now: Date.now, store: notificationStore,
      send: async (delivery, recipient) => {
        const token = delivery.channel === "daily_email"
          ? createUnsubscribeToken(delivery.userId, delivery.targetRef, process.env.AUTH_SECRET?.trim() ?? "") : null;
        return sendDelivery(delivery, recipient, { enabled: notificationSendingEnabled(),
          resendApiKey: getResendApiKey(), from: getEmailFrom(), appUrl: SITE.url,
          unsubscribeUrl: token ? `${SITE.url}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}` : undefined,
          postalAddress: process.env.MOTIVE_NOTIFICATION_POSTAL_ADDRESS?.trim(),
          expoAccessToken: process.env.MOTIVE_EXPO_ACCESS_TOKEN?.trim(),
        });
      },
    });
    states[result.state] = (states[result.state] ?? 0) + 1;
  }
  return Response.json({ ok: true, states, receipts, note: "Provider acceptance is not proof of device or inbox delivery." }, { headers: { "Cache-Control": "no-store" } });
}

import { prisma } from "@motivefx/database";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { planForUser } from "@/lib/terminal/plan";
import { dailyEventKey, deliveryKey, deliveryEligibility, emailHash, MAX_DELIVERY_AGE_MS, type DeliveryJob } from "@/lib/notifications/policy";
import { enqueueNotification, notificationSendingEnabled, notificationStore } from "@/lib/notifications/store";
import { flushSignalEvidencePersistence } from "@/lib/terminal/market-truth/evidence-ledger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function boundedBriefing(input: Parameters<typeof buildHomeBriefing>[0]) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([buildHomeBriefing(input), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("daily_briefing_timeout")), 8_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!notificationSendingEnabled()) return Response.json({ ok: true, state: "disabled", queued: 0 }, { headers: { "Cache-Control": "no-store" } });
  const started = Date.now();
  const day = new Date(started).toISOString().slice(0, 10);
  const eventKey = dailyEventKey(day);
  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor && !/^[A-Za-z0-9_-]{1,100}$/.test(cursor)) return Response.json({ error: "Invalid cursor" }, { status: 400 });
  const candidates = await prisma.notificationConsent.findMany({
    where: { dailyEmailConsentAt: { not: null }, dailyEmailConfirmedAt: { not: null }, emailSuppressedAt: null },
    select: { userId: true }, take: 5, orderBy: { userId: "asc" },
    ...(cursor ? { cursor: { userId: cursor }, skip: 1 } : {}),
  });
  let queued = 0, skipped = 0, failed = 0;
  let lastCursor = cursor;
  for (const candidate of candidates) {
    if (Date.now() - started > 35_000) break;
    lastCursor = candidate.userId;
    try {
      const user = await prisma.user.findUnique({ where: { id: candidate.userId } });
      if (!user) { skipped += 1; continue; }
      const targetRef = emailHash(user.email);
      const key = deliveryKey("daily_email", user.id, eventKey, targetRef);
      if (await prisma.notificationDelivery.findUnique({ where: { key }, select: { key: true } })) { skipped += 1; continue; }
      const job: DeliveryJob = { key, userId: user.id, channel: "daily_email", eventKey, targetRef,
        createdAt: started, expiresAt: started + MAX_DELIVERY_AGE_MS, attempts: 0,
        content: { title: `Motive Daily — ${day}`, body: "Briefing preparation", path: "/terminal/" } };
      const recipient = await notificationStore.loadRecipient(job);
      if (deliveryEligibility(job, recipient, Date.now())) { skipped += 1; continue; }
      // Reuse the customer's existing market and portfolio-scoped briefing.
      // A failed/degraded generation never becomes a reassuring empty email.
      const briefing = await boundedBriefing({ userId: user.id, displayName: user.displayName, plan: planForUser(user) }) as unknown as Record<string, unknown>;
      const generated = typeof briefing.generatedAt === "string" ? Date.parse(briefing.generatedAt) : NaN;
      const body = typeof briefing.audioBriefingScript === "string" ? briefing.audioBriefingScript.trim() : "";
      if (briefing.degraded || !body || !Number.isFinite(generated) || generated > Date.now() + 60_000 || Date.now() - generated > 12 * 60 * 60_000) { failed += 1; continue; }
      await enqueueNotification({ userId: user.id, channel: "daily_email", eventKey, targetRef, content: { ...job.content, body } }, started);
      queued += 1;
    } catch { failed += 1; }
  }
  await flushSignalEvidencePersistence();
  return Response.json({ ok: failed === 0, day, queued, skipped, failed,
    nextCursor: candidates.length > 0 && (candidates.length === 5 || lastCursor !== candidates.at(-1)?.userId) ? lastCursor : null,
    note: "Advance the cursor until null; enqueue is idempotent and does not itself deliver email." }, { headers: { "Cache-Control": "no-store" } });
}

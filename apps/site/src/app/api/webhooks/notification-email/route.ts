import { prisma } from "@motivefx/database";
import { notificationStorageEnabled } from "@/lib/notifications/store";
import { verifyEmailReceipt } from "@/lib/notifications/receipts";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const secret = process.env.MOTIVE_NOTIFICATION_WEBHOOK_SECRET?.trim();
  if (!notificationStorageEnabled() || !secret) return Response.json({ error: "Notification receipts are not activated." }, { status: 503 });
  if (Number(request.headers.get("content-length")) > 65_536) return Response.json({ error: "Payload too large" }, { status: 413 });
  let receipt;
  try { receipt = verifyEmailReceipt(await request.text(), request.headers, secret); }
  catch { return Response.json({ error: "Invalid webhook" }, { status: 400 }); }
  if (!receipt) return Response.json({ ok: true, ignored: true });
  try {
    await prisma.$transaction(async tx => {
      const job = await tx.notificationDelivery.findFirst({ where: { key: receipt.deliveryKey, channel: "daily_email", providerId: receipt.providerId } });
      // Retry unmatched receipts: acceptance may still be committing after send.
      if (!job) throw new Error("receipt_job_pending");
      await tx.notificationReceipt.create({ data: { id: receipt.id, provider: "resend", eventType: receipt.eventType, providerId: receipt.providerId } });
      // Late delivered events cannot undo a bounce, complaint, or opt-out.
      await tx.notificationDelivery.updateMany({ where: { key: job.key, ...(receipt.suppress ? {} : {
        state: { notIn: receipt.state === "failed" ? ["suppressed", "provider_confirmed"] : ["suppressed"] },
      }) }, data: { state: receipt.state, lastCode: receipt.eventType } });
      if (receipt.suppress) {
        const now = new Date();
        await tx.notificationConsent.upsert({ where: { userId: job.userId }, create: { userId: job.userId, emailSuppressedAt: now }, update: { emailSuppressedAt: now } });
        await tx.notificationDelivery.updateMany({ where: { userId: job.userId, channel: "daily_email", state: { in: ["queued", "retry"] } }, data: { state: "suppressed", lastCode: receipt.eventType } });
      }
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return Response.json({ ok: true, duplicate: true });
    return Response.json({ error: "Receipt could not be recorded. Retry required." }, { status: 503 });
  }
}

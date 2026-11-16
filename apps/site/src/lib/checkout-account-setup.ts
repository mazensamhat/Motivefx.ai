import { createHash } from "crypto";
import { prisma } from "@motivefx/database";
import { createPasswordResetToken } from "./password-reset";
import { sendAccountSetupEmail } from "./account-setup-email";

/** One durable claim per checkout. A process failure after acceptance is unknown,
 * never permission to generate another token and resend the same business event. */
export async function sendCheckoutAccountSetup(userId: string, checkoutSessionId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, passwordHash: true, disabledAt: true } });
  if (!user || user.passwordHash || user.disabledAt) return;
  // Preserve deduplication for checkouts processed before durable claim IDs.
  if (await prisma.opsAuditEvent.findFirst({ where: { action: "auth.account_setup.sent", targetId: userId, reason: checkoutSessionId, result: "success" }, select: { id: true } })) return;
  const id = `account-setup:${createHash("sha256").update(checkoutSessionId).digest("hex")}`;
  try {
    await prisma.opsAuditEvent.create({ data: { id, actorId: "stripe_webhook", actorEmail: "stripe-webhook@motivefx.local",
      action: "auth.account_setup.delivery", risk: "LOW", targetType: "user", targetId: userId, reason: checkoutSessionId,
      result: "processing", environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV || "unknown" } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return;
    throw error;
  }
  try {
    const { token, tokenHash } = createPasswordResetToken();
    // Add a separate valid setup token; do not invalidate another checkout,
    // password reset, 2FA challenge or native handoff already in flight.
    await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt: new Date(Date.now() + 60 * 60_000) } });
    const accepted = await sendAccountSetupEmail(user.email, token, id);
    await prisma.opsAuditEvent.update({ where: { id }, data: { result: accepted ? "provider_accepted" : "delivery_unconfirmed" } });
  } catch {
    // The request may have reached the provider. A fresh password-reset request
    // is the recovery path; a webhook retry must not invalidate an accepted link.
    await prisma.opsAuditEvent.update({ where: { id }, data: { result: "delivery_unknown" } });
  }
}

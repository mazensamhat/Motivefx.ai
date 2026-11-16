import { getAppUrl } from "@/lib/stripe";
import { SITE } from "@/lib/site-config";
import { getEmailFrom, getResendApiKey } from "@/lib/email";

/** Secure post-checkout onboarding for users whose Stripe checkout created the account. */
export async function sendAccountSetupEmail(email: string, token: string, idempotencyKey?: string): Promise<boolean> {
  const setupUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      from: getEmailFrom(),
      to: [email],
      subject: "Finish setting up your MotiveFX account",
      html: `
        <p>Your MotiveFX subscription is ready.</p>
        <p><a href="${setupUrl}">Create your password and finish account setup</a></p>
        <p>This secure link expires in 1 hour. If you did not purchase MotiveFX, contact support.</p>
        <p>— MotiveFX · <a href="${SITE.url}">${SITE.url}</a></p>
      `.trim(),
    }),
  });

  if (!res.ok) {
    console.error("[account-setup-email] Provider did not confirm acceptance:", res.status);
    return false;
  }
  return true;
}

import { getAppUrl } from "@/lib/stripe";
import { SITE } from "@/lib/site-config";
import { getEmailFrom, getResendApiKey } from "@/lib/email";

/** Secure post-checkout onboarding for users whose Stripe checkout created the account. */
export async function sendAccountSetupEmail(email: string, token: string): Promise<boolean> {
  const setupUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const apiKey = getResendApiKey();
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[email] Account setup link for ${email}: ${setupUrl}`);
      return true;
    }
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
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
    const body = await res.text().catch(() => "");
    console.error("[account-setup-email] Resend error:", res.status, body);
    return false;
  }
  return true;
}

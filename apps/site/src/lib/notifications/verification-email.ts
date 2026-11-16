import { getEmailFrom, getResendApiKey } from "../email";
import { getAppUrl } from "../stripe";
import { onboardingActive, type VerificationPurpose } from "./onboarding";

export async function sendVerificationEmail(input: { email: string; token: string; tokenHash: string; purpose: VerificationPurpose }, fetcher: typeof fetch = fetch): Promise<"provider_accepted" | "unconfirmed"> {
  if (!onboardingActive()) return "unconfirmed";
  const key = getResendApiKey();
  const app = new URL(getAppUrl());
  if (!key || app.protocol !== "https:") return "unconfirmed";
  const url = new URL("/api/auth/email-verification/confirm", app); url.searchParams.set("token", input.token);
  const subject = input.purpose === "daily_email" ? "Confirm your Motive Daily subscription" : "Verify your MotiveFX email address";
  const message = input.purpose === "daily_email" ? "You asked to receive Motive Daily email. Confirming enables daily research email while your plan includes it. You can unsubscribe at any time." : "You asked to verify this email address for your MotiveFX account. This does not subscribe you to marketing or daily emails.";
  try {
    const response = await fetcher("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `motivefx-verify-${input.tokenHash}` },
      body: JSON.stringify({ from: getEmailFrom(), to: [input.email], subject,
        text: `${message}\n\nConfirm: ${url.href}\n\nThis link expires in 30 minutes. Ignore it if you did not request it.`,
        html: `<p>${message}</p><p><a href="${url.href.replace(/&/g, "&amp;")}">Confirm email address</a></p><p>This link expires in 30 minutes. Ignore it if you did not request it.</p>` }),
    });
    if (!response.ok) return "unconfirmed";
    const result = await response.json() as { id?: unknown };
    return typeof result.id === "string" && result.id ? "provider_accepted" : "unconfirmed";
  } catch { return "unconfirmed"; }
}

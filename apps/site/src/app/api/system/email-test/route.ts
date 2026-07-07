import { badRequest, json, serverError, unauthorized } from "@/lib/api";
import { getEmailConfigStatus, sendTestEmail } from "@/lib/email";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized("Sign in to send a test email.");

  const status = getEmailConfigStatus();
  if (!status.keyConfigured) {
    return badRequest("RESEND_API_KEY is not set on this deployment.");
  }

  try {
    const result = await sendTestEmail(session.email);
    if (!result.ok) {
      return badRequest(`Resend rejected the email: ${result.error}`);
    }
    return json({ ok: true, message: `Test email sent to ${session.email}.` });
  } catch (error) {
    console.error("[system/email-test]", error);
    return serverError("Could not send test email.");
  }
}

import { prisma } from "@motivefx/database";
import { getSession } from "@/lib/session";
import { prepareEmailVerification, sameOriginMutation, onboardingActive } from "@/lib/notifications/onboarding";
import { sendVerificationEmail } from "@/lib/notifications/verification-email";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!onboardingActive()) return Response.json({ error: "Email verification is not active yet." }, { status: 503 });
  if (!sameOriginMutation(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (body?.purpose !== "account" && body?.purpose !== "daily_email") return Response.json({ error: "Invalid verification purpose." }, { status: 400 });
  try {
    const prepared = await prepareEmailVerification(session.id, body.purpose);
    if (prepared.state !== "prepared") {
      const errors = { inactive: "Email verification is not active yet.", unavailable: "This account is unavailable.", not_entitled: "Your current plan does not include Motive Daily email.", suppressed: "Email delivery is suppressed. Contact support before subscribing again.", rate_limited: "Please wait before requesting another link. At most five links can be requested per hour." };
      return Response.json({ state: prepared.state, error: errors[prepared.state] }, { status: prepared.state === "rate_limited" ? 429 : 409 });
    }
    const sendState = await sendVerificationEmail(prepared);
    await prisma.emailVerificationChallenge.update({ where: { tokenHash: prepared.tokenHash }, data: { sendState } });
    // Tokens and email addresses never appear in the API response or logs.
    return Response.json({ state: sendState, message: sendState === "provider_accepted" ? "Check your email to confirm. The link expires in 30 minutes." : "Delivery could not be confirmed. You can request a new link after one minute." }, { status: sendState === "provider_accepted" ? 202 : 503 });
  } catch { return Response.json({ error: "Verification could not be prepared. Please retry later." }, { status: 503 }); }
}

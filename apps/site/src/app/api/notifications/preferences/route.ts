import { prisma } from "@motivefx/database";
import { getSession } from "@/lib/session";
import { emailHash } from "@/lib/notifications/policy";
import { notificationStorageEnabled, notificationSendingEnabled } from "@/lib/notifications/store";
import { emailVerificationEnabled, onboardingActive, revokeNotificationChannel, sameOriginMutation } from "@/lib/notifications/onboarding";
import { planForUser } from "@/lib/terminal/plan";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await getSession(); if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!notificationStorageEnabled()) return Response.json({ state: "inactive", deliveryActive: false, verificationAvailable: false });
  try {
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user || user.disabledAt) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const [consent, verified, devices] = await Promise.all([
      prisma.notificationConsent.findUnique({ where: { userId: user.id } }),
      emailVerificationEnabled() ? prisma.emailVerification.findUnique({ where: { userId: user.id } }) : null,
      prisma.notificationDevice.findMany({ where: { userId: user.id, revokedAt: null }, select: { id: true, platform: true }, take: 10 }),
    ]);
    const hash = emailHash(user.email), plan = planForUser(user);
    const dailyEnabled = !!(consent?.dailyEmailConsentAt && consent.dailyEmailConfirmedAt && consent.confirmedEmailHash === hash && !consent.emailSuppressedAt && (!consent.dailyEmailRevokedAt || consent.dailyEmailRevokedAt < consent.dailyEmailConsentAt));
    return Response.json({ state: "available", deliveryActive: notificationSendingEnabled(), verificationAvailable: onboardingActive(), emailVerified: verified?.emailHash === hash, dailyEligible: !!plan.features.motive_daily_email, pushRegistrationAvailable: process.env.MOTIVE_PUSH_REGISTRATION_ENABLED === "true" && !!plan.features.push_notifications, dailyEnabled, emailSuppressed: !!consent?.emailSuppressedAt, devices }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ state: "unavailable", error: "Preferences are temporarily unavailable." }, { status: 503 }); }
}
export async function POST(request: Request) {
  const session = await getSession(); if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOriginMutation(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (body?.enabled !== false || !["daily_email", "expo_push"].includes(body?.channel)) return Response.json({ error: "Opt-in requires explicit email confirmation or native device permission." }, { status: 400 });
  try { const saved = await revokeNotificationChannel(session.id, body.channel); return Response.json({ saved }, { status: saved ? 200 : 503 }); }
  catch { return Response.json({ error: "Preferences could not be saved." }, { status: 503 }); }
}

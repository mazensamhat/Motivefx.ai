import { prisma } from "@motivefx/database";
import { emailHash } from "@/lib/notifications/policy";
import { notificationStorageEnabled } from "@/lib/notifications/store";
import { readUnsubscribeToken } from "@/lib/notifications/unsubscribe";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Link scanners must not change consent. Human GET offers an explicit form;
  // RFC 8058 one-click clients use POST with the signed URL directly.
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!readUnsubscribeToken(token, process.env.AUTH_SECRET?.trim() ?? "")) return new Response("Invalid unsubscribe link.", { status: 400 });
  const action = `/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
  return new Response(`<!doctype html><html lang="en"><head><title>Motive Daily preferences</title></head><body><h1>Unsubscribe from Motive Daily</h1><p>Stop future daily emails. Account and billing messages are unaffected.</p><form method="post" action="${action}"><button type="submit">Unsubscribe</button></form></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

export async function POST(request: Request) {
  if (!notificationStorageEnabled()) return Response.json({ error: "Notification preferences are not activated." }, { status: 503 });
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const claims = readUnsubscribeToken(token, process.env.AUTH_SECRET?.trim() ?? "");
  if (!claims) return Response.json({ error: "Invalid unsubscribe link." }, { status: 400 });
  try {
    await prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: claims.userId }, select: { email: true } });
      if (!user || emailHash(user.email) !== claims.emailHash) return;
      const revokedAt = new Date();
      await tx.notificationConsent.upsert({ where: { userId: claims.userId }, create: { userId: claims.userId, dailyEmailRevokedAt: revokedAt }, update: { dailyEmailRevokedAt: revokedAt } });
      await tx.notificationDelivery.updateMany({ where: { userId: claims.userId, channel: "daily_email", state: { in: ["queued", "retry"] } }, data: { state: "suppressed", lastCode: "consent_revoked" } });
    });
    return Response.json({ ok: true, message: "Motive Daily email is unsubscribed." }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Preferences could not be saved. Please retry." }, { status: 503 }); }
}

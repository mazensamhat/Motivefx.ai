import { prisma } from "@motivefx/database";
import { getSession } from "@/lib/session";
import { notificationStorageEnabled } from "@/lib/notifications/store";
import { registerPushDevice, sameOriginMutation } from "@/lib/notifications/onboarding";
export async function POST(request: Request) {
  const session = await getSession(); if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOriginMutation(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.token !== "string" || typeof body.platform !== "string" || typeof body.permission !== "string") return Response.json({ error: "Invalid device registration." }, { status: 400 });
  try { const result = await registerPushDevice(session.id, body); return Response.json(result, { status: result.state === "registered" ? 200 : result.state === "inactive" ? 503 : 409 }); }
  catch { return Response.json({ error: "Device registration could not be saved." }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  const session = await getSession(); if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOriginMutation(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (!notificationStorageEnabled()) return Response.json({ error: "Device preferences are inactive." }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (typeof body?.deviceId !== "string" || !body.deviceId || body.deviceId.length > 200) return Response.json({ error: "Invalid device." }, { status: 400 });
  try {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${session.id} FOR UPDATE`;
      await tx.notificationDevice.updateMany({ where: { id: body.deviceId, userId: session.id }, data: { revokedAt: new Date() } });
      await tx.notificationDelivery.updateMany({ where: { userId: session.id, targetRef: body.deviceId, channel: "expo_push", state: { in: ["queued", "retry"] } }, data: { state: "suppressed", lastCode: "device_revoked" } });
    });
    return Response.json({ revoked: true });
  } catch { return Response.json({ error: "Device revocation could not be saved." }, { status: 503 }); }
}

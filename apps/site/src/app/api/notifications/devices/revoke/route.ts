import { prisma } from "@motivefx/database";
import { notificationStorageEnabled } from "@/lib/notifications/store";
import { readDeviceRevocationToken } from "@/lib/notifications/device-revocation";
export async function POST(request: Request) {
  if (!notificationStorageEnabled()) return Response.json({ error: "Device preferences are inactive." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const claims = typeof body?.token === "string" ? readDeviceRevocationToken(body.token, process.env.AUTH_SECRET?.trim() ?? "") : null;
  if (!claims) return Response.json({ error: "Invalid device revocation." }, { status: 400 });
  try {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${claims.userId} FOR UPDATE`;
      await tx.notificationDevice.updateMany({ where: { id: claims.deviceId, userId: claims.userId }, data: { revokedAt: new Date() } });
      await tx.notificationDelivery.updateMany({ where: { userId: claims.userId, targetRef: claims.deviceId, channel: "expo_push", state: { in: ["queued", "retry"] } }, data: { state: "suppressed", lastCode: "device_revoked" } });
    });
    return Response.json({ revoked: true });
  } catch { return Response.json({ error: "Device revocation could not be saved." }, { status: 503 }); }
}

import { createHmac, timingSafeEqual } from "node:crypto";
const CONTEXT = "motivefx-device-revoke-v1:";
export function createDeviceRevocationToken(userId: string, deviceId: string, secret: string) {
  if (secret.length < 32 || !userId || !deviceId || userId.length > 200 || deviceId.length > 200) throw new Error("Device revocation signing unavailable");
  const payload = Buffer.from(JSON.stringify({ sub: userId, device: deviceId })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(CONTEXT + payload).digest("base64url")}`;
}
/** This capability can only revoke one owned device. It cannot sign in, inspect
 * preferences, subscribe, transfer ownership or send a notification. */
export function readDeviceRevocationToken(token: string, secret: string): { userId: string; deviceId: string } | null {
  if (secret.length < 32 || token.length > 1500) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if ( !/^[A-Za-z0-9_-]+$/.test(payload ?? "") || !/^[A-Za-z0-9_-]{43}$/.test(signature ?? "")) return null;
  try {
    const supplied = Buffer.from(signature!, "base64url"), expected = createHmac("sha256", secret).update(CONTEXT + payload).digest();
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const value = JSON.parse(Buffer.from(payload!, "base64url").toString());
    return typeof value.sub === "string" && value.sub.length > 0 && value.sub.length <= 200 && typeof value.device === "string" && value.device.length > 0 && value.device.length <= 200 ? { userId: value.sub, deviceId: value.device } : null;
  } catch { return null; }
}

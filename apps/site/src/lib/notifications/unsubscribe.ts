import { createHmac, timingSafeEqual } from "node:crypto";

const CONTEXT = "motivefx-notification-unsubscribe-v1:";
export function createUnsubscribeToken(userId: string, addressHash: string, secret: string): string {
  if (secret.length < 32 || !userId || !/^[a-f0-9]{64}$/.test(addressHash)) throw new Error("Unsubscribe signing configuration invalid");
  const payload = Buffer.from(JSON.stringify({ sub: userId, email: addressHash })).toString("base64url");
  const signature = createHmac("sha256", secret).update(CONTEXT + payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readUnsubscribeToken(token: string, secret: string): { userId: string; emailHash: string } | null {
  if (secret.length < 32 || token.length > 1500) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
  try {
    const expected = createHmac("sha256", secret).update(CONTEXT + payload).digest();
    const provided = Buffer.from(signature, "base64url");
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown; email?: unknown };
    return typeof claims.sub === "string" && claims.sub.length > 0 && claims.sub.length <= 200 &&
      typeof claims.email === "string" && /^[a-f0-9]{64}$/.test(claims.email)
      ? { userId: claims.sub, emailHash: claims.email } : null;
  } catch { return null; }
}

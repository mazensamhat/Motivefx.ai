import { SignJWT, jwtVerify } from "jose";

const PENDING_2FA_DURATION = 60 * 10;

function getSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createPending2faToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: "pending_2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_2FA_DURATION}s`)
    .sign(getSecret());
}

export async function verifyPending2faToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret());
  if (payload.type !== "pending_2fa" || typeof payload.sub !== "string") {
    throw new Error("Invalid or expired verification token.");
  }
  return payload.sub;
}

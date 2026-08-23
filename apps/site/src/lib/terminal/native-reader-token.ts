/**
 * G3 Native Reader Token — short-lived server-signed credential.
 * User-Agent may still hint UI mode; it must not alone grant access.
 */

import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";

const TTL_SEC = 15 * 60; // 15 minutes
const ISSUER = "motivefx-native-reader";

export type NativeReaderClaims = {
  channel: "app_store" | "play_store";
  platform: "ios" | "android";
  appVersion: string;
  readerMode: true;
  nonce: string;
};

function secretKey(): Uint8Array {
  const raw =
    process.env.NATIVE_READER_TOKEN_SECRET?.trim() ||
    process.env.JWT_SECRET_KEY?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "";
  if (!raw || raw.length < 16) {
    // Deterministic fallback for local only — production must set NATIVE_READER_TOKEN_SECRET
    return new TextEncoder().encode("motivefx-dev-native-reader-insecure");
  }
  return new TextEncoder().encode(raw);
}

export function nativeReaderSecretConfigured(): boolean {
  const raw =
    process.env.NATIVE_READER_TOKEN_SECRET?.trim() ||
    process.env.JWT_SECRET_KEY?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "";
  return raw.length >= 16;
}

export async function issueNativeReaderToken(
  claims: Omit<NativeReaderClaims, "readerMode" | "nonce"> & { nonce?: string }
): Promise<{ token: string; expiresAt: string; expiresInSec: number }> {
  const nonce = claims.nonce ?? randomBytes(12).toString("hex");
  const expiresInSec = TTL_SEC;
  const token = await new SignJWT({
    channel: claims.channel,
    platform: claims.platform,
    appVersion: claims.appVersion,
    readerMode: true,
    nonce,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSec}s`)
    .setJti(createHash("sha256").update(nonce).digest("hex").slice(0, 24))
    .sign(secretKey());

  return {
    token,
    expiresAt: new Date(Date.now() + expiresInSec * 1000).toISOString(),
    expiresInSec,
  };
}

export async function verifyNativeReaderToken(
  token: string | null | undefined
): Promise<NativeReaderClaims | null> {
  if (!token?.trim()) return null;
  try {
    const { payload } = await jwtVerify(token.trim(), secretKey(), {
      issuer: ISSUER,
      algorithms: ["HS256"],
    });
    if (payload.readerMode !== true) return null;
    if (payload.platform !== "ios" && payload.platform !== "android") return null;
    if (payload.channel !== "app_store" && payload.channel !== "play_store") return null;
    return {
      channel: payload.channel,
      platform: payload.platform,
      appVersion: String(payload.appVersion ?? "unknown"),
      readerMode: true,
      nonce: String(payload.nonce ?? ""),
    };
  } catch {
    return null;
  }
}

export function readNativeReaderTokenFromRequest(request: Request): string | null {
  const hdr = request.headers.get("x-motivefx-native-reader")?.trim();
  if (hdr) return hdr;
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer mfxnr_")) {
    return auth.slice("bearer ".length).trim();
  }
  return null;
}

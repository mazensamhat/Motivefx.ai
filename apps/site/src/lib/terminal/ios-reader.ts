import type { TerminalPlan } from "./plan";
import { iosAppStoreReaderPlan, planForUser } from "./plan";
import type { User } from "@prisma/client";
import { headers } from "next/headers";
import {
  readNativeReaderTokenFromRequest,
  verifyNativeReaderToken,
} from "./native-reader-token";

/**
 * MotiveFX iOS App Store shell.
 * G3: Prefer short-lived Native Reader Token. UA alone must not grant entitlements
 * when NATIVE_READER_REQUIRE_TOKEN=true (strict). Default: token OR legacy UA for
 * free-reader *plan clamp* only (never paid unlock).
 */
export function isNativeIosAppStoreRequest(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return /MotiveFXNative/i.test(ua) && /\(iOS/i.test(ua);
}

export function isNativeIosAppStoreUserAgent(ua: string | null | undefined): boolean {
  const value = ua ?? "";
  return /MotiveFXNative/i.test(value) && /\(iOS/i.test(value);
}

export async function isTrustedNativeReaderRequest(request: Request): Promise<boolean> {
  const token = readNativeReaderTokenFromRequest(request);
  const claims = await verifyNativeReaderToken(token);
  if (claims?.readerMode) return true;

  const requireToken =
    (process.env.NATIVE_READER_REQUIRE_TOKEN ?? "").trim().toLowerCase() === "true" ||
    (process.env.NATIVE_READER_REQUIRE_TOKEN ?? "").trim() === "1";

  if (requireToken) return false;

  /* Legacy bootstrap: UA may identify the shell for free-reader clamp only. */
  return isNativeIosAppStoreRequest(request);
}

/**
 * Entitlements for the iOS App Store binary.
 * Always returns the free-reader plan so web subscriptions never unlock exclusive iOS digital content.
 */
export async function planForRequest(
  request: Request,
  user: User | null | undefined
): Promise<TerminalPlan | null> {
  if (await isTrustedNativeReaderRequest(request)) {
    return iosAppStoreReaderPlan();
  }
  if (!user) return null;
  return planForUser(user);
}

/**
 * Prefer this in App Router handlers that call planForUser(session.user).
 * Reads Native Reader Token (preferred) or legacy UA so web/Stripe paid flags
 * never unlock exclusive digital content inside the iOS App Store shell.
 */
export async function entitlementsPlanForUser(user: User): Promise<TerminalPlan> {
  try {
    const h = await headers();
    const token = h.get("x-motivefx-native-reader");
    if (token) {
      const claims = await verifyNativeReaderToken(token);
      if (claims?.readerMode && claims.platform === "ios") {
        return iosAppStoreReaderPlan();
      }
    }
    const requireToken =
      (process.env.NATIVE_READER_REQUIRE_TOKEN ?? "").trim().toLowerCase() === "true" ||
      (process.env.NATIVE_READER_REQUIRE_TOKEN ?? "").trim() === "1";
    if (!requireToken && isNativeIosAppStoreUserAgent(h.get("user-agent"))) {
      return iosAppStoreReaderPlan();
    }
  } catch {
    /* not in a request context (scripts / tests) */
  }
  return planForUser(user);
}

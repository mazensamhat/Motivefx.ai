import type { TerminalPlan } from "./plan";
import { iosAppStoreReaderPlan, planForUser } from "./plan";
import type { User } from "@prisma/client";
import { headers } from "next/headers";

/**
 * MotiveFX iOS App Store shell (Expo WebView userAgent).
 * Free informational reader — market tabs must stay viewable without paid unlock.
 */
export function isNativeIosAppStoreRequest(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return /MotiveFXNative/i.test(ua) && /\(iOS/i.test(ua);
}

export function isNativeIosAppStoreUserAgent(ua: string | null | undefined): boolean {
  const value = ua ?? "";
  return /MotiveFXNative/i.test(value) && /\(iOS/i.test(value);
}

/**
 * Entitlements for the iOS App Store binary.
 * Always returns the free-reader plan so web subscriptions never unlock exclusive iOS digital content.
 */
export function planForRequest(request: Request, user: User | null | undefined): TerminalPlan | null {
  if (isNativeIosAppStoreRequest(request)) {
    return iosAppStoreReaderPlan();
  }
  if (!user) return null;
  return planForUser(user);
}

/**
 * Prefer this in App Router handlers that call planForUser(session.user).
 * Reads the incoming User-Agent via next/headers so web/Stripe paid flags
 * never unlock exclusive digital content inside the iOS App Store shell.
 */
export async function entitlementsPlanForUser(user: User): Promise<TerminalPlan> {
  try {
    const h = await headers();
    if (isNativeIosAppStoreUserAgent(h.get("user-agent"))) {
      return iosAppStoreReaderPlan();
    }
  } catch {
    /* not in a request context (scripts / tests) */
  }
  return planForUser(user);
}
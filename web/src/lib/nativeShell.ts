/** Detect Expo WebView shell (see mobile TerminalScreen userAgent). */
export function isNativeShell(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MotiveFXNative/i.test(navigator.userAgent);
}

/** True when the native shell injected RevenueCat / store billing availability. */
export function isNativeIapAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.__MOTIVEFX_NATIVE_IAP__);
}

const PRICING_URL = "https://www.motivefxai.com/pricing";

function isBillingOrCheckoutUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes("stripe.com") || host.includes("checkout.stripe.com")) return true;
    const path = `${u.pathname}${u.search}`.toLowerCase();
    return (
      path.includes("/pricing") ||
      path.includes("/checkout") ||
      path.includes("/billing") ||
      path.includes("/api/subscription/checkout") ||
      path.includes("/api/billing") ||
      path.includes("module-checkout") ||
      path.includes("tier-checkout") ||
      path.includes("annual-checkout")
    );
  } catch {
    return false;
  }
}

function postNative(msg: Record<string, unknown>): boolean {
  if (!isNativeShell() || typeof window === "undefined" || !window.ReactNativeWebView?.postMessage) {
    return false;
  }
  window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  return true;
}

/**
 * Ask the native shell to open a URL outside the WebView.
 * Billing / pricing URLs are blocked in the native shell (store payments policy).
 */
export function openExternalUrl(url: string): void {
  const target = url || PRICING_URL;
  if (isNativeShell() && isBillingOrCheckoutUrl(target)) {
    window.dispatchEvent(
      new CustomEvent("motivefx-iap", {
        detail: {
          type: "iap_result",
          ok: false,
          error:
            "Web checkout is not available inside the app. Digital subscriptions use store billing when configured.",
        },
      })
    );
    return;
  }
  if (postNative({ type: "motivefx:open-external", url: target })) return;
  if (typeof window !== "undefined") {
    window.open(target, "_blank", "noopener,noreferrer");
  }
}

/**
 * Subscribe / manage billing from the native shell.
 * Never steers to web pricing when embedded in the app (Play / App Store payments).
 */
export function openExternalSubscribe(): void {
  if (isNativeShell()) {
    if (isNativeIapAvailable()) {
      // Prefer native purchase for Lite as a default entry; UI passes the real tier.
      requestNativeIapPurchase("lite");
      return;
    }
    window.dispatchEvent(
      new CustomEvent("motivefx-iap", {
        detail: {
          type: "iap_result",
          ok: false,
          error:
            "Store billing is not configured in this app build. Existing plan access still works when you sign in.",
        },
      })
    );
    return;
  }
  openExternalUrl(PRICING_URL);
}

/**
 * Start store purchase via native RevenueCat bridge.
 * Returns false if native IAP is unavailable (caller must NOT fall back to web checkout in-app).
 */
export function requestNativeIapPurchase(tier: string, userId?: string | null): boolean {
  if (!isNativeIapAvailable()) return false;
  return postNative({
    type: "iap_purchase",
    tier,
    userId: userId || undefined,
  });
}

/** Restore store purchases via native bridge. */
export function requestNativeIapRestore(userId?: string | null): boolean {
  if (!isNativeIapAvailable()) return false;
  return postNative({
    type: "iap_restore",
    userId: userId || undefined,
  });
}

/** Tell native shell the logged-in user id for RevenueCat logIn. */
export function notifyNativeSession(userId: string): void {
  postNative({ type: "session", userId });
}

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    __MOTIVEFX_NATIVE_IAP__?: boolean;
  }
}

/** Detect Expo WebView shell (see mobile TerminalScreen userAgent + injected flags). */
export function isNativeShell(): boolean {
  if (typeof window !== "undefined") {
    if (window.__MOTIVEFX_NATIVE_PLATFORM__) return true;
    if (typeof document !== "undefined" && document.documentElement.classList.contains("motivefx-native-shell")) {
      return true;
    }
  }
  if (typeof navigator === "undefined") return false;
  return /MotiveFXNative/i.test(navigator.userAgent);
}

/** True only for the Expo Android WebView shell used for Google Play builds. */
export function isNativeAndroidShell(): boolean {
  if (!isNativeShell()) return false;
  if (typeof window !== "undefined" && window.__MOTIVEFX_NATIVE_PLATFORM__) {
    return window.__MOTIVEFX_NATIVE_PLATFORM__ === "android";
  }
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

/**
 * True for the Expo iOS WebView shell used for App Store builds (Path B free reader).
 *
 * Important: do not require MotiveFXNative in the UA *and* platform===ios only.
 * Some WebViews strip or rewrite custom UA; the native shell always injects
 * __MOTIVEFX_NATIVE_PLATFORM__ and/or the motivefx-native-shell class.
 * Any native shell that is not Android is treated as the iOS free reader.
 */
export function isNativeIosShell(): boolean {
  if (!isNativeShell()) return false;
  if (isNativeAndroidShell()) return false;
  if (typeof window !== "undefined" && window.__MOTIVEFX_NATIVE_PLATFORM__) {
    if (window.__MOTIVEFX_NATIVE_PLATFORM__ === "android") return false;
    if (window.__MOTIVEFX_NATIVE_PLATFORM__ === "ios") return true;
  }
  if (typeof navigator !== "undefined") {
    if (/Android/i.test(navigator.userAgent)) return false;
    if (/iPhone|iPad|iPod|\(iOS/i.test(navigator.userAgent)) return true;
  }
  // MotiveFXNative / injected shell without Android → App Store free reader.
  return true;
}

/** Mark <html> for CSS belt-and-suspenders (hide ModuleGate padlocks on iOS). */
export function syncNativeShellDocumentClass(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isNativeShell()) root.classList.add("motivefx-native-shell");
  if (isNativeIosShell()) root.classList.add("motivefx-ios-reader");
  else root.classList.remove("motivefx-ios-reader");
  if (isNativeAndroidShell()) root.classList.add("motivefx-android-shell");
  else root.classList.remove("motivefx-android-shell");
}

/** True when the native shell injected RevenueCat / store billing availability. */
export function isNativeIapAvailable(): boolean {
  if (typeof window === "undefined") return false;
  // iOS free-reader path: never treat IAP as available until ASC products are live.
  if (isNativeIosShell()) return false;
  return Boolean(window.__MOTIVEFX_NATIVE_IAP__);
}

const WEB_PRICING_URL = "https://www.motivefxai.com/pricing";

function isBillingOrCheckoutUrl(url: string): boolean {
  try {
    const u = new URL(url, "https://www.motivefxai.com");
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

function billingBlockedMessage(): string {
  if (isNativeIosShell()) {
    return "This iOS app is a free informational reader. Purchases and subscriptions are not available in the app.";
  }
  return "Web checkout is not available inside the app. Digital subscriptions use store billing when configured.";
}

/**
 * Ask the native shell to open a URL outside the WebView.
 * Billing / pricing URLs are blocked in the native shell (store payments policy).
 * Empty/missing URLs are a no-op — never default to web pricing.
 */
export function openExternalUrl(url: string): void {
  const target = (url || "").trim();
  if (!target) return;
  if (isNativeShell() && isBillingOrCheckoutUrl(target)) {
    window.dispatchEvent(
      new CustomEvent("motivefx-iap", {
        detail: {
          type: "iap_result",
          ok: false,
          error: billingBlockedMessage(),
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
          error: isNativeIosShell()
            ? "This iOS app is a free informational reader. Purchases are not available in the app."
            : "Store billing is not configured in this app build. Existing plan access still works when you sign in.",
        },
      })
    );
    return;
  }
  // Browser-only: marketing pricing page. Never used from MotiveFXNative.
  openExternalUrl(WEB_PRICING_URL);
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
    __MOTIVEFX_NATIVE_PLATFORM__?: "android" | "ios" | "web" | string;
  }
}

/** Detect Expo WebView shell (see mobile TerminalScreen userAgent). */
export function isNativeShell(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MotiveFXNative/i.test(navigator.userAgent);
}

/** True when the native shell injected RevenueCat / StoreKit availability. */
export function isNativeIapAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.__MOTIVEFX_NATIVE_IAP__);
}

const PRICING_URL = "https://www.motivefxai.com/pricing";

function postNative(msg: Record<string, unknown>): boolean {
  if (!isNativeShell() || typeof window === "undefined" || !window.ReactNativeWebView?.postMessage) {
    return false;
  }
  window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  return true;
}

/**
 * Ask the native shell to open a URL in Safari/Chrome (outside the WebView).
 * Falls back to window.open when not embedded.
 */
export function openExternalUrl(url: string): void {
  const target = url || PRICING_URL;
  if (postNative({ type: "motivefx:open-external", url: target })) return;
  if (typeof window !== "undefined") {
    window.open(target, "_blank", "noopener,noreferrer");
  }
}

/** External subscribe / manage billing — never start Stripe Checkout inside the native WebView. */
export function openExternalSubscribe(): void {
  openExternalUrl(PRICING_URL);
}

/**
 * Start App Store purchase via native RevenueCat bridge.
 * Returns false if native IAP is unavailable (caller should fall back to Safari).
 */
export function requestNativeIapPurchase(tier: string, userId?: string | null): boolean {
  if (!isNativeIapAvailable()) return false;
  return postNative({
    type: "iap_purchase",
    tier,
    userId: userId || undefined,
  });
}

/** Restore App Store purchases via native bridge. */
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

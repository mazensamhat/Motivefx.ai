/** Detect Expo WebView shell (see mobile TerminalScreen userAgent). */
export function isNativeShell(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MotiveFXNative/i.test(navigator.userAgent);
}

const PRICING_URL = "https://www.motivefxai.com/pricing";

/**
 * Ask the native shell to open a URL in Safari/Chrome (outside the WebView).
 * Falls back to window.open when not embedded.
 */
export function openExternalUrl(url: string): void {
  const target = url || PRICING_URL;
  if (isNativeShell() && typeof window !== "undefined" && window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: "motivefx:open-external", url: target })
    );
    return;
  }
  if (typeof window !== "undefined") {
    window.open(target, "_blank", "noopener,noreferrer");
  }
}

/** External subscribe / manage billing — never start Stripe Checkout inside the native WebView. */
export function openExternalSubscribe(): void {
  openExternalUrl(PRICING_URL);
}

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

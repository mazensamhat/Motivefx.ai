import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE, TERMINAL_URL, WEB_BASE } from "../config";
import { getAccessToken, getRefreshToken, getUserId } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import {
  configureIap,
  extractTransactionId,
  isIapConfigured,
  isValidTier,
  purchaseTier,
  restorePurchases,
  type IntelligenceTierId,
} from "../iap";

type ShouldStartLoadRequest = {
  url: string;
  isTopFrame?: boolean;
};

type WebViewComponent = typeof import("react-native-webview").WebView;

type NativeMsg = {
  type: string;
  tier?: string;
  userId?: string;
  url?: string;
};

const VIEWPORT_LOCK_SCRIPT = `
  (function () {
    try {
      // Native AgeGateScreen already passed — skip duplicate WebView age gate.
      localStorage.setItem("motivefx_age_verified", "1");
      document.documentElement.classList.add("motivefx-native-shell");
      window.__MOTIVEFX_NATIVE_IAP__ = ${Platform.OS === "ios" ? "false" : isIapConfigured() ? "true" : "false"};
      window.__MOTIVEFX_NATIVE_PLATFORM__ = ${jsStringLiteral(Platform.OS)};
      var content = "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover";
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        var metaEl = document.createElement("meta");
        metaEl.setAttribute("name", "viewport");
        if (document.head) document.head.appendChild(metaEl);
        meta = metaEl;
      }
      if (meta) meta.setAttribute("content", content);
      // Belt-and-suspenders scroll fix for Android WebView reviewers.
      // Terminal uses nested .app-content scroll; Ops/legal/account pages do not —
      // without doc-scroll mode, body overflow:hidden traps touch (Z Fold / Play class bug).
      if (!document.getElementById("motivefx-native-scroll-fix")) {
        var style = document.createElement("style");
        style.id = "motivefx-native-scroll-fix";
        style.textContent = [
          "html.motivefx-native-shell,html.motivefx-native-shell body{height:100%!important;overflow:hidden!important;padding:0!important;margin:0!important;}",
          "html.motivefx-native-shell #root,html.motivefx-native-shell .app{height:100%!important;min-height:0!important;overflow:hidden!important;display:flex;flex-direction:column;}",
          "html.motivefx-native-shell .app-body{flex:1 1 auto;min-height:0!important;overflow:hidden!important;}",
          "html.motivefx-native-shell .app-content{flex:1 1 auto;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch;touch-action:pan-y;}",
          "html.motivefx-native-shell .workspace-header{padding-top:0!important;margin-top:0!important;}",
          "html.motivefx-native-shell.motivefx-native-doc-scroll,html.motivefx-native-shell.motivefx-native-doc-scroll body{height:auto!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;overscroll-behavior-y:auto;}",
          "html.motivefx-native-shell.motivefx-native-doc-scroll .admin-shell,html.motivefx-native-shell.motivefx-native-doc-scroll .legal-page,html.motivefx-native-shell.motivefx-native-doc-scroll .app-layout{touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;}",
          // iOS free reader (2.1b / 3.1.1): hide purchase / subscription UI in WebView.
          ${
            Platform.OS === "ios"
              ? `"html.motivefx-native-shell .tier-pricing,html.motivefx-native-shell .pricing-terminal,html.motivefx-native-shell .native-companion-billing,html.motivefx-native-shell .billing-fine-print,html.motivefx-native-shell .simulation-banner-cta,html.motivefx-native-shell .win-hook-modal,html.motivefx-native-shell .win-hook-cta-v2,html.motivefx-native-shell .feature-gate,html.motivefx-native-shell .module-pricing,html.motivefx-native-shell a[href*='/pricing'],html.motivefx-native-shell a[href*='checkout'],html.motivefx-native-shell .btn-annual-cta:not(.btn-age-gate-continue){display:none!important;}",`
              : ""
          }
        ].join("");
        (document.head || document.documentElement).appendChild(style);
      }
      function syncNativeScrollMode() {
        var nested = document.querySelector(".app-content");
        document.documentElement.classList.toggle("motivefx-native-doc-scroll", !nested);
      }
      syncNativeScrollMode();
      if (!window.__MOTIVEFX_NATIVE_SCROLL_OBS__) {
        window.__MOTIVEFX_NATIVE_SCROLL_OBS__ = true;
        var scrollSyncQueued = false;
        function queueNativeScrollSync() {
          if (scrollSyncQueued) return;
          scrollSyncQueued = true;
          requestAnimationFrame(function () {
            scrollSyncQueued = false;
            syncNativeScrollMode();
          });
        }
        try {
          var obs = new MutationObserver(queueNativeScrollSync);
          obs.observe(document.documentElement, { childList: true, subtree: true });
        } catch (obsErr) {}
        document.addEventListener("DOMContentLoaded", syncNativeScrollMode);
        window.addEventListener("pageshow", syncNativeScrollMode);
      }
    } catch (e) {}
    true;
  })();
`;

function jsStringLiteral(value: string | null): string {
  if (value == null) return "null";
  return `'${value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")}'`;
}

function buildAuthInjectionScript(
  accessToken: string | null,
  refreshToken: string | null,
  userId: string | null
): string {
  return `
    (function () {
      try {
        var accessToken = ${jsStringLiteral(accessToken)};
        var refreshToken = ${jsStringLiteral(refreshToken)};
        var userId = ${jsStringLiteral(userId)};
        if (accessToken) localStorage.setItem("motivefx_access_token", accessToken);
        if (refreshToken) localStorage.setItem("motivefx_refresh_token", refreshToken);
        if (userId) localStorage.setItem("motivefx_user_id", userId);
        // Native age gate already passed — skip duplicate WebView age gate (AppAgeGate localStorage key).
        localStorage.setItem("motivefx_age_verified", "1");
        window.__MOTIVEFX_NATIVE_IAP__ = ${Platform.OS === "ios" ? "false" : isIapConfigured() ? "true" : "false"};
        window.__MOTIVEFX_NATIVE_PLATFORM__ = ${jsStringLiteral(Platform.OS)};
      } catch (e) {}
      true;
    })();
  `;
}

function isAllowedOrigin(url: string): boolean {
  try {
    const u = new URL(url);
    const allowed = [WEB_BASE, "https://www.motivefxai.com", "https://motivefxai.com"];
    return allowed.some((base) => {
      try {
        return u.origin === new URL(base).origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/** Paths that must never run Stripe/web checkout inside the WebView (App Store 3.1.1). */
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

/** Web routes that leave the terminal SPA and often render blank / wrong in the shell. */
function isOffTerminalShellUrl(url: string): "auth" | "admin" | "app" | null {
  try {
    const u = new URL(url);
    if (!isAllowedOrigin(url)) return null;
    const path = u.pathname.toLowerCase().replace(/\/+$/, "") || "/";
    if (path === "/login" || path === "/register" || path.startsWith("/login/") || path.startsWith("/register/")) {
      return "auth";
    }
    if (path === "/admin" || path.startsWith("/admin/")) return "admin";
    if (path === "/app" || path.startsWith("/app/")) return "app";
    return null;
  } catch {
    return null;
  }
}

export function TerminalScreen({
  onRequestDeleteAccount,
  onRequestSignIn,
}: {
  onRequestDeleteAccount?: () => void;
  /** iOS guest: open native AuthScreen without blocking market insights. */
  onRequestSignIn?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { logout, isAuthenticated } = useAuth();
  const [WebView, setWebView] = useState<WebViewComponent | null>(null);
  const [phase, setPhase] = useState<"boot" | "ready" | "failed">("boot");
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [injection, setInjection] = useState(VIEWPORT_LOCK_SCRIPT);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webViewKey, setWebViewKey] = useState(0);
  const [iapBusy, setIapBusy] = useState(false);
  const [iapBanner, setIapBanner] = useState<string | null>(null);
  const webRef = useRef<{ reload?: () => void; injectJavaScript?: (js: string) => void } | null>(
    null
  );
  const appUserIdRef = useRef<string | null>(null);
  const loadWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadWatchdog = useCallback(() => {
    if (loadWatchdogRef.current) {
      clearTimeout(loadWatchdogRef.current);
      loadWatchdogRef.current = null;
    }
  }, []);

  /* If the page never finishes loading, show a recoverable error — never leave
     an infinite black WebView with no chrome (App Store 2.1 Completeness). */
  const armLoadWatchdog = useCallback(() => {
    clearLoadWatchdog();
    loadWatchdogRef.current = setTimeout(() => {
      setLoading(false);
      setHasLoadedOnce(false);
      setError("Terminal is taking too long to load. Check your connection and tap Retry.");
      setPhase("failed");
    }, 15_000);
  }, [clearLoadWatchdog]);

  useEffect(() => clearLoadWatchdog, [clearLoadWatchdog]);

  // Do NOT configure RevenueCat / Play Billing on cold start — that native
  // path has caused Play "app not responding" reviews. Defer until terminal loads.

  // Load WebView module as soon as Terminal mounts (Auth screen never imports it).
  useEffect(() => {
    let cancelled = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("react-native-webview") as typeof import("react-native-webview");
      if (!cancelled) setWebView(() => mod.WebView);
    } catch (e) {
      console.warn("WebView module failed to load", e);
      if (!cancelled) {
        setError("WebView unavailable on this device.");
        setPhase("failed");
        setLoading(false);
      }
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const prepareSession = useCallback(async () => {
    setPhase("boot");
    setLoading(true);
    setError(null);
    try {
      const [accessToken, refreshToken, userId] = await Promise.all([
        getAccessToken(),
        getRefreshToken(),
        getUserId(),
      ]);
      if (userId) {
        appUserIdRef.current = userId;
        // Defer IAP — never await billing SDK during first paint.
      }
      setInjection(
        `${buildAuthInjectionScript(accessToken, refreshToken, userId)}\n${VIEWPORT_LOCK_SCRIPT}`
      );

      // Prefer cookie handoff URL so middleware does not force ?demo=1 (which unlocks
      // every module client-side and can race native-shell purchase gating).
      // iOS guest browse (5.1.1(v)): load demo/read-only terminal without an account.
      const terminalPath = "/terminal";
      const terminalBase = TERMINAL_URL.replace(/\/$/, "") || `${WEB_BASE}/terminal`;
      const uri = accessToken
        ? `${API_BASE}/auth/native-handoff?token=${encodeURIComponent(accessToken)}&next=${encodeURIComponent(terminalPath)}`
        : Platform.OS === "ios"
          ? `${terminalBase}?demo=1`
          : terminalBase;
      setHasLoadedOnce(false);
      setSourceUri(uri);
      setPhase("ready");
      // Keep the branded loader until WebView onLoadEnd — clearing here caused a
      // full-screen black gap (App Store 2.1 blank-screen rejection).
      setLoading(true);
      armLoadWatchdog();

      // Best-effort cookie refresh in background (Set-Cookie on fetch; WebView may ignore).
      if (accessToken) {
        void (async () => {
          try {
            await fetch(`${API_BASE}/auth/native-handoff`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });
          } catch (e) {
            console.warn("native-handoff skipped", e);
          }
        })();
      }
    } catch (e) {
      console.warn("prepareSession failed", e);
      setError(e instanceof Error ? e.message : "Could not prepare terminal session");
      setPhase("failed");
      setLoading(false);
    }
  }, [armLoadWatchdog]);

  useEffect(() => {
    void prepareSession();
  }, [prepareSession]);

  const notifyWeb = useCallback((payload: Record<string, unknown>) => {
    const js = `
      (function(){
        try {
          window.dispatchEvent(new CustomEvent("motivefx-iap", { detail: ${JSON.stringify(payload)} }));
        } catch (e) {}
        true;
      })();
    `;
    webRef.current?.injectJavaScript?.(js);
  }, []);

  const syncAppleToServer = useCallback(
    (opts: {
      originalTransactionId: string;
      productId?: string | null;
      tier?: string | null;
      revenueCatAppUserId?: string | null;
    }) => {
      const syncJs = `
        (async function(){
          try {
            var res = await fetch("/api/subscription/apple", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                action: "activate",
                originalTransactionId: ${JSON.stringify(opts.originalTransactionId)},
                productId: ${JSON.stringify(opts.productId ?? null)},
                entitlementId: ${JSON.stringify(opts.tier ?? null)},
                revenueCatAppUserId: ${JSON.stringify(opts.revenueCatAppUserId ?? null)},
                entitlementActive: true
              })
            });
            window.dispatchEvent(new CustomEvent("motivefx-iap", {
              detail: { type: "iap_result", ok: res.ok, tier: ${JSON.stringify(opts.tier ?? null)} }
            }));
            if (res.ok) {
              window.dispatchEvent(new Event("motivefx:entitlements-changed"));
              window.location.reload();
            }
          } catch (e) {
            window.dispatchEvent(new CustomEvent("motivefx-iap", {
              detail: { type: "iap_result", ok: false, error: String(e) }
            }));
          }
          true;
        })();
      `;
      webRef.current?.injectJavaScript?.(syncJs);
    },
    []
  );

  const freeReaderBillingMessage =
    Platform.OS === "ios"
      ? "This iOS app is a free informational reader. Purchases and subscriptions are not available in the app."
      : "Web checkout is not available inside the app. Digital subscriptions use store billing when configured.";

  const runPurchase = useCallback(
    async (tierRaw?: string, userId?: string) => {
      if (Platform.OS === "ios") {
        setIapBanner(freeReaderBillingMessage);
        notifyWeb({
          type: "iap_result",
          ok: false,
          error: "In-app purchases are not available in this iOS build.",
        });
        return;
      }
      if (iapBusy) return;
      if (!isIapConfigured()) {
        // Play Payments: never steer users to web checkout for digital subscriptions.
        setIapBanner(
          "In-app subscriptions are not available in this build yet. Existing plan access still works when you sign in."
        );
        notifyWeb({
          type: "iap_result",
          ok: false,
          error: "Store billing is not configured in this build.",
        });
        return;
      }
      const tier: IntelligenceTierId = isValidTier(tierRaw) ? tierRaw : "pro";
      setIapBusy(true);
      setIapBanner(null);
      try {
        if (userId) {
          appUserIdRef.current = userId;
          await configureIap(userId);
        }
        const result = await purchaseTier(tier);
        if (!result.ok || !result.customerInfo) {
          setIapBanner(result.error ?? "Purchase failed.");
          notifyWeb({ type: "iap_result", ok: false, error: result.error });
          return;
        }
        const tx =
          extractTransactionId(result.customerInfo) ??
          result.originalTransactionId ??
          `rc:${appUserIdRef.current ?? "anon"}:${result.productId ?? tier}`;
        syncAppleToServer({
          originalTransactionId: tx,
          productId: result.productId,
          tier: result.tier ?? tier,
          revenueCatAppUserId: appUserIdRef.current,
        });
        setIapBanner("Subscription unlocked.");
      } finally {
        setIapBusy(false);
      }
    },
    [freeReaderBillingMessage, iapBusy, notifyWeb, syncAppleToServer]
  );

  const runRestore = useCallback(
    async (userId?: string) => {
      if (Platform.OS === "ios") {
        setIapBanner(freeReaderBillingMessage);
        return;
      }
      if (iapBusy) return;
      if (!isIapConfigured()) {
        setIapBanner("In-app purchase is not configured.");
        return;
      }
      setIapBusy(true);
      setIapBanner(null);
      try {
        if (userId) {
          appUserIdRef.current = userId;
          await configureIap(userId);
        }
        const result = await restorePurchases();
        if (!result.ok || !result.customerInfo) {
          setIapBanner(result.error ?? "Restore failed.");
          notifyWeb({ type: "iap_result", ok: false, error: result.error });
          return;
        }
        const tx =
          extractTransactionId(result.customerInfo) ??
          result.originalTransactionId ??
          `rc:restore:${result.productId ?? "unknown"}`;
        syncAppleToServer({
          originalTransactionId: tx,
          productId: result.productId,
          tier: result.tier,
          revenueCatAppUserId: appUserIdRef.current,
        });
        setIapBanner("Purchases restored.");
      } finally {
        setIapBusy(false);
      }
    },
    [freeReaderBillingMessage, iapBusy, notifyWeb, syncAppleToServer]
  );

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const raw = event.nativeEvent.data;
        if (raw === "motivefx:logout") {
          void logout();
          return;
        }
        if (typeof raw === "string" && raw.startsWith("{")) {
          const parsed = JSON.parse(raw) as NativeMsg;
          if (parsed?.type === "motivefx:open-external" && parsed.url) {
            if (isBillingOrCheckoutUrl(parsed.url)) {
              setIapBanner(freeReaderBillingMessage);
              return;
            }
            void Linking.openURL(parsed.url).catch((e) => console.warn("openURL failed", e));
            return;
          }
          if (parsed.type === "session" && parsed.userId) {
            appUserIdRef.current = parsed.userId;
            if (Platform.OS !== "ios") {
              void configureIap(parsed.userId);
            }
            return;
          }
          if (parsed.type === "iap_purchase") {
            void runPurchase(parsed.tier, parsed.userId);
            return;
          }
          if (parsed.type === "iap_restore") {
            void runRestore(parsed.userId);
          }
        }
      } catch (e) {
        console.warn("Terminal onMessage failed", e);
      }
    },
    [freeReaderBillingMessage, logout, runPurchase, runRestore]
  );

  const bounceToTerminal = useCallback(() => {
    const terminal = TERMINAL_URL.replace(/\/$/, "") || `${WEB_BASE}/terminal`;
    const guestUri =
      Platform.OS === "ios" && !isAuthenticated ? `${terminal}?demo=1` : terminal;
    setSourceUri(guestUri);
    setHasLoadedOnce(false);
    setLoading(true);
    setWebViewKey((k) => k + 1);
    armLoadWatchdog();
  }, [armLoadWatchdog, isAuthenticated]);

  const handleOffTerminalNavigation = useCallback(
    (url: string): boolean => {
      const kind = isOffTerminalShellUrl(url);
      if (!kind) return false;
      if (kind === "auth") {
        // iOS guest: optional native sign-in — do not trap reviewers behind a login wall.
        if (onRequestSignIn && !isAuthenticated) {
          onRequestSignIn();
          return true;
        }
        // Prefer native AuthScreen over Next /login (often looks broken / blank in WebView).
        void logout();
        return true;
      }
      if (kind === "admin") {
        setIapBanner("Ops Console is not available in the mobile app. Use the Home terminal instead.");
        bounceToTerminal();
        return true;
      }
      // /app → keep reviewers inside /terminal (site /app just redirects anyway).
      bounceToTerminal();
      return true;
    },
    [bounceToTerminal, isAuthenticated, logout, onRequestSignIn]
  );

  const onShouldStartLoadWithRequest = useCallback(
    (req: ShouldStartLoadRequest) => {
      try {
        const url = req.url ?? "";
        if (!url.startsWith("http://") && !url.startsWith("https://")) return true;
        if (Platform.OS === "android" && req.isTopFrame === false) return true;
        // Play / App Store payments: never open Stripe or web pricing/checkout from the app.
        if (isBillingOrCheckoutUrl(url)) {
          setIapBanner(freeReaderBillingMessage);
          return false;
        }
        if (handleOffTerminalNavigation(url)) return false;
        if (isAllowedOrigin(url)) return true;
        void Linking.openURL(url).catch((e) => console.warn("openURL failed", e));
        return false;
      } catch {
        return true;
      }
    },
    [freeReaderBillingMessage, handleOffTerminalNavigation]
  );

  const remountWebView = useCallback(() => {
    setError(null);
    setLoading(true);
    setWebViewKey((k) => k + 1);
    void prepareSession();
  }, [prepareSession]);

  const showWebView = phase === "ready" && !!WebView && !!sourceUri;
  /** Never show an empty dark WebView frame without chrome. */
  const showBootOverlay =
    phase === "boot" || !WebView || (phase === "ready" && (!hasLoadedOnce || loading));

  const webViewProps = useMemo(
    () => ({
      source: { uri: sourceUri! },
      style: styles.webview,
      onLoadStart: () => {
        // Only block the screen with the loader on the very first load;
        // in-page navigations must never re-cover the UI.
        if (!hasLoadedOnce) setLoading(true);
        armLoadWatchdog();
      },
      onLoadEnd: () => {
        clearLoadWatchdog();
        setLoading(false);
        setHasLoadedOnce(true);
        setPhase("ready");
        // Safe window: configure billing only after the UI is interactive (Android only —
        // iOS free-reader path keeps StoreKit / RevenueCat off).
        if (Platform.OS === "ios") return;
        const uid = appUserIdRef.current;
        setTimeout(() => {
          void configureIap(uid);
        }, 750);
      },
      onNavigationStateChange: (nav: { url?: string }) => {
        const url = nav.url ?? "";
        if (!url.startsWith("http")) return;
        if (isBillingOrCheckoutUrl(url)) {
          setIapBanner(
            Platform.OS === "ios"
              ? "This iOS app is a free informational reader. Purchases and subscriptions are not available in the app."
              : "Web checkout is not available inside the app. Digital subscriptions use store billing when configured."
          );
          bounceToTerminal();
          return;
        }
        handleOffTerminalNavigation(url);
      },
      onError: (e: { nativeEvent: { description?: string } }) => {
        clearLoadWatchdog();
        setLoading(false);
        setError(e.nativeEvent.description || "Could not load terminal.");
        setPhase("failed");
      },
      onHttpError: (e: { nativeEvent: { statusCode: number } }) => {
        if (e.nativeEvent.statusCode >= 500) {
          setError(`Terminal server error (${e.nativeEvent.statusCode}). Tap Retry.`);
          setPhase("failed");
          setLoading(false);
        }
      },
      onRenderProcessGone: () => {
        // Android renderer death: auto-remount instead of leaving a dead view.
        clearLoadWatchdog();
        setLoading(true);
        setHasLoadedOnce(false);
        setError(null);
        setWebViewKey((k) => k + 1);
      },
      onContentProcessDidTerminate: () => {
        // iOS WKWebView process death — remount instead of blank black screen.
        clearLoadWatchdog();
        setHasLoadedOnce(false);
        setLoading(true);
        setError(null);
        setWebViewKey((k) => k + 1);
        armLoadWatchdog();
      },
      injectedJavaScriptBeforeContentLoaded: injection,
      injectedJavaScript: VIEWPORT_LOCK_SCRIPT,
      onMessage,
      javaScriptEnabled: true,
      domStorageEnabled: true,
      thirdPartyCookiesEnabled: true,
      sharedCookiesEnabled: true,
      setSupportMultipleWindows: false,
      allowsBackForwardNavigationGestures: false,
      pullToRefreshEnabled: false,
      // Scrolling must always work inside the terminal page (Play policy flag).
      scrollEnabled: true,
      nestedScrollEnabled: true,
      overScrollMode: "always" as const,
      bounces: true,
      scalesPageToFit: false,
      setBuiltInZoomControls: false,
      setDisplayZoomControls: false,
      textZoom: 100,
      cacheEnabled: true,
      cacheMode: "LOAD_DEFAULT" as const,
      mixedContentMode: "always" as const,
      userAgent:
        Platform.OS === "ios"
          ? "MotiveFXNative/1.0 (iOS; AppStore)"
          : "MotiveFXNative/1.0 (AndroidScrollFix)",
      originWhitelist: ["https://*", "http://*", "about:blank"],
      onShouldStartLoadWithRequest,
      // Avoid hardware layer — on some review devices it freezes WebView scrolling.
      ...(Platform.OS === "android" ? { androidLayerType: "none" as const } : {}),
    }),
    [
      sourceUri,
      injection,
      onMessage,
      onShouldStartLoadWithRequest,
      hasLoadedOnce,
      armLoadWatchdog,
      clearLoadWatchdog,
      bounceToTerminal,
      handleOffTerminalNavigation,
    ]
  );

  if (phase === "failed") {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.failTitle}>Terminal unavailable</Text>
        <Text style={styles.failBody}>
          {error || "Session handoff failed. Try again — the terminal will reload inside the app."}
        </Text>
        <Pressable style={styles.failButton} onPress={remountWebView}>
          <Text style={styles.failButtonText}>Retry</Text>
        </Pressable>
        {onRequestDeleteAccount ? (
          <Pressable onPress={onRequestDeleteAccount}>
            <Text style={styles.link}>Delete account</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => void logout()}>
          <Text style={styles.linkMuted}>Sign out</Text>
        </Pressable>
        {onRequestSignIn ? (
          <Pressable onPress={onRequestSignIn}>
            <Text style={styles.link}>Sign in</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {onRequestSignIn ? (
        <View style={styles.guestBar}>
          <Text style={styles.guestBarText}>Browsing as guest · market insights unlock without an account</Text>
          <Pressable onPress={onRequestSignIn} accessibilityRole="button" accessibilityLabel="Sign in">
            <Text style={styles.guestBarLink}>Sign in</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={remountWebView}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {showWebView && WebView ? (
        <WebView key={webViewKey} ref={webRef as never} {...webViewProps} />
      ) : null}

      {showBootOverlay && (
        <View style={styles.loader} pointerEvents="none">
          <Text style={styles.loaderBrand}>MotiveFX.AI</Text>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loaderText}>
            {!WebView ? "Preparing secure view…" : "Loading terminal…"}
          </Text>
        </View>
      )}

      {iapBusy && (
        <View style={styles.iapOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.iapText}>
            {Platform.OS === "android" ? "Opening Google Play…" : "Opening App Store…"}
          </Text>
        </View>
      )}
      {iapBanner && !iapBusy && (
        <Pressable style={styles.banner} onPress={() => setIapBanner(null)}>
          <Text style={styles.bannerText}>{iapBanner}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  webview: { flex: 1, backgroundColor: colors.bg },
  loader: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    zIndex: 2,
    gap: 12,
  },
  loaderText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  loaderBrand: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#2a1215",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  errorText: { color: "#fca5a5", flex: 1, fontSize: 13 },
  retry: { color: colors.accent, fontWeight: "700" },
  failTitle: { color: colors.text, fontSize: 20, fontWeight: "700", textAlign: "center" },
  failBody: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  failButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "center",
  },
  failButtonText: { color: colors.bg, fontWeight: "700" },
  link: { color: colors.accent, textAlign: "center", marginTop: 8 },
  linkMuted: { color: colors.dim, textAlign: "center", marginTop: 8 },
  guestBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(0, 198, 255, 0.08)",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  guestBarText: { color: colors.muted, fontSize: 12, flex: 1, lineHeight: 16 },
  guestBarLink: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  iapOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 10, 12, 0.72)",
    gap: 12,
    zIndex: 5,
  },
  iapText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 198, 255, 0.95)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 6,
  },
  bannerText: {
    color: "#041018",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});

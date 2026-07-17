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
      document.documentElement.classList.add("motivefx-native-shell");
      window.__MOTIVEFX_NATIVE_IAP__ = ${isIapConfigured() ? "true" : "false"};
      var content = "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover";
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "viewport");
        if (document.head) document.head.appendChild(meta);
      }
      if (meta) meta.setAttribute("content", content);
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
        window.__MOTIVEFX_NATIVE_IAP__ = ${isIapConfigured() ? "true" : "false"};
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

export function TerminalScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
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

  /* If the page never finishes loading, drop the spinner instead of freezing
     the screen behind an eternal loader (Play "app not responding" policy). */
  const armLoadWatchdog = useCallback(() => {
    clearLoadWatchdog();
    loadWatchdogRef.current = setTimeout(() => {
      setLoading(false);
      setError("Terminal is taking too long to load. Check your connection and tap Retry.");
    }, 20_000);
  }, [clearLoadWatchdog]);

  useEffect(() => clearLoadWatchdog, [clearLoadWatchdog]);

  useEffect(() => {
    void configureIap();
  }, []);

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
        void configureIap(userId);
      }
      setInjection(
        `${buildAuthInjectionScript(accessToken, refreshToken, userId)}\n${VIEWPORT_LOCK_SCRIPT}`
      );

      // Start terminal immediately — do not block on native-handoff network roundtrip.
      const uri = TERMINAL_URL.endsWith("/") ? TERMINAL_URL : `${TERMINAL_URL}/`;
      setSourceUri(uri);
      setPhase("ready");
      setLoading(false);

      // Best-effort cookie handoff in background (does not delay first paint).
      if (accessToken) {
        void (async () => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1200);
            const handoff = await fetch(`${API_BASE}/auth/native-handoff`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ refresh_token: refreshToken }),
              signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!handoff.ok) return;
            // Cookie is set on the response; WebView already has localStorage tokens.
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
  }, []);

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

  const runPurchase = useCallback(
    async (tierRaw?: string, userId?: string) => {
      if (iapBusy) return;
      if (!isIapConfigured()) {
        setIapBanner("In-app purchase is not configured. Opening website…");
        void Linking.openURL("https://www.motivefxai.com/pricing");
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
    [iapBusy, notifyWeb, syncAppleToServer]
  );

  const runRestore = useCallback(
    async (userId?: string) => {
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
    [iapBusy, notifyWeb, syncAppleToServer]
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
            void Linking.openURL(parsed.url).catch((e) => console.warn("openURL failed", e));
            return;
          }
          if (parsed.type === "session" && parsed.userId) {
            appUserIdRef.current = parsed.userId;
            void configureIap(parsed.userId);
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
    [logout, runPurchase, runRestore]
  );

  const onShouldStartLoadWithRequest = useCallback((req: ShouldStartLoadRequest) => {
    try {
      const url = req.url ?? "";
      if (!url.startsWith("http://") && !url.startsWith("https://")) return true;
      if (Platform.OS === "android" && req.isTopFrame === false) return true;
      // Never load Stripe / pricing / checkout inside the WebView.
      if (isBillingOrCheckoutUrl(url)) {
        void Linking.openURL(url).catch((e) => console.warn("openURL failed", e));
        return false;
      }
      if (isAllowedOrigin(url)) return true;
      void Linking.openURL(url).catch((e) => console.warn("openURL failed", e));
      return false;
    } catch {
      return true;
    }
  }, []);

  const remountWebView = useCallback(() => {
    setError(null);
    setLoading(true);
    setWebViewKey((k) => k + 1);
    void prepareSession();
  }, [prepareSession]);

  const showWebView = phase === "ready" && !!WebView && !!sourceUri;

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
      },
      onError: (e: { nativeEvent: { description?: string } }) => {
        clearLoadWatchdog();
        setLoading(false);
        setError(e.nativeEvent.description || "Could not load terminal.");
      },
      onHttpError: (e: { nativeEvent: { statusCode: number } }) => {
        if (e.nativeEvent.statusCode >= 500) {
          setError(`Terminal server error (${e.nativeEvent.statusCode}). Tap Retry.`);
        }
      },
      onRenderProcessGone: () => {
        // Android renderer death: auto-remount instead of leaving a dead view.
        clearLoadWatchdog();
        setLoading(true);
        setError(null);
        setWebViewKey((k) => k + 1);
      },
      onContentProcessDidTerminate: () => {
        clearLoadWatchdog();
        setLoading(false);
        setError("Terminal view terminated. Tap Retry.");
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
      overScrollMode: "content" as const,
      bounces: false,
      scalesPageToFit: false,
      setBuiltInZoomControls: false,
      setDisplayZoomControls: false,
      textZoom: 100,
      cacheEnabled: true,
      cacheMode: "LOAD_DEFAULT" as const,
      mixedContentMode: "always" as const,
      userAgent: "MotiveFXNative/1.0",
      originWhitelist: ["https://*", "http://*", "about:blank"],
      onShouldStartLoadWithRequest,
      // Hardware layer = smooth scroll; software layer was the main glitch/slowness cause.
      ...(Platform.OS === "android" ? { androidLayerType: "hardware" as const } : {}),
    }),
    [
      sourceUri,
      injection,
      onMessage,
      onShouldStartLoadWithRequest,
      hasLoadedOnce,
      armLoadWatchdog,
      clearLoadWatchdog,
    ]
  );

  if (phase === "failed") {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.failTitle}>Terminal unavailable</Text>
        <Text style={styles.failBody}>
          {error || "Session handoff failed. Try again or open the web terminal."}
        </Text>
        <Pressable style={styles.failButton} onPress={remountWebView}>
          <Text style={styles.failButtonText}>Retry</Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(TERMINAL_URL)}>
          <Text style={styles.link}>Open www.motivefxai.com</Text>
        </Pressable>
        <Pressable onPress={() => void logout()}>
          <Text style={styles.linkMuted}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={remountWebView}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loaderText}>Loading terminal…</Text>
        </View>
      )}

      {showWebView && WebView ? (
        <WebView key={webViewKey} ref={webRef as never} {...webViewProps} />
      ) : null}

      {iapBusy && (
        <View style={styles.iapOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.iapText}>Opening App Store…</Text>
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

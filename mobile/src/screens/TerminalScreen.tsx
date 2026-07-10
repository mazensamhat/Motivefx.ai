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

type ShouldStartLoadRequest = {
  url: string;
  isTopFrame?: boolean;
};

type WebViewComponent = typeof import("react-native-webview").WebView;

const VIEWPORT_LOCK_SCRIPT = `
  (function () {
    try {
      document.documentElement.classList.add("motivefx-native-shell");
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

export function TerminalScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [WebView, setWebView] = useState<WebViewComponent | null>(null);
  const [phase, setPhase] = useState<"boot" | "ready" | "failed">("boot");
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [injection, setInjection] = useState(VIEWPORT_LOCK_SCRIPT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webViewKey, setWebViewKey] = useState(0);
  const [mountWebView, setMountWebView] = useState(false);
  const webRef = useRef<{ reload?: () => void } | null>(null);

  // Lazy-require WebView only after this screen mounts (never at app cold start).
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("react-native-webview") as typeof import("react-native-webview");
        if (!cancelled) setWebView(() => mod.WebView);
      } catch (e) {
        console.warn("WebView module failed to load", e);
        if (!cancelled) {
          setError("WebView unavailable on this device.");
          setPhase("failed");
        }
      }
    }, Platform.OS === "android" ? 500 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const prepareSession = useCallback(async () => {
    setPhase("boot");
    setLoading(true);
    setError(null);
    setMountWebView(false);
    try {
      const [accessToken, refreshToken, userId] = await Promise.all([
        getAccessToken(),
        getRefreshToken(),
        getUserId(),
      ]);
      setInjection(
        `${buildAuthInjectionScript(accessToken, refreshToken, userId)}\n${VIEWPORT_LOCK_SCRIPT}`
      );

      let uri = TERMINAL_URL.endsWith("/") ? TERMINAL_URL : `${TERMINAL_URL}/`;
      if (accessToken) {
        try {
          const handoff = await fetch(`${API_BASE}/auth/native-handoff`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (handoff.ok) {
            const data = (await handoff.json()) as { url?: string };
            if (data.url && data.url.length < 4000) uri = data.url;
          }
        } catch (e) {
          console.warn("native-handoff failed; loading terminal with injected tokens", e);
        }
      }
      setSourceUri(uri);
      setPhase("ready");
    } catch (e) {
      console.warn("prepareSession failed", e);
      setError(e instanceof Error ? e.message : "Could not prepare terminal session");
      setPhase("failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void prepareSession();
  }, [prepareSession]);

  // Extra delay before mounting WebView after session is ready.
  useEffect(() => {
    if (phase !== "ready" || !sourceUri || !WebView) {
      setMountWebView(false);
      return;
    }
    const timer = setTimeout(() => setMountWebView(true), Platform.OS === "android" ? 700 : 100);
    return () => clearTimeout(timer);
  }, [phase, sourceUri, WebView]);

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        if (event.nativeEvent.data === "motivefx:logout") void logout();
      } catch (e) {
        console.warn("Terminal onMessage failed", e);
      }
    },
    [logout]
  );

  const onShouldStartLoadWithRequest = useCallback((req: ShouldStartLoadRequest) => {
    try {
      const url = req.url ?? "";
      if (!url.startsWith("http://") && !url.startsWith("https://")) return true;
      if (Platform.OS === "android" && req.isTopFrame === false) return true;
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

  const showWebView = mountWebView && !!WebView && !!sourceUri;

  const webViewProps = useMemo(
    () => ({
      source: { uri: sourceUri! },
      style: styles.webview,
      onLoadStart: () => setLoading(true),
      onLoadEnd: () => setLoading(false),
      onError: (e: { nativeEvent: { description?: string } }) => {
        setLoading(false);
        setError(e.nativeEvent.description || "Could not load terminal.");
      },
      onHttpError: (e: { nativeEvent: { statusCode: number } }) => {
        if (e.nativeEvent.statusCode >= 500) {
          setError(`Terminal server error (${e.nativeEvent.statusCode}). Tap Retry.`);
        }
      },
      onRenderProcessGone: () => {
        setLoading(false);
        setMountWebView(false);
        setError("Terminal view crashed. Tap Retry.");
      },
      onContentProcessDidTerminate: () => {
        setLoading(false);
        setMountWebView(false);
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
      bounces: false,
      scalesPageToFit: false,
      setBuiltInZoomControls: false,
      setDisplayZoomControls: false,
      textZoom: 100,
      cacheEnabled: true,
      mixedContentMode: "always" as const,
      userAgent: "MotiveFXNative/1.0",
      originWhitelist: ["https://*", "http://*", "about:blank"],
      onShouldStartLoadWithRequest,
      ...(Platform.OS === "android" ? { androidLayerType: "software" as const } : {}),
    }),
    [sourceUri, injection, onMessage, onShouldStartLoadWithRequest]
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

      {loading || !showWebView ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loaderText}>Loading terminal…</Text>
        </View>
      ) : null}

      {showWebView && WebView ? (
        <WebView key={webViewKey} ref={webRef as never} {...webViewProps} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  webview: { flex: 1, backgroundColor: colors.bg, opacity: 0.99 },
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
});

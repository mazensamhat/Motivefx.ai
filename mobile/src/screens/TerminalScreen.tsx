import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  InteractionManager,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { API_BASE, TERMINAL_URL, WEB_BASE } from "../config";
import { getAccessToken, getRefreshToken, getUserId } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

type ShouldStartLoadRequest = {
  url: string;
  isTopFrame?: boolean;
};

/** Lock viewport + block pinch/double-tap zoom before page paint. */
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
      var lock = function (e) {
        if (e.touches && e.touches.length > 1) e.preventDefault();
      };
      document.addEventListener("gesturestart", function (e) { e.preventDefault(); }, { passive: false });
      document.addEventListener("gesturechange", function (e) { e.preventDefault(); }, { passive: false });
      document.addEventListener("gestureend", function (e) { e.preventDefault(); }, { passive: false });
      document.addEventListener("touchmove", lock, { passive: false });
    } catch (e) {}
    true;
  })();
`;

/** Escape a string for safe embedding inside a JS single-quoted string literal. */
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
  // Prefer explicit string literals over JSON.stringify interpolation so a
  // malformed token cannot break out of the injected script on Android WebView.
  return `
    (function () {
      try {
        var accessToken = ${jsStringLiteral(accessToken)};
        var refreshToken = ${jsStringLiteral(refreshToken)};
        var userId = ${jsStringLiteral(userId)};
        if (accessToken) {
          localStorage.setItem("motivefx_access_token", accessToken);
        }
        if (refreshToken) {
          localStorage.setItem("motivefx_refresh_token", refreshToken);
        }
        if (userId) {
          localStorage.setItem("motivefx_auth_user_id", userId);
        }
        document.documentElement.classList.add("motivefx-native-shell");
        var content = "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover";
        var meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
          meta = document.createElement("meta");
          meta.setAttribute("name", "viewport");
          if (document.head) document.head.appendChild(meta);
        }
        if (meta) meta.setAttribute("content", content);
      } catch (e) {
        console.warn("MotiveFX auth injection failed", e);
      }
      true;
    })();
  `;
}

function isAllowedOrigin(url: string): boolean {
  return url.startsWith(WEB_BASE) || url.startsWith(API_BASE);
}

/**
 * Cookie handoff is required: middleware blocks /terminal without motivefx_session.
 * Do NOT register Android App Links for /terminal — they hijack the handoff redirect
 * out of the WebView and relaunch the app (post-login crash loop).
 */
function terminalEntryUrl(accessToken: string | null): string {
  if (!accessToken) return TERMINAL_URL;
  const next = encodeURIComponent("/terminal/");
  const token = encodeURIComponent(accessToken);
  return `${API_BASE}/auth/native-handoff?token=${token}&next=${next}`;
}

type SessionPhase = "preparing" | "ready" | "failed";

export function TerminalScreen() {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [injection, setInjection] = useState<string>("true;");
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [phase, setPhase] = useState<SessionPhase>("preparing");
  /** Delay WebView mount until after Auth→Terminal transition settles (Android crash fix). */
  const [webViewReady, setWebViewReady] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  const prepareSession = useCallback(async () => {
    setPhase("preparing");
    setWebViewReady(false);
    setSourceUri(null);
    setLoading(true);
    try {
      const [accessToken, refreshToken, userId] = await Promise.all([
        getAccessToken(),
        getRefreshToken(),
        getUserId(),
      ]);
      if (!accessToken) {
        setInjection("true;");
        setSourceUri(null);
        setError("No saved session. Sign in again.");
        setPhase("failed");
        setLoading(false);
        return;
      }
      setInjection(buildAuthInjectionScript(accessToken, refreshToken, userId));
      setSourceUri(terminalEntryUrl(accessToken));
      setError(null);
      setPhase("ready");
    } catch (e) {
      console.warn("Terminal session prepare failed", e);
      setInjection("true;");
      setSourceUri(null);
      setError(e instanceof Error ? e.message : "Could not prepare terminal session.");
      setPhase("failed");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void prepareSession();
  }, [prepareSession]);

  // Mount WebView only after navigation animation / interactions finish.
  // Mounting WebView during a native-stack fade transition SIGSEGVs on many Android devices.
  useEffect(() => {
    if (phase !== "ready" || !sourceUri) {
      setWebViewReady(false);
      return;
    }
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        if (!cancelled) setWebViewReady(true);
      }, Platform.OS === "android" ? 350 : 0);
    });
    return () => {
      cancelled = true;
      task.cancel();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [phase, sourceUri]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        if (event.nativeEvent.data === "motivefx:logout") {
          void logout();
        }
      } catch (e) {
        console.warn("Terminal onMessage failed", e);
      }
    },
    [logout]
  );

  const onShouldStartLoadWithRequest = useCallback((req: ShouldStartLoadRequest) => {
    try {
      const url = req.url ?? "";
      // Allow non-http schemes the WebView needs (about:blank, data:, blob:).
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return true;
      }
      // Only gate top-frame navigations; never block subresources (fonts, XHR, iframes).
      if (Platform.OS === "android" && req.isTopFrame === false) {
        return true;
      }
      if (isAllowedOrigin(url)) {
        return true;
      }
      // External links: open in system browser instead of nesting VIEW intents.
      void Linking.openURL(url).catch((e) => console.warn("openURL failed", e));
      return false;
    } catch (e) {
      console.warn("onShouldStartLoadWithRequest failed", e);
      return true;
    }
  }, []);

  const remountWebView = useCallback(() => {
    setError(null);
    setLoading(true);
    setWebViewKey((k) => k + 1);
    void prepareSession();
  }, [prepareSession]);

  const openInBrowser = useCallback(() => {
    void Linking.openURL(TERMINAL_URL);
  }, []);

  const showWebView = webViewReady && !!sourceUri;

  if (phase === "failed") {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.failTitle}>Terminal unavailable</Text>
        <Text style={styles.failBody}>
          {error || "Session handoff failed. Your login is saved — try again or open the web terminal."}
        </Text>
        <Pressable style={styles.failButton} onPress={remountWebView}>
          <Text style={styles.failButtonText}>Retry</Text>
        </Pressable>
        <Pressable onPress={openInBrowser}>
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

      {showWebView ? (
        <WebView
          key={webViewKey}
          ref={webRef}
          source={{ uri: sourceUri! }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={(syntheticEvent) => {
            const desc = syntheticEvent.nativeEvent.description;
            console.warn("Terminal WebView onError", desc);
            setLoading(false);
            setError(desc || "Could not load the MotiveFX terminal. Check your connection.");
          }}
          onHttpError={(syntheticEvent) => {
            const { statusCode } = syntheticEvent.nativeEvent;
            if (statusCode >= 500) {
              console.warn("Terminal WebView HTTP error", statusCode);
              setError(`Terminal server error (${statusCode}). Tap Retry.`);
            }
          }}
          onRenderProcessGone={() => {
            console.warn("Terminal WebView render process gone");
            setLoading(false);
            setWebViewReady(false);
            setError("Terminal view crashed. Tap Retry to reload.");
          }}
          onContentProcessDidTerminate={() => {
            console.warn("Terminal WebView content process terminated");
            setLoading(false);
            setWebViewReady(false);
            setError("Terminal view was terminated. Tap Retry to reload.");
          }}
          injectedJavaScriptBeforeContentLoaded={injection}
          injectedJavaScript={VIEWPORT_LOCK_SCRIPT}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          pullToRefreshEnabled={false}
          decelerationRate="normal"
          overScrollMode="never"
          bounces={false}
          scalesPageToFit={false}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          textZoom={100}
          cacheEnabled
          mixedContentMode="always"
          userAgent="MotiveFXNative/1.0"
          originWhitelist={["https://*", "http://*", "about:blank"]}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          {...(Platform.OS === "android"
            ? {
                // Known Android WebView + navigation crash mitigations
                androidLayerType: "hardware" as const,
              }
            : {})}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.bg,
    // opacity 0.99 forces a separate compositor layer — mitigates Android
    // libhwui SIGSEGV when WebView mounts during/after stack transitions.
    opacity: 0.99,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    zIndex: 2,
    gap: 12,
  },
  loaderText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#2a1215",
    borderBottomWidth: 1,
    borderBottomColor: colors.red,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 3,
  },
  errorText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  retry: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  failTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  failBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  failButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  failButtonText: {
    color: colors.bg,
    fontWeight: "700",
  },
  link: {
    color: colors.accent,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "600",
  },
  linkMuted: {
    color: colors.dim,
    textAlign: "center",
    marginTop: 4,
  },
});

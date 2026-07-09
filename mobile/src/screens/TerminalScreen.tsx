import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { API_BASE, TERMINAL_URL, WEB_BASE } from "../config";
import { getAccessToken, getRefreshToken, getUserId } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

function buildAuthInjectionScript(
  accessToken: string | null,
  refreshToken: string | null,
  userId: string | null
): string {
  const payload = JSON.stringify({
    accessToken,
    refreshToken,
    userId,
  });
  return `
    (function () {
      try {
        var session = ${payload};
        if (session.accessToken) {
          localStorage.setItem("motivefx_access_token", session.accessToken);
        }
        if (session.refreshToken) {
          localStorage.setItem("motivefx_refresh_token", session.refreshToken);
        }
        if (session.userId) {
          localStorage.setItem("motivefx_auth_user_id", session.userId);
        }
        document.documentElement.classList.add("motivefx-native-shell");
      } catch (e) {
        console.warn("MotiveFX auth injection failed", e);
      }
      true;
    })();
  `;
}

function terminalEntryUrl(accessToken: string | null): string {
  if (!accessToken) return TERMINAL_URL;
  const next = encodeURIComponent("/terminal/");
  const token = encodeURIComponent(accessToken);
  return `${API_BASE}/auth/native-handoff?token=${token}&next=${next}`;
}

export function TerminalScreen() {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [injection, setInjection] = useState<string>("true;");
  const [sourceUri, setSourceUri] = useState<string | null>(null);

  const prepareSession = useCallback(async () => {
    const [accessToken, refreshToken, userId] = await Promise.all([
      getAccessToken(),
      getRefreshToken(),
      getUserId(),
    ]);
    setInjection(buildAuthInjectionScript(accessToken, refreshToken, userId));
    setSourceUri(terminalEntryUrl(accessToken));
  }, []);

  useEffect(() => {
    void prepareSession();
  }, [prepareSession]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (event.nativeEvent.data === "motivefx:logout") {
        void logout();
      }
    },
    [logout]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => {
              setError(null);
              setLoading(true);
              void prepareSession();
            }}
          >
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {loading || !sourceUri ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loaderText}>Loading terminal…</Text>
        </View>
      ) : null}

      {sourceUri ? (
        <WebView
          ref={webRef}
          source={{ uri: sourceUri }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => setError("Could not load the MotiveFX terminal. Check your connection.")}
          injectedJavaScriptBeforeContentLoaded={injection}
          onMessage={onMessage}
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          pullToRefreshEnabled
          decelerationRate="normal"
          overScrollMode="never"
          userAgent="MotiveFXNative/1.0"
          originWhitelist={["https://*", "http://*"]}
          // Keep navigation on the production origin
          onShouldStartLoadWithRequest={(req) => {
            if (!req.url.startsWith("http")) return true;
            return req.url.startsWith(WEB_BASE) || req.url.startsWith(API_BASE);
          }}
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
  webview: {
    flex: 1,
    backgroundColor: colors.bg,
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
});

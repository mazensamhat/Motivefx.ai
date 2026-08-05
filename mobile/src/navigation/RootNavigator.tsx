import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { APP_DISPLAY_NAME } from "../config";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { isAgeVerified, setAgeVerified } from "../lib/ageGate";
import { AgeGateScreen } from "../screens/AgeGateScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { DeleteAccountScreen } from "../screens/DeleteAccountScreen";
import { TerminalScreen } from "../screens/TerminalScreen";
import { colors } from "../theme";

/**
 * No React Navigation / native-stack — those + WebView transitions were
 * crashing Android. Simple conditional render only.
 */
function BootSplash({ label = "Starting…" }: { label?: string }) {
  return (
    <View style={styles.boot} accessibilityLabel={label}>
      <Text style={styles.bootBrand}>{APP_DISPLAY_NAME}</Text>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.bootLabel}>{label}</Text>
    </View>
  );
}

function Root() {
  const { loading, isAuthenticated } = useAuth();
  const [ageChecked, setAgeChecked] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isAgeVerified();
      if (!cancelled) {
        setAgeOk(ok);
        setAgeChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const acceptAge = useCallback(async () => {
    await setAgeVerified();
    setAgeOk(true);
  }, []);

  if (!ageChecked || loading) {
    return <BootSplash label={!ageChecked ? "Checking age gate…" : "Restoring session…"} />;
  }

  if (!ageOk) {
    return <AgeGateScreen onAccepted={() => void acceptAge()} />;
  }

  if (showDeleteAccount) {
    return (
      <DeleteAccountScreen
        onCancel={() => setShowDeleteAccount(false)}
        onDeleted={() => setShowDeleteAccount(false)}
      />
    );
  }

  if (isAuthenticated) {
    return <TerminalScreen onRequestDeleteAccount={() => setShowDeleteAccount(true)} />;
  }

  return <AuthScreen onRequestDeleteAccount={() => setShowDeleteAccount(true)} />;
}

export function RootNavigator() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 24,
  },
  bootBrand: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  bootLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
});

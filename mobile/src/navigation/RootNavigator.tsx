import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { isAgeVerified, setAgeVerified } from "../lib/ageGate";
import { AgeGateScreen } from "../screens/AgeGateScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { TerminalScreen } from "../screens/TerminalScreen";
import { colors } from "../theme";

/**
 * No React Navigation / native-stack — those + WebView transitions were
 * crashing Android. Simple conditional render only.
 */
function Root() {
  const { loading, isAuthenticated } = useAuth();
  const [ageChecked, setAgeChecked] = useState(false);
  const [ageOk, setAgeOk] = useState(false);

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
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!ageOk) {
    return <AgeGateScreen onAccepted={() => void acceptAge()} />;
  }

  return isAuthenticated ? <TerminalScreen /> : <AuthScreen />;
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
  },
});

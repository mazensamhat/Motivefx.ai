import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";
import { TerminalScreen } from "../screens/TerminalScreen";
import { colors } from "../theme";

/**
 * No React Navigation / native-stack — those + WebView transitions were
 * crashing Android. Simple conditional render only.
 */
function Root() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
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

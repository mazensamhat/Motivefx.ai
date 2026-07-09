import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";
import { TerminalScreen } from "../screens/TerminalScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.panel,
    border: colors.border,
    primary: colors.accent,
    text: colors.text,
  },
};

function Root() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {isAuthenticated ? (
          <Stack.Screen name="Terminal" component={TerminalScreen} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function RootNavigator() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

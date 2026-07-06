import { ActivityIndicator, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";
import { BettingScreen } from "../screens/BettingScreen";
import { CryptoScreen } from "../screens/CryptoScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { StocksScreen } from "../screens/StocksScreen";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();

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

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.dim,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "MotiveFX.AI", tabBarLabel: "Feed" }}
      />
      <Tab.Screen name="Stocks" component={StocksScreen} />
      <Tab.Screen name="Crypto" component={CryptoScreen} />
      <Tab.Screen name="Betting" component={BettingScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer theme={theme}>
      <AppTabs />
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

import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { authService } from "../src/services/auth";
import { loadCache } from "../src/lib/storage";
import "../src/lib/i18n";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { colors } from "../src/theme/tokens";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function Splash() {
  return (
    <View style={splash.container}>
      <Text style={splash.logo}>📍</Text>
      <Text style={splash.title}>Checkpoint</Text>
      <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 16 }} />
    </View>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      await loadCache();
      await authService.init();
      setReady(true);
    }
    init();
  }, []);

  if (!ready) return <Splash />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ErrorBoundary>
              <ThemedStatusBar />
              <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ title: "Map" }} />
              <Stack.Screen name="discover" options={{ title: "Discover" }} />
              <Stack.Screen name="create" options={{ title: "Create", presentation: "modal" }} />
              <Stack.Screen name="profile" options={{ title: "Profile" }} />
              <Stack.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
              <Stack.Screen name="login" options={{ title: "Login", presentation: "modal" }} />
              <Stack.Screen name="badges" options={{ title: "Badges" }} />
              <Stack.Screen name="ai-plan" options={{ title: "AI Plan" }} />
              <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
              <Stack.Screen name="terms" options={{ title: "Terms" }} />
              <Stack.Screen name="settings" options={{ title: "Settings", presentation: "modal" }} />
              <Stack.Screen name="edit-profile" options={{ title: "Edit Profile", presentation: "modal" }} />
              <Stack.Screen name="drive-connect" options={{ title: "Google Drive", presentation: "modal" }} />
              <Stack.Screen name="photos-connect" options={{ title: "Google Photos", presentation: "modal" }} />
              <Stack.Screen name="[c]/[id]" options={{ title: "Checkpoint" }} />
              <Stack.Screen name="[p]/[id]" options={{ title: "Place" }} />
              <Stack.Screen name="[j]/[id]" options={{ title: "Journey" }} />
              <Stack.Screen name="[u]/[username]" options={{ title: "Profile" }} />
              </Stack>
            </ErrorBoundary>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

const splash = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutral[0],
  },
  logo: { fontSize: 64, marginBottom: 8 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary[500],
    fontFamily: "Montserrat_700Bold",
  },
});

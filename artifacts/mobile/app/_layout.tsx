import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/context/ThemeContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { ModalProvider } from "@/context/ModalContext";
import { ToastProvider } from "@/context/ToastContext";
import { AppProvider } from "@/context/AppContext";

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="compose" options={{ presentation: "modal", headerShown: true }} />
      <Stack.Screen name="thought/[id]" options={{ headerShown: true }} />
      <Stack.Screen name="profile/[userId]" options={{ headerShown: true }} />
      <Stack.Screen name="search" options={{ headerShown: true, title: "Search" }} />
      <Stack.Screen name="settings" options={{ headerShown: true, title: "Settings" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <SettingsProvider>
            <QueryClientProvider client={queryClient}>
              <AppProvider>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <ToastProvider>
                      <ModalProvider>
                        <RootLayoutNav />
                      </ModalProvider>
                    </ToastProvider>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </AppProvider>
            </QueryClientProvider>
          </SettingsProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

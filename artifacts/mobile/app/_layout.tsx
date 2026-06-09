import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as Font from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/context/ThemeContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { ModalProvider } from "@/context/ModalContext";
import { ToastProvider } from "@/context/ToastContext";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { registerForPushNotifications } from "@/lib/pushNotifications";

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

// ─── Push notification tap → navigation ──────────────────────────────────────
function PushNotificationManager() {
  const { user } = useAuth();
  const router = useRouter();
  const notifListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  // Register token whenever user changes
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications(user.id).catch(() => {});
  }, [user?.id]);

  // Set up tap listener once (no dependency re-runs needed)
  useEffect(() => {
    if (typeof window !== "undefined" && !("ExpoNotifications" in globalThis)) {
      return; // web SSR — skip
    }

    notifListenerRef.current = Notifications.addNotificationReceivedListener(() => {
      // Foreground display is handled by setNotificationHandler at top of lib file
    });

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown> | null;
      if (!data) return;
      if (typeof data.thoughtId === "string") {
        router.push({ pathname: "/thought/[id]", params: { id: data.thoughtId } });
      } else if (typeof data.actorId === "string") {
        router.push({ pathname: "/profile/[userId]", params: { userId: data.actorId } });
      }
    });

    return () => {
      notifListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, []);

  return null;
}

// ─── Auth-gated routing ───────────────────────────────────────────────────────
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "auth";
    if (!session && !inAuthGroup) {
      router.replace("/auth/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="compose" options={{ presentation: "modal", headerShown: true }} />
      <Stack.Screen name="thought/[id]" options={{ headerShown: true }} />
      <Stack.Screen name="profile/[userId]" options={{ headerShown: true }} />
      <Stack.Screen name="search" options={{ headerShown: true, title: "Search" }} />
      <Stack.Screen name="settings" options={{ headerShown: true, title: "Settings" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Safety valve: proceed with system fonts before fontfaceobserver's
    // 6000ms hard timeout fires as an uncaught error on web.
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) setFontsReady(true);
    }, 4500);

    Font.loadAsync({
      Inter_400Regular,
      Inter_500Medium,
      Inter_600SemiBold,
      Inter_700Bold,
    })
      .then(() => {
        if (!cancelled) {
          clearTimeout(fallbackTimer);
          setFontsReady(true);
        }
      })
      .catch(() => {
        // Font load failed (network timeout, CDN block, etc.)
        // Proceed immediately with system fonts instead of crashing.
        if (!cancelled) {
          clearTimeout(fallbackTimer);
          setFontsReady(true);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <SettingsProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <AppProvider>
                  <GestureHandlerRootView>
                    <KeyboardProvider>
                      <ToastProvider>
                        <ModalProvider>
                          <AuthGate>
                            <PushNotificationManager />
                            <RootLayoutNav />
                          </AuthGate>
                        </ModalProvider>
                      </ToastProvider>
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </AppProvider>
              </AuthProvider>
            </QueryClientProvider>
          </SettingsProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

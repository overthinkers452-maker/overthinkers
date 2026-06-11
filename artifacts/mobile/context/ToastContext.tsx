import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

type ToastType = "success" | "error" | "info";

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastState {
  message: string;
  type: ToastType;
}

const ICONS: Record<ToastType, keyof typeof Feather.glyphMap> = {
  success: "check-circle",
  error: "alert-circle",
  info: "info",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 20, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const showToast = useCallback((message: string, opts?: ToastOptions) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setToast({ message, type: opts?.type ?? "info" });
    opacity.setValue(0);
    translateY.setValue(20);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
    ]).start();
    hideTimer.current = setTimeout(hide, opts?.duration ?? 2600);
  }, [opacity, translateY, hide]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const accent = toast?.type === "success" ? colors.appreciate
    : toast?.type === "error" ? colors.disagree
    : colors.primary;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <View pointerEvents="none" style={[styles.wrap, { bottom: (Platform.OS === "web" ? 24 : insets.bottom + 24) }]}>
          <Animated.View
            style={[
              styles.toast,
              { backgroundColor: colors.card, borderColor: colors.border, opacity, transform: [{ translateY }] },
            ]}
          >
            <Feather name={ICONS[toast.type]} size={18} color={accent} />
            <Text style={[styles.text, { color: colors.foreground }]} numberOfLines={2}>{toast.message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: 24, zIndex: 9999 },
  toast: {
    flexDirection: "row", alignItems: "center", gap: 10, maxWidth: 460,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  text: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
});

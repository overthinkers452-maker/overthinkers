import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";
import { t } from "@/utils/i18n";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function LoginHistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { appLanguage, loginHistory } = useSettings();
  const styles = makeStyles(colors);
  const bottomPad = Platform.OS === "web" ? 32 : insets.bottom + 16;

  return (
    <>
      <Stack.Screen options={{
        title: t(appLanguage, "history.title"),
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loginHistory.map((e, i) => {
            const ok = e.status === "success";
            const color = ok ? colors.appreciate : colors.destructive;
            return (
              <View key={e.id} style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: i === loginHistory.length - 1 ? 0 : 1 }]}>
                <View style={[styles.iconWrap, { backgroundColor: color + "1A" }]}>
                  <Feather name={ok ? "check" : "alert-triangle"} size={16} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.status, { color: colors.foreground }]}>
                    {ok ? t(appLanguage, "history.success") : t(appLanguage, "history.failed")}
                  </Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {e.device} · {e.platform}
                  </Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {e.location} · {formatDate(e.timeISO)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
    iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginTop: 2 },
    status: { fontSize: 14.5, fontFamily: "Inter_600SemiBold" },
    meta: { fontSize: 12.5, fontFamily: "Inter_400Regular", marginTop: 2 },
  });
}

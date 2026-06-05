import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { useModal } from "@/context/ModalContext";
import { useFeedback } from "@/hooks/useFeedback";
import { t } from "@/utils/i18n";
import { timeAgo } from "@/utils/format";

function deviceIcon(platform: string): keyof typeof Feather.glyphMap {
  const p = platform.toLowerCase();
  if (p.includes("ios") || p.includes("iphone")) return "smartphone";
  if (p.includes("android")) return "smartphone";
  if (p.includes("web")) return "monitor";
  return "hard-drive";
}

export default function SessionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { appLanguage, sessions, terminateOtherSessions } = useSettings();
  const { showToast } = useToast();
  const modal = useModal();
  const { tap } = useFeedback();
  const styles = makeStyles(colors);
  const bottomPad = Platform.OS === "web" ? 32 : insets.bottom + 16;

  const others = sessions.filter((s) => !s.current);

  const onLogoutOthers = () => {
    if (others.length === 0) {
      showToast(t(appLanguage, "toast.noOtherSessions"), { type: "info" });
      return;
    }
    modal.confirm({
      title: t(appLanguage, "sessions.logoutOthers"),
      message: `${others.length} other device(s) will be signed out immediately.`,
      confirmText: t(appLanguage, "common.confirm"),
      destructive: true,
      onConfirm: () => {
        const n = terminateOtherSessions();
        tap();
        showToast(t(appLanguage, "toast.sessionsTerminated", { n }), { type: "success" });
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{
        title: t(appLanguage, "sessions.title"),
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {sessions.map((s, i) => (
            <View key={s.id} style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: i === sessions.length - 1 ? 0 : 1 }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name={deviceIcon(s.platform)} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={[styles.device, { color: colors.foreground }]} numberOfLines={1}>{s.device}</Text>
                  {s.current && (
                    <View style={[styles.badge, { backgroundColor: colors.appreciate + "22" }]}>
                      <Text style={[styles.badgeText, { color: colors.appreciate }]}>{t(appLanguage, "sessions.thisDevice")}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {s.platform} · {s.location}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {t(appLanguage, "sessions.lastActive")}: {s.current ? "now" : timeAgo(s.lastActiveISO) + " ago"}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {others.length > 0 ? (
          <TouchableOpacity onPress={onLogoutOthers} style={[styles.logoutBtn, { borderColor: colors.destructive }]} activeOpacity={0.8}>
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.logoutText, { color: colors.destructive }]}>{t(appLanguage, "sessions.logoutOthers")}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint}>{t(appLanguage, "sessions.onlyThis")}</Text>
        )}
      </ScrollView>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
    iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    device: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4 },
    meta: { fontSize: 12.5, fontFamily: "Inter_400Regular", marginTop: 2 },
    logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 13, marginTop: 18 },
    logoutText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    hint: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", marginTop: 18 },
  });
}

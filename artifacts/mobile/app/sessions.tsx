import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useModal } from "@/context/ModalContext";
import { useFeedback } from "@/hooks/useFeedback";
import { t } from "@/utils/i18n";
import { timeAgo } from "@/utils/format";
import * as svc from "@/lib/thoughtsService";
import type { UserSessionRow } from "@/lib/thoughtsService";

function deviceIcon(device: string): keyof typeof Feather.glyphMap {
  const d = device.toLowerCase();
  if (d.includes("iphone") || d.includes("ios") || d.includes("android")) return "smartphone";
  if (d.includes("web") || d.includes("browser")) return "monitor";
  return "hard-drive";
}

function currentDevice(): string {
  if (Platform.OS === "web") return "Web Browser";
  if (Platform.OS === "ios") return "iPhone";
  if (Platform.OS === "android") return "Android";
  return Platform.OS ?? "Unknown";
}

export default function SessionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { appLanguage, terminateOtherSessions } = useSettings();
  const { user } = useAuth();
  const { showToast } = useToast();
  const modal = useModal();
  const { tap } = useFeedback();
  const styles = makeStyles(colors);
  const bottomPad = Platform.OS === "web" ? 32 : insets.bottom + 16;

  const thisDevice = currentDevice();

  const [sessions, setSessions] = useState<UserSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = useCallback(async (showRefresh = false) => {
    if (!user) return;
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const rows = await svc.fetchUserSessions(user.id);
      setSessions(rows);
    } catch {
      // fall through — show empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const others = sessions.filter(s => s.device !== thisDevice);

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
      onConfirm: async () => {
        tap();
        terminateOtherSessions();
        if (user) {
          await svc.deleteOtherSessions(user.id, thisDevice, "").catch(() => {});
          loadSessions();
        }
        showToast(t(appLanguage, "toast.sessionsTerminated", { n: others.length }), { type: "success" });
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
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSessions(true)} tintColor={colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : sessions.length === 0 ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>No session data yet. Sign in again to record your device.</Text>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {sessions.map((s, i) => {
              const isCurrent = s.device === thisDevice;
              return (
                <View key={s.id} style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: i === sessions.length - 1 ? 0 : 1 }]}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                    <Feather name={deviceIcon(s.device)} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.device, { color: colors.foreground }]} numberOfLines={1}>{s.device}</Text>
                      {isCurrent && (
                        <View style={[styles.badge, { backgroundColor: colors.appreciate + "22" }]}>
                          <Text style={[styles.badgeText, { color: colors.appreciate }]}>{t(appLanguage, "sessions.thisDevice")}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>{s.platform}</Text>
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                      {t(appLanguage, "sessions.lastActive")}: {isCurrent ? "now" : timeAgo(s.last_active) + " ago"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!loading && others.length > 0 ? (
          <TouchableOpacity onPress={onLogoutOthers} style={[styles.logoutBtn, { borderColor: colors.destructive }]} activeOpacity={0.8}>
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.logoutText, { color: colors.destructive }]}>{t(appLanguage, "sessions.logoutOthers")}</Text>
          </TouchableOpacity>
        ) : !loading && sessions.length > 0 ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t(appLanguage, "sessions.onlyThis")}</Text>
        ) : null}
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
    hint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 18 },
  });
}

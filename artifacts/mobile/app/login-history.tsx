import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { fetchSecurityLogs, type SecurityLogRow, type SecurityEventType } from "@/lib/thoughtsService";
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

const EVENT_LABELS: Record<SecurityEventType, string> = {
  login_success: "Login successful",
  login_fail: "Failed login attempt",
  password_change: "Password changed",
  signout: "Signed out",
  signup: "Account created",
};

type IconDef = { name: keyof typeof Feather.glyphMap; ok: boolean };
const EVENT_ICON: Record<SecurityEventType, IconDef> = {
  login_success: { name: "check", ok: true },
  login_fail: { name: "alert-triangle", ok: false },
  password_change: { name: "lock", ok: true },
  signout: { name: "log-out", ok: true },
  signup: { name: "user-plus", ok: true },
};

function LogRow({ item, colors }: { item: SecurityLogRow; colors: ReturnType<typeof useColors> }) {
  const icon = EVENT_ICON[item.event_type] ?? { name: "activity" as const, ok: true };
  const color = icon.ok ? colors.appreciate : colors.destructive;
  const label = EVENT_LABELS[item.event_type] ?? item.event_type;
  const device = (item.metadata?.device as string) ?? null;
  const platform = (item.metadata?.platform as string) ?? null;

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + "1A" }]}>
        <Feather name={icon.name} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.status, { color: colors.foreground }]}>{label}</Text>
        {(device || platform) ? (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {[device, platform].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {formatDate(item.created_at)}
        </Text>
      </View>
    </View>
  );
}

export default function LoginHistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { appLanguage } = useSettings();
  const bottomPad = Platform.OS === "web" ? 32 : insets.bottom + 16;

  const [logs, setLogs] = useState<SecurityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchSecurityLogs(user.id, 50);
      setLogs(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load login history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Stack.Screen options={{
        title: t(appLanguage, "history.title"),
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />

      {loading ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: bottomPad, gap: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
          renderItem={({ item }) => <LogRow item={item} colors={colors} />}
          ListHeaderComponent={
            error ? (
              <View style={[styles.errorBar, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "30" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="clock" size={20} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No login history found</Text>
            </View>
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorBar: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginTop: 2 },
  status: { fontSize: 14.5, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12.5, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyCard: { borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 20 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});

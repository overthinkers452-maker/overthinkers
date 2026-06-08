import React, { useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAdmin } from "@/hooks/useAdmin";
import { timeAgo } from "@/utils/format";
import type { ReportGroup } from "@/lib/thoughtsService";

export default function AdminScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin, queue, loading, actionLoading, error, refresh, dismiss, remove, warn } = useAdmin();

  useEffect(() => {
    if (!isAdmin) return;
    refresh();
  }, [isAdmin, refresh]);

  const onWarn = useCallback((group: ReportGroup) => {
    if (!group.authorId) return;
    Alert.prompt(
      "Warn user",
      "Enter the reason for this warning (it will count as a strike):",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Issue Strike",
          style: "destructive",
          onPress: (reason: string | undefined) => {
            if (reason?.trim()) warn(group, reason.trim());
          },
        },
      ],
      "plain-text",
      "",
    );
  }, [warn]);

  const s = makeStyles(colors);

  const renderItem = useCallback(({ item }: { item: ReportGroup }) => {
    const key = `${item.targetType}:${item.targetId}`;
    const busy = actionLoading === key;
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.cardHeader}>
          <View style={[s.typePill, { backgroundColor: item.targetType === "thought" ? colors.primary + "18" : colors.pseudonymousMode + "18", borderColor: item.targetType === "thought" ? colors.primary + "30" : colors.pseudonymousMode + "30" }]}>
            <Feather name={item.targetType === "thought" ? "file-text" : "message-circle"} size={11} color={item.targetType === "thought" ? colors.primary : colors.pseudonymousMode} />
            <Text style={[s.typePillText, { color: item.targetType === "thought" ? colors.primary : colors.pseudonymousMode }]}>
              {item.targetType}
            </Text>
          </View>
          <View style={[s.countPill, { backgroundColor: colors.disagree + "18" }]}>
            <Feather name="flag" size={11} color={colors.disagree} />
            <Text style={[s.countText, { color: colors.disagree }]}>{item.reportCount} report{item.reportCount !== 1 ? "s" : ""}</Text>
          </View>
          <Text style={[s.time, { color: colors.mutedForeground }]}>{timeAgo(item.latestAt)}</Text>
        </View>

        {item.contentSnippet ? (
          <Text style={[s.snippet, { color: colors.foreground }]} numberOfLines={3}>
            {item.contentSnippet}
          </Text>
        ) : (
          <Text style={[s.snippetMuted, { color: colors.mutedForeground }]}>Content unavailable</Text>
        )}

        <Text style={[s.reason, { color: colors.mutedForeground }]}>
          <Text style={{ fontFamily: "Inter_600SemiBold" }}>Latest reason: </Text>
          {item.latestReason}
        </Text>

        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 10 }} />
        ) : (
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => dismiss(item)}
              activeOpacity={0.7}
            >
              <Feather name="check" size={14} color={colors.mutedForeground} />
              <Text style={[s.actionText, { color: colors.mutedForeground }]}>Dismiss</Text>
            </TouchableOpacity>
            {item.authorId && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" }]}
                onPress={() => onWarn(item)}
                activeOpacity={0.7}
              >
                <Feather name="alert-triangle" size={14} color="#F97316" />
                <Text style={[s.actionText, { color: "#F97316" }]}>Warn</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.disagree + "12", borderColor: colors.disagree + "40" }]}
              onPress={() => remove(item)}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={14} color={colors.disagree} />
              <Text style={[s.actionText, { color: colors.disagree }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [actionLoading, colors, dismiss, remove, onWarn, s]);

  if (!isAdmin) {
    return (
      <>
        <Stack.Screen options={{
          title: "Not Found",
          headerStyle: { backgroundColor: colors.background } as any,
          headerTintColor: colors.primary,
        }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={{ marginTop: 16, fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Access Denied</Text>
          <Text style={{ marginTop: 8, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Admin access required.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{
        title: "Admin Panel",
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />

      <FlatList
        data={queue}
        keyExtractor={(item) => `${item.targetType}:${item.targetId}`}
        renderItem={renderItem}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 20 }]}
        style={{ backgroundColor: colors.background }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={s.header}>
            <Feather name="shield" size={16} color={colors.primary} />
            <Text style={[s.headerTitle, { color: colors.foreground }]}>
              Report Queue
            </Text>
            <Text style={[s.headerCount, { color: colors.mutedForeground }]}>
              {queue.length} item{queue.length !== 1 ? "s" : ""}
            </Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              {error ? (
                <>
                  <Feather name="alert-circle" size={36} color={colors.disagree} />
                  <Text style={[s.emptyText, { color: colors.mutedForeground }]}>{error}</Text>
                </>
              ) : (
                <>
                  <Feather name="check-circle" size={36} color={colors.primary} />
                  <Text style={[s.emptyText, { color: colors.mutedForeground }]}>All clear — no pending reports</Text>
                </>
              )}
            </View>
          ) : null
        }
      />
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    list: { paddingTop: 12, paddingHorizontal: 12 },
    header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, paddingBottom: 12 },
    headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 },
    headerCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
    card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    typePill: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    typePillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    countPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    countText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    time: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: "auto" },
    snippet: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", marginBottom: 8 },
    snippetMuted: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", marginBottom: 8 },
    reason: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 17 },
    actions: { flexDirection: "row", gap: 8 },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 8 },
    actionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}

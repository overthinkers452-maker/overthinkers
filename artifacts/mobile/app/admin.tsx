import React, { useEffect, useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { Stack, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAdmin } from "@/hooks/useAdmin";
import { timeAgo } from "@/utils/format";
import type { ReportGroup } from "@/lib/thoughtsService";

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAdmin, isModerator, canAct, queue, loading, actionLoading, error, refresh, dismiss, remove, warn, ban } = useAdmin();

  const [warnTarget, setWarnTarget] = useState<ReportGroup | null>(null);
  const [warnReason, setWarnReason] = useState("");
  const [warnBusy, setWarnBusy] = useState(false);
  const [banTarget, setBanTarget] = useState<ReportGroup | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banBusy, setBanBusy] = useState(false);

  useEffect(() => {
    if (!canAct) return;
    refresh();
  }, [canAct, refresh]);

  const onWarnPress = useCallback((group: ReportGroup) => {
    if (!group.authorId) return;
    setWarnTarget(group);
    setWarnReason("");
  }, []);

  const onBanPress = useCallback((group: ReportGroup) => {
    if (!group.authorId) return;
    setBanTarget(group);
    setBanReason("");
  }, []);

  const onBanSubmit = useCallback(async () => {
    if (!banTarget || !banReason.trim()) return;
    setBanBusy(true);
    try {
      await ban(banTarget, banReason.trim());
      setBanTarget(null);
      setBanReason("");
    } finally {
      setBanBusy(false);
    }
  }, [banTarget, banReason, ban]);

  const onWarnSubmit = useCallback(async () => {
    if (!warnTarget || !warnReason.trim()) return;
    setWarnBusy(true);
    try {
      await warn(warnTarget, warnReason.trim());
      setWarnTarget(null);
      setWarnReason("");
    } finally {
      setWarnBusy(false);
    }
  }, [warnTarget, warnReason, warn]);

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
                onPress={() => onWarnPress(item)}
                activeOpacity={0.7}
              >
                <Feather name="alert-triangle" size={14} color="#F97316" />
                <Text style={[s.actionText, { color: "#F97316" }]}>Warn</Text>
              </TouchableOpacity>
            )}
            {item.authorId && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}
                onPress={() => onBanPress(item)}
                activeOpacity={0.7}
              >
                <Feather name="slash" size={14} color="#EF4444" />
                <Text style={[s.actionText, { color: "#EF4444" }]}>Ban</Text>
              </TouchableOpacity>
            )}
            {isAdmin && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.disagree + "12", borderColor: colors.disagree + "40" }]}
                onPress={() => remove(item)}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={14} color={colors.disagree} />
                <Text style={[s.actionText, { color: colors.disagree }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }, [actionLoading, colors, dismiss, remove, onWarnPress, s]);

  if (!canAct) {
    return <Redirect href="/+not-found" />;
  }

  return (
    <>
      <Stack.Screen options={{
        title: isAdmin ? "Admin Panel" : "Moderator Panel",
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
          <View>
            <View style={s.header}>
              <Feather name="shield" size={16} color={colors.primary} />
              <Text style={[s.headerTitle, { color: colors.foreground }]}>Report Queue</Text>
              <Text style={[s.headerCount, { color: colors.mutedForeground }]}>
                {queue.length} item{queue.length !== 1 ? "s" : ""}
              </Text>
            </View>
            {error && (
              <View style={[s.errorBar, { backgroundColor: colors.disagree + "18", borderColor: colors.disagree + "30" }]}>
                <Feather name="alert-circle" size={14} color={colors.disagree} />
                <Text style={[s.errorText, { color: colors.disagree }]}>{error}</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Feather name="check-circle" size={36} color={colors.primary} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>All clear — no pending reports</Text>
            </View>
          ) : null
        }
      />

      {/* Warn modal */}
      <Modal
        visible={warnTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setWarnTarget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.modalOverlay}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setWarnTarget(null)} />
          <View style={[s.warnModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.warnHandle} />
            <Text style={[s.warnTitle, { color: colors.foreground }]}>Issue Warning & Strike</Text>
            <Text style={[s.warnSubtitle, { color: colors.mutedForeground }]}>
              The user will receive a notification: "Your content violated community guidelines." and their strike count will increase.
            </Text>
            <TextInput
              value={warnReason}
              onChangeText={setWarnReason}
              placeholder="Reason (shown in moderation log)…"
              placeholderTextColor={colors.mutedForeground}
              style={[s.warnInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              multiline
              autoFocus
              returnKeyType="done"
            />
            <View style={s.warnActions}>
              <TouchableOpacity
                style={[s.warnBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => setWarnTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={[s.warnBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.warnBtn, { backgroundColor: "#F97316", borderColor: "#F97316", opacity: warnReason.trim() ? 1 : 0.4 }]}
                onPress={onWarnSubmit}
                activeOpacity={0.7}
                disabled={!warnReason.trim() || warnBusy}
              >
                {warnBusy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[s.warnBtnText, { color: "#fff" }]}>Issue Strike</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ban modal */}
      <Modal
        visible={banTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setBanTarget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.modalOverlay}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setBanTarget(null)} />
          <View style={[s.warnModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.warnHandle} />
            <Text style={[s.warnTitle, { color: "#EF4444" }]}>Ban User</Text>
            <Text style={[s.warnSubtitle, { color: colors.mutedForeground }]}>
              The user will be immediately signed out and permanently prevented from accessing the platform.
            </Text>
            <TextInput
              value={banReason}
              onChangeText={setBanReason}
              placeholder="Reason for ban…"
              placeholderTextColor={colors.mutedForeground}
              style={[s.warnInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              multiline
              autoFocus
              returnKeyType="done"
            />
            <View style={s.warnActions}>
              <TouchableOpacity
                style={[s.warnBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => setBanTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={[s.warnBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.warnBtn, { backgroundColor: "#EF4444", borderColor: "#EF4444", opacity: banReason.trim() ? 1 : 0.4 }]}
                onPress={onBanSubmit}
                activeOpacity={0.7}
                disabled={!banReason.trim() || banBusy}
              >
                {banBusy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[s.warnBtnText, { color: "#fff" }]}>Ban User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    list: { paddingTop: 12, paddingHorizontal: 12 },
    header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, paddingBottom: 8 },
    headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 },
    headerCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
    errorBar: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
    errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
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
    modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 20 },
    warnModal: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 20 },
    warnHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#ccc", alignSelf: "center", marginBottom: 16 },
    warnTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 8 },
    warnSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 14 },
    warnInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80, textAlignVertical: "top", marginBottom: 16 },
    warnActions: { flexDirection: "row", gap: 10 },
    warnBtn: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 10, paddingVertical: 12 },
    warnBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  });
}

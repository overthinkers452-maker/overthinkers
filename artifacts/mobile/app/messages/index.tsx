import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { timeAgo } from "@/utils/format";
import * as svc from "@/lib/thoughtsService";
import type { ConversationSummary } from "@/lib/thoughtsService";

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const s = makeStyles(colors);

  const [convos, setConvos] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (!user) return;
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await svc.fetchConversations(user.id);
      data.sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });
      setConvos(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const renderItem = useCallback(({ item }: { item: ConversationSummary }) => (
    <TouchableOpacity
      style={[s.row, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/messages/${item.id}` as any)}
      activeOpacity={0.75}
    >
      <View style={[s.avatar, { backgroundColor: colors.secondary }]}>
        {item.otherUserAvatar ? (
          <Image source={{ uri: item.otherUserAvatar }} style={s.avatarImg} />
        ) : (
          <Feather name="user" size={22} color={colors.mutedForeground} />
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={s.rowTop}>
          <Text style={[s.name, { color: colors.foreground }]} numberOfLines={1}>
            {item.otherUserName}
          </Text>
          {item.lastMessageAt ? (
            <Text style={[s.time, { color: colors.mutedForeground }]}>
              {timeAgo(item.lastMessageAt)}
            </Text>
          ) : null}
        </View>
        <Text style={[s.preview, { color: item.unreadCount > 0 ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
          {item.lastMessage || "No messages yet"}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={[s.badge, { backgroundColor: colors.primary }]}>
          <Text style={s.badgeText}>{item.unreadCount > 9 ? "9+" : item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  ), [colors, router, s]);

  return (
    <>
      <Stack.Screen options={{
        title: "Messages",
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <FlatList
        data={convos}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        style={{ backgroundColor: colors.background, flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Feather name="message-circle" size={44} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
              <Text style={[s.emptyHint, { color: colors.mutedForeground }]}>
                Visit someone's profile and tap the message icon to start a conversation.
              </Text>
            </View>
          ) : null
        }
      />
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImg: { width: 48, height: 48, borderRadius: 24 },
    rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    name: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
    time: { fontSize: 12, fontFamily: "Inter_400Regular" },
    preview: { fontSize: 13.5, fontFamily: "Inter_400Regular" },
    badge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginLeft: 8 },
    badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
    emptyHint: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  });
}

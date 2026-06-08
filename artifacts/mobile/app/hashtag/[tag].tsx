import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { Thought } from "@/context/AppContext";
import * as svc from "@/lib/thoughtsService";

const PAGE_SIZE = 20;

export default function HashtagScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const { user } = useAuth();

  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const loadInitial = useCallback(async () => {
    if (!tag) return;
    setLoading(true);
    try {
      const data = await svc.fetchHashtagFeed(tag, user?.id, PAGE_SIZE, 0);
      setThoughts(data);
      setHasMore(data.length === PAGE_SIZE);
      setOffset(data.length);
    } catch {
      // keep empty state
    } finally {
      setLoading(false);
    }
  }, [tag, user?.id]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!tag || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await svc.fetchHashtagFeed(tag, user?.id, PAGE_SIZE, offset);
      if (data.length > 0) {
        setThoughts(prev => {
          const ids = new Set(prev.map(t => t.id));
          return [...prev, ...data.filter(t => !ids.has(t.id))];
        });
      }
      setHasMore(data.length === PAGE_SIZE);
      setOffset(prev => prev + data.length);
    } catch {
      // keep existing list
    } finally {
      setLoadingMore(false);
    }
  }, [tag, user?.id, offset, loadingMore, hasMore]);

  const s = makeStyles(colors);
  const displayTag = tag ? `#${tag.replace(/^#/, "")}` : "";

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={[s.title, { color: colors.primary }]}>{displayTag}</Text>
          {!loading && (
            <Text style={[s.subtitle, { color: colors.mutedForeground }]}>{thoughts.length} thoughts</Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={thoughts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ThoughtCard thought={item} showReason={false} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="hash" size={36} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No thoughts yet</Text>
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
                Be the first to use {displayTag}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { padding: 2 },
    titleWrap: { flex: 1 },
    title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
    subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: { paddingTop: 80, alignItems: "center", gap: 10, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 8 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  });
}

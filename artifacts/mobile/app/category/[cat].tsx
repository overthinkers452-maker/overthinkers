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

const CATEGORY_ICONS: Record<string, string> = {
  Love: "❤️",
  Life: "🌱",
  Career: "💼",
  Friendship: "🤝",
  Family: "🏠",
  Motivation: "🔥",
  Anxiety: "😮‍💨",
  Funny: "😂",
  Confessions: "🤫",
  Other: "💭",
};

type SortMode = "Latest" | "Trending";

export default function CategoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cat } = useLocalSearchParams<{ cat: string }>();
  const { user } = useAuth();

  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("Latest");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const loadInitial = useCallback(async (mode: SortMode) => {
    if (!cat) return;
    setLoading(true);
    setThoughts([]);
    setOffset(0);
    setHasMore(true);
    try {
      const data = await svc.fetchFeed({
        userId: user?.id,
        feedType: mode === "Trending" ? "Trending" : "Latest",
        category: cat,
        limit: PAGE_SIZE,
        offset: 0,
      });
      setThoughts(data);
      setHasMore(data.length === PAGE_SIZE);
      setOffset(data.length);
    } catch {
      // keep empty state
    } finally {
      setLoading(false);
    }
  }, [cat, user?.id]);

  useEffect(() => {
    loadInitial(sortMode);
  }, [loadInitial, sortMode]);

  const loadMore = useCallback(async () => {
    if (!cat || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await svc.fetchFeed({
        userId: user?.id,
        feedType: sortMode === "Trending" ? "Trending" : "Latest",
        category: cat,
        limit: PAGE_SIZE,
        offset,
      });
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
  }, [cat, user?.id, offset, loadingMore, hasMore, sortMode]);

  const s = makeStyles(colors);
  const emoji = CATEGORY_ICONS[cat ?? ""] ?? "💡";

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[s.emojiWrap, { backgroundColor: colors.primary + "18" }]}>
          <Text style={s.emoji}>{emoji}</Text>
        </View>
        <View style={s.titleWrap}>
          <Text style={[s.title, { color: colors.foreground }]}>{cat}</Text>
          {!loading && (
            <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
              {thoughts.length}{hasMore ? "+" : ""} thoughts
            </Text>
          )}
        </View>
      </View>

      <View style={[s.sortBar, { borderBottomColor: colors.border }]}>
        {(["Latest", "Trending"] as SortMode[]).map(mode => (
          <TouchableOpacity
            key={mode}
            onPress={() => { if (mode !== sortMode) setSortMode(mode); }}
            style={[s.sortTab, sortMode === mode && s.sortTabActive]}
            activeOpacity={0.7}
          >
            <Feather
              name={mode === "Latest" ? "clock" : "trending-up"}
              size={13}
              color={sortMode === mode ? colors.primary : colors.mutedForeground}
            />
            <Text style={[
              s.sortText,
              { color: sortMode === mode ? colors.primary : colors.mutedForeground,
                fontFamily: sortMode === mode ? "Inter_600SemiBold" : "Inter_400Regular" },
            ]}>
              {mode}
            </Text>
            {sortMode === mode && (
              <View style={[s.sortIndicator, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
        ))}
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
          contentContainerStyle={{ paddingBottom: 40 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
              : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>{emoji}</Text>
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No thoughts yet</Text>
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
                Be the first to share a thought in {cat}
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    backBtn: { padding: 2 },
    emojiWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    emoji: { fontSize: 20 },
    titleWrap: { flex: 1 },
    title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
    subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
    sortBar: {
      flexDirection: "row",
      borderBottomWidth: 1,
      paddingHorizontal: 16,
    },
    sortTab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 12,
      paddingHorizontal: 4,
      marginRight: 20,
      position: "relative",
    },
    sortTabActive: {},
    sortText: { fontSize: 14 },
    sortIndicator: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 2,
      borderRadius: 1,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: { paddingTop: 80, alignItems: "center", gap: 10, paddingHorizontal: 40 },
    emptyEmoji: { fontSize: 40, marginBottom: 4 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  });
}

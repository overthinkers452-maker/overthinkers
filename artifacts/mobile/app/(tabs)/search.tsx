import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
  ScrollView, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApp, Thought } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { formatCount } from "@/utils/format";
import * as svc from "@/lib/thoughtsService";
import type { TrendingMention } from "@/lib/thoughtsService";

const TRENDING = ["consciousness", "AI relationships", "free will", "loneliness", "identity", "productivity"];
const CATEGORIES = ["Love", "Life", "Career", "Friendship", "Family", "Motivation", "Anxiety", "Funny", "Confessions", "Other"];

type ResultTab = "Thoughts" | "People" | "Hashtags";

interface PersonResult {
  id: string;
  display_name: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  followers_count: number;
  thoughts_count: number;
}

interface HashtagResult {
  id: string;
  tag: string;
  usage_count: number;
}

const AVATAR_COLORS = ["#C8D8FF", "#C8F5D8", "#E8C8FF", "#FFE8C8", "#C8FFEE", "#FFD8E8"];
function avatarColor(username: string) {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function SearchTabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { followedUsers, toggleFollowUser } = useApp();
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ResultTab>("Thoughts");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [thoughtResults, setThoughtResults] = useState<Thought[]>([]);
  const [peopleResults, setPeopleResults] = useState<PersonResult[]>([]);
  const [hashtagResults, setHashtagResults] = useState<HashtagResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [trendingMentions, setTrendingMentions] = useState<TrendingMention[]>([]);
  const [mentionsLoading, setMentionsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    svc.fetchTrendingMentions(5)
      .then(setTrendingMentions)
      .catch(() => {})
      .finally(() => setMentionsLoading(false));
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  const runSearch = useCallback(async (q: string, cat: string | null) => {
    if (!q.trim()) {
      setThoughtResults([]);
      setPeopleResults([]);
      setHashtagResults([]);
      return;
    }
    setSearching(true);
    try {
      const [tRes, pRes, hRes] = await Promise.all([
        svc.searchThoughts(q.trim(), user?.id, cat),
        svc.searchProfiles(q.trim()),
        svc.searchHashtags(q.trim()),
      ]);
      setThoughtResults(tRes);
      setPeopleResults(pRes as PersonResult[]);
      setHashtagResults(hRes as HashtagResult[]);
    } catch {
      // keep previous results
    } finally {
      setSearching(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query, categoryFilter), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, categoryFilter, runSearch]);

  const hasQuery = query.trim().length > 0;
  const totalResults = tab === "Thoughts" ? thoughtResults.length : tab === "People" ? peopleResults.length : hashtagResults.length;
  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: topPad, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Search</Text>
      </View>

      <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder="Search thoughts, people, hashtags..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {!hasQuery ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
          {/* Trending Mentions */}
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Feather name="at-sign" size={13} color={colors.primary} />
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, paddingTop: 0, paddingBottom: 0 }]}>
              TRENDING MENTIONS · LAST 24H
            </Text>
          </View>
          {mentionsLoading ? (
            <ActivityIndicator size={18} color={colors.mutedForeground} style={{ marginVertical: 18 }} />
          ) : trendingMentions.length === 0 ? (
            <Text style={[styles.mentionEmpty, { color: colors.mutedForeground }]}>No mention activity yet</Text>
          ) : (
            trendingMentions.map((m, idx) => (
              <TouchableOpacity
                key={m.userId}
                onPress={() => router.push({ pathname: "/profile/[userId]", params: { userId: m.userId } })}
                style={[styles.mentionRow, { borderBottomColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.mentionRank, { color: colors.mutedForeground }]}>{idx + 1}</Text>
                <View style={[styles.mentionAvatar, { backgroundColor: avatarColor(m.username) }]}>
                  <Text style={styles.mentionInitial}>
                    {(m.displayName[0] ?? m.username[0] ?? "?").toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mentionName, { color: colors.foreground }]} numberOfLines={1}>
                    {m.displayName}
                  </Text>
                  <Text style={[styles.mentionMeta, { color: colors.mutedForeground }]}>
                    @{m.username} · {formatCount(m.followersCount)} followers
                  </Text>
                </View>
                <View style={[styles.mentionBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.mentionBadgeText, { color: colors.primary }]}>
                    {m.mentionCount} @
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* Trending Searches */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>TRENDING SEARCHES</Text>
          {TRENDING.map(term => (
            <TouchableOpacity
              key={term}
              onPress={() => setQuery(term)}
              style={[styles.trendRow, { borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.trendIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="trending-up" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.trendText, { color: colors.foreground }]}>{term}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <>
          {/* Result tabs */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            {(["Thoughts", "People", "Hashtags"] as ResultTab[]).map(t => (
              <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]} activeOpacity={0.7}>
                <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground, fontFamily: tab === t ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                  {t}
                </Text>
                {tab === t && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            ))}
            {searching ? (
              <ActivityIndicator size={12} color={colors.mutedForeground} style={{ marginLeft: "auto", marginRight: 4 }} />
            ) : (
              <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>{totalResults} results</Text>
            )}
          </View>

          {/* Category filter row — only shown in Thoughts tab */}
          {tab === "Thoughts" && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.categoryBar, { borderBottomColor: colors.border }]}
              contentContainerStyle={styles.categoryContent}
            >
              <TouchableOpacity
                onPress={() => setCategoryFilter(null)}
                style={[styles.catChip, { backgroundColor: !categoryFilter ? colors.primary : colors.secondary, borderColor: !categoryFilter ? colors.primary : colors.border }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.catText, { color: !categoryFilter ? "#fff" : colors.foreground }]}>All</Text>
              </TouchableOpacity>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                  style={[styles.catChip, { backgroundColor: categoryFilter === cat ? colors.primary : colors.secondary, borderColor: categoryFilter === cat ? colors.primary : colors.border }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catText, { color: categoryFilter === cat ? "#fff" : colors.foreground }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {tab === "Thoughts" ? (
            <FlatList
              data={thoughtResults}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <ThoughtCard thought={item} showReason={false} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottomPad }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Feather name="search" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No thoughts matching "{query}"</Text>
                </View>
              }
            />
          ) : tab === "People" ? (
            <FlatList
              data={peopleResults}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottomPad }}
              renderItem={({ item }) => {
                const followed = followedUsers.has(item.id);
                return (
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/profile/[userId]", params: { userId: item.id } })}
                    style={[styles.personRow, { borderBottomColor: colors.border }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.personAvatar, { backgroundColor: colors.primary + "25" }]}>
                      <Text style={[styles.personInitials, { color: colors.primary }]}>
                        {item.display_name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.personName, { color: colors.foreground }]}>{item.display_name}</Text>
                      <Text style={[styles.personMeta, { color: colors.mutedForeground }]}>
                        @{item.username} · {item.thoughts_count} thoughts · {formatCount(item.followers_count)} followers
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleFollowUser(item.id)}
                      style={[styles.followBtn, { backgroundColor: followed ? "transparent" : colors.primary, borderColor: followed ? colors.border : colors.primary }]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.followText, { color: followed ? colors.foreground : "#fff" }]}>
                        {followed ? "Following" : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Feather name="users" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No public users matching "{query}"</Text>
                </View>
              }
            />
          ) : (
            /* Hashtags tab */
            <FlatList
              data={hashtagResults}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottomPad }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/hashtag/[tag]", params: { tag: item.tag } })}
                  style={[styles.hashtagRow, { borderBottomColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.hashtagIcon, { backgroundColor: colors.primary + "18" }]}>
                    <Text style={[styles.hashtagSymbol, { color: colors.primary }]}>#</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.hashtagName, { color: colors.foreground }]}>#{item.tag}</Text>
                    <Text style={[styles.hashtagCount, { color: colors.mutedForeground }]}>{item.usage_count} thoughts</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Feather name="hash" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No hashtags matching "{query}"</Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
    inputWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 14, marginVertical: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
    trendRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
    trendIcon: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    trendText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
    tabBar: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16 },
    tab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 20, position: "relative" },
    tabActive: {},
    tabText: { fontSize: 15 },
    tabIndicator: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },
    resultCount: { marginLeft: "auto", fontSize: 12, fontFamily: "Inter_400Regular", paddingVertical: 12 },
    categoryBar: { borderBottomWidth: 1 },
    categoryContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
    catChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    catText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    personRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    personAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    personInitials: { fontSize: 15, fontFamily: "Inter_700Bold" },
    personName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
    personMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
    followBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
    followText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    hashtagRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    hashtagIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    hashtagSymbol: { fontSize: 20, fontFamily: "Inter_700Bold" },
    hashtagName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
    hashtagCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
    empty: { paddingTop: 60, alignItems: "center", gap: 10 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1 },
    mentionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
    mentionRank: { width: 18, fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
    mentionAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    mentionInitial: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#333" },
    mentionName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
    mentionMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
    mentionBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    mentionBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    mentionEmpty: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 16 },
  });
}

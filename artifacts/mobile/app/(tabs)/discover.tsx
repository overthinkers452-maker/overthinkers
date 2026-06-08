import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { formatCount } from "@/utils/format";
import * as svc from "@/lib/thoughtsService";
import type { LeaderboardEntry } from "@/lib/thoughtsService";

type DiscoverTab = "Explore" | "Leaderboard";
const TRENDING_SEARCHES = ["consciousness", "AI relationships", "free will", "loneliness", "identity"];
const CATEGORIES_GRID = ["Psychology","Society","Relationships","Tech","Creativity","Philosophy","Culture","Science","Politics","Health"];
const BADGE_COLORS: Record<string, string> = { Elder: "#FBBF24", Insightful: "#C084FC", Thoughtful: "#818CF8", Newcomer: "#6EE7B7" };
const AVATAR_BG_POOL = ["#C8F5D8","#C8D8FF","#E8C8FF","#FFE8C8","#C8FFEE","#FFD8E8"];
function avatarBg(index: number) { return AVATAR_BG_POOL[index % AVATAR_BG_POOL.length]; }

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { thoughts, followedUsers, toggleFollowUser } = useApp();
  const [activeTab, setActiveTab] = useState<DiscoverTab>("Explore");
  const [search, setSearch] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const data = await svc.fetchLeaderboard();
      setLeaderboard(data.map((e, i) => ({ ...e, rank: i + 1 })) as any);
    } catch {}
    setLeaderboardLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "Leaderboard" && leaderboard.length === 0) {
      loadLeaderboard();
    }
  }, [activeTab]);

  const leaderboardWithRanks = useMemo(() =>
    leaderboard.map((e, i) => ({ ...e, rank: i + 1 })),
    [leaderboard]
  );
  const top3 = leaderboardWithRanks.slice(0, 3);
  const rest = leaderboardWithRanks.slice(3);

  const trendingThoughts = useMemo(() =>
    [...thoughts].sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 4),
    [thoughts]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of thoughts) counts[t.category] = (counts[t.category] || 0) + 1;
    return counts;
  }, [thoughts]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return thoughts.filter(t =>
      t.content.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.authorName.toLowerCase().includes(q) ||
      (t.alias || "").toLowerCase().includes(q)
    );
  }, [thoughts, search]);

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput style={[styles.searchInput, { color: colors.foreground }]} placeholder="Search thoughts, topics, people..." placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} returnKeyType="search" />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")}><Feather name="x" size={15} color={colors.mutedForeground} /></TouchableOpacity>}
      </View>

      {searchResults ? (
        <FlatList data={searchResults} keyExtractor={item => item.id} renderItem={({ item }) => <ThoughtCard thought={item} showReason={false} />} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
          ListEmptyComponent={<View style={styles.emptyState}><Feather name="search" size={28} color={colors.mutedForeground} /><Text style={styles.emptyText}>No results for "{search}"</Text></View>}
        />
      ) : (
        <>
          <View style={[styles.discoverTabBar, { borderBottomColor: colors.border }]}>
            {(["Explore", "Leaderboard"] as DiscoverTab[]).map(tab => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.discoverTab, activeTab === tab && styles.discoverTabActive]} activeOpacity={0.7}>
                <Feather name={tab === "Explore" ? "compass" : "award"} size={14} color={activeTab === tab ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.discoverTabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground, fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_500Medium" }]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === "Explore" ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 16 }}>
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TRENDING SEARCHES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRow}>
                  {TRENDING_SEARCHES.map(term => (
                    <TouchableOpacity key={term} onPress={() => setSearch(term)} style={[styles.trendChip, { borderColor: colors.border, backgroundColor: colors.card }]} activeOpacity={0.8}>
                      <Feather name="trending-up" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.trendChipText, { color: colors.foreground }]}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Categories</Text>
                <View style={styles.categoriesGrid}>
                  {CATEGORIES_GRID.map(cat => (
                    <TouchableOpacity key={cat} style={[styles.categoryCard, { borderColor: colors.border, backgroundColor: colors.card }]} activeOpacity={0.8} onPress={() => router.push({ pathname: "/category/[cat]", params: { cat } })}>
                      <Text style={[styles.categoryCardName, { color: colors.foreground }]}>{cat}</Text>
                      <Text style={[styles.categoryCardCount, { color: colors.mutedForeground }]}>{categoryCounts[cat] || 0} thoughts</Text>
                      <View style={[styles.categoryCardLine, { backgroundColor: colors.primary }]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trending Now</Text>
              </View>
              {trendingThoughts.map(t => <ThoughtCard key={t.id} thought={t} showReason={true} />)}
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 16 }}>
              {leaderboardLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading leaderboard…</Text>
                </View>
              ) : (
                <>
                  {top3.length > 0 && (
                    <View style={[styles.podium, { borderBottomColor: colors.border }]}>
                      {/* 2nd place */}
                      {top3[1] ? (
                        <TouchableOpacity style={styles.podiumSide} activeOpacity={0.8} onPress={() => router.push({ pathname: "/profile/[userId]", params: { userId: top3[1].authorId, name: top3[1].name } })}>
                          <View style={[styles.podiumAvatarSm, { backgroundColor: avatarBg(1) }]}><Text style={styles.podiumInitialsSm}>{top3[1].name.slice(0,2).toUpperCase()}</Text></View>
                          <View style={[styles.rankBadgeSm, { backgroundColor: "#7A7A90" }]}><Text style={styles.rankBadgeText}>#2</Text></View>
                          <Text style={styles.podiumName} numberOfLines={1}>{top3[1].name}</Text>
                          <View style={[styles.podiumBadgeChip, { backgroundColor: (BADGE_COLORS[top3[1].badge]||"#818CF8")+"30" }]}><Text style={[styles.podiumBadgeText, { color: BADGE_COLORS[top3[1].badge]||"#818CF8" }]}>{top3[1].badge}</Text></View>
                          <Text style={[styles.podiumCount, { color: colors.mutedForeground }]}>{formatCount(top3[1].appreciated)} rep</Text>
                        </TouchableOpacity>
                      ) : <View style={styles.podiumSide} />}

                      {/* 1st place */}
                      <TouchableOpacity style={styles.podiumCenter} activeOpacity={0.8} onPress={() => router.push({ pathname: "/profile/[userId]", params: { userId: top3[0].authorId, name: top3[0].name } })}>
                        <Text style={[styles.podiumFirstLabel, { color: colors.foreground }]}>1st</Text>
                        <View style={[styles.podiumAvatarLg, { backgroundColor: avatarBg(0) }]}><Text style={styles.podiumInitialsLg}>{top3[0].name.slice(0,2).toUpperCase()}</Text></View>
                        <View style={[styles.rankBadgeLg, { backgroundColor: "#F59E0B" }]}><Text style={styles.rankBadgeText}>#1</Text></View>
                        <Text style={[styles.podiumName, { fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground }]}>{top3[0].name}</Text>
                        <View style={[styles.podiumBadgeChip, { backgroundColor: (BADGE_COLORS[top3[0].badge]||"#FBBF24")+"30" }]}><Text style={[styles.podiumBadgeText, { color: BADGE_COLORS[top3[0].badge]||"#FBBF24" }]}>{top3[0].badge}</Text></View>
                        <Text style={[styles.podiumCount, { color: colors.mutedForeground }]}>{formatCount(top3[0].appreciated)} rep</Text>
                      </TouchableOpacity>

                      {/* 3rd place */}
                      {top3[2] ? (
                        <TouchableOpacity style={styles.podiumSide} activeOpacity={0.8} onPress={() => router.push({ pathname: "/profile/[userId]", params: { userId: top3[2].authorId, name: top3[2].name } })}>
                          <View style={[styles.podiumAvatarSm, { backgroundColor: avatarBg(2) }]}><Text style={styles.podiumInitialsSm}>{top3[2].name.slice(0,2).toUpperCase()}</Text></View>
                          <View style={[styles.rankBadgeSm, { backgroundColor: "#9088CC" }]}><Text style={styles.rankBadgeText}>#3</Text></View>
                          <Text style={styles.podiumName} numberOfLines={1}>{top3[2].name}</Text>
                          <View style={[styles.podiumBadgeChip, { backgroundColor: (BADGE_COLORS[top3[2].badge]||"#C084FC")+"30" }]}><Text style={[styles.podiumBadgeText, { color: BADGE_COLORS[top3[2].badge]||"#C084FC" }]}>{top3[2].badge}</Text></View>
                          <Text style={[styles.podiumCount, { color: colors.mutedForeground }]}>{formatCount(top3[2].appreciated)} rep</Text>
                        </TouchableOpacity>
                      ) : <View style={styles.podiumSide} />}
                    </View>
                  )}

                  {leaderboard.length === 0 && (
                    <View style={styles.emptyState}>
                      <Feather name="award" size={28} color={colors.mutedForeground} />
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No public authors yet.</Text>
                    </View>
                  )}

                  {rest.map((entry: any) => {
                    const followed = followedUsers.has(entry.authorId);
                    const badgeColor = BADGE_COLORS[entry.badge] || "#818CF8";
                    return (
                      <TouchableOpacity key={entry.authorId} onPress={() => router.push({ pathname: "/profile/[userId]", params: { userId: entry.authorId, name: entry.name } })} style={[styles.rankRow, { borderBottomColor: colors.border }]} activeOpacity={0.8}>
                        <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>#{entry.rank}</Text>
                        <View style={[styles.rankAvatar, { backgroundColor: avatarBg(entry.rank) }]}>
                          <Text style={[styles.rankAvatarText, { color: "#2D2D50" }]}>{entry.name.slice(0,2).toUpperCase()}</Text>
                        </View>
                        <View style={styles.rankInfo}>
                          <Text style={[styles.rankName, { color: colors.foreground }]} numberOfLines={1}>{entry.name}</Text>
                          <View style={styles.rankMeta}>
                            <View style={[styles.rankBadgeChip, { backgroundColor: badgeColor+"25" }]}><Text style={[styles.rankBadgeLabel, { color: badgeColor }]}>{entry.badge}</Text></View>
                            <Text style={[styles.rankCount, { color: colors.mutedForeground }]}>{formatCount(entry.appreciated)} rep</Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => toggleFollowUser(entry.authorId)} style={[styles.followBtn, { backgroundColor: followed ? "transparent" : colors.primary, borderColor: followed ? colors.border : colors.primary }]} activeOpacity={0.8}>
                          <Text style={[styles.followText, { color: followed ? colors.foreground : "#fff" }]}>{followed ? "Following" : "Follow"}</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingVertical: 10 },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.5 },
    searchContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
    discoverTabBar: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 16 },
    discoverTab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
    discoverTabActive: { borderBottomColor: colors.primary },
    discoverTabText: { fontSize: 14 },
    section: { paddingHorizontal: 16, paddingTop: 12 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 10 },
    trendingRow: { paddingBottom: 4, gap: 8 },
    trendChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    trendChipText: { fontSize: 13, fontFamily: "Inter_400Regular" },
    categoriesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
    categoryCard: { width: "47%", borderWidth: 1, borderRadius: 10, padding: 12, overflow: "hidden" },
    categoryCardName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
    categoryCardCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 10 },
    categoryCardLine: { height: 3, width: 28, borderRadius: 2, marginTop: 4 },
    emptyState: { paddingTop: 60, alignItems: "center", gap: 10 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#999" },
    podium: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, gap: 8 },
    podiumCenter: { flex: 1, alignItems: "center" },
    podiumSide: { flex: 1, alignItems: "center", paddingTop: 20 },
    podiumFirstLabel: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 6 },
    podiumAvatarLg: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    podiumAvatarSm: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    podiumInitialsLg: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#2D2D50" },
    podiumInitialsSm: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#2D2D50" },
    rankBadgeLg: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: -12, marginBottom: 4 },
    rankBadgeSm: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: -10, marginBottom: 4 },
    rankBadgeText: { fontSize: 10, color: "#fff", fontFamily: "Inter_700Bold" },
    podiumName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#1A1A2E", textAlign: "center", marginBottom: 3 },
    podiumBadgeChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 3 },
    podiumBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    podiumCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
    rankRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
    rankNum: { fontSize: 13, fontFamily: "Inter_600SemiBold", width: 28 },
    rankAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
    rankAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
    rankInfo: { flex: 1 },
    rankName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
    rankMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
    rankBadgeChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    rankBadgeLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
    rankCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
    followBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
    followText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  });
}

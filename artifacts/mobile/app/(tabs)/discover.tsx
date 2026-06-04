import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { formatCount } from "@/utils/format";

type DiscoverTab = "Explore" | "Leaderboard";

const TRENDING_SEARCHES = ["consciousness", "AI relationships", "free will", "loneliness", "identity"];

const CATEGORIES_GRID = [
  { name: "Psychology", count: 3 },
  { name: "Society", count: 2 },
  { name: "Relationships", count: 1 },
  { name: "Tech", count: 3 },
  { name: "Creativity", count: 1 },
  { name: "Philosophy", count: 3 },
  { name: "Culture", count: 1 },
  { name: "Science", count: 1 },
  { name: "Politics", count: 0 },
  { name: "Health", count: 0 },
];

const LEADERBOARD = [
  { id: "lb1", initials: "DE", name: "DeepDiver_88", badge: "Elder", appreciated: 2103, rank: 1 },
  { id: "lb2", initials: "BL", name: "BlankCanvas_...", badge: "Insightful", appreciated: 1234, rank: 2 },
  { id: "lb3", initials: "CA", name: "CalmObserver", badge: "Insightful", appreciated: 1203, rank: 3 },
  { id: "lb4", initials: "NI", name: "NightOwl_23", badge: "Insightful", appreciated: 789, rank: 4 },
  { id: "lb5", initials: "CO", name: "CosmicDrift_07", badge: "Insightful", appreciated: 567, rank: 5 },
  { id: "lb6", initials: "SI", name: "SilentAlgorithm", badge: "Insightful", appreciated: 678, rank: 6 },
  { id: "lb7", initials: "DE2", name: "DeepSpaceThought_44", badge: "Thoughtful", appreciated: 567, rank: 7 },
  { id: "lb8", initials: "ME", name: "Meridian_Fox", badge: "Thoughtful", appreciated: 445, rank: 8 },
  { id: "lb9", initials: "QU", name: "QuantumSage", badge: "Thoughtful", appreciated: 342, rank: 9 },
  { id: "lb10", initials: "VO", name: "VoidWatcher_99", badge: "Thoughtful", appreciated: 234, rank: 10 },
  { id: "lb11", initials: "NE", name: "NeuralNomad_71", badge: "Thoughtful", appreciated: 234, rank: 11 },
];

const AVATAR_BG: Record<number, string> = {
  1: "#C8F5D8", 2: "#C8D8FF", 3: "#E8C8FF",
};

const BADGE_COLORS: Record<string, string> = {
  Elder: "#FBBF24",
  Insightful: "#C084FC",
  Thoughtful: "#818CF8",
};

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { thoughts } = useApp();
  const [activeTab, setActiveTab] = useState<DiscoverTab>("Explore");
  const [search, setSearch] = useState("");
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set(["lb4"]));

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  const trendingThoughts = [...thoughts].sort((a, b) => b.appreciations - a.appreciations);

  const toggleFollow = (id: string) => {
    setFollowedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const styles = makeStyles(colors);

  const top3 = LEADERBOARD.filter(u => u.rank <= 3);
  const rest = LEADERBOARD.filter(u => u.rank > 3);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search thoughts, topics, people..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.discoverTabBar}>
        {(["Explore", "Leaderboard"] as DiscoverTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.discoverTab, activeTab === tab && styles.discoverTabActive]}
            activeOpacity={0.7}
          >
            <Feather
              name={tab === "Explore" ? "compass" : "award"}
              size={14}
              color={activeTab === tab ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.discoverTabText, activeTab === tab && styles.discoverTabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "Explore" ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 16 }}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TRENDING SEARCHES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRow}>
              {TRENDING_SEARCHES.map(term => (
                <TouchableOpacity
                  key={term}
                  onPress={() => setSearch(term)}
                  style={styles.trendChip}
                  activeOpacity={0.8}
                >
                  <Feather name="trending-up" size={12} color={colors.mutedForeground} />
                  <Text style={styles.trendChipText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES_GRID.map(cat => (
                <TouchableOpacity key={cat.name} style={[styles.categoryCard, { borderColor: colors.border, backgroundColor: colors.card }]} activeOpacity={0.8}>
                  <Text style={styles.categoryCardName}>{cat.name}</Text>
                  <Text style={styles.categoryCardCount}>{cat.count} thoughts</Text>
                  <View style={[styles.categoryCardLine, { backgroundColor: colors.primary }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
          </View>
          {trendingThoughts.slice(0, 3).map(t => (
            <ThoughtCard key={t.id} thought={t} showReason={true} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 16 }}>
          <View style={styles.podium}>
            <View style={styles.podiumSide}>
              <View style={[styles.podiumAvatarSm, { backgroundColor: AVATAR_BG[2] || "#C8D8FF" }]}>
                <Text style={styles.podiumInitialsSm}>{top3[1]?.initials.slice(0,2)}</Text>
              </View>
              <View style={[styles.rankBadgeSm, { backgroundColor: "#7A7A90" }]}>
                <Text style={styles.rankBadgeText}>#2</Text>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>{top3[1]?.name}</Text>
              <View style={[styles.podiumBadgeChip, { backgroundColor: BADGE_COLORS[top3[1]?.badge] + "30" }]}>
                <Text style={[styles.podiumBadgeText, { color: BADGE_COLORS[top3[1]?.badge] }]}>{top3[1]?.badge}</Text>
              </View>
              <Text style={styles.podiumCount}>{formatCount(top3[1]?.appreciated || 0)} appreciated</Text>
            </View>

            <View style={styles.podiumCenter}>
              <Text style={styles.podiumFirstLabel}>1st</Text>
              <View style={[styles.podiumAvatarLg, { backgroundColor: AVATAR_BG[1] || "#C8F5D8" }]}>
                <Text style={styles.podiumInitialsLg}>{top3[0]?.initials.slice(0,2)}</Text>
              </View>
              <View style={[styles.rankBadgeLg, { backgroundColor: "#F59E0B" }]}>
                <Text style={styles.rankBadgeText}>#1</Text>
              </View>
              <Text style={[styles.podiumName, { fontFamily: "Inter_700Bold", fontSize: 14 }]}>{top3[0]?.name}</Text>
              <View style={[styles.podiumBadgeChip, { backgroundColor: BADGE_COLORS[top3[0]?.badge] + "30" }]}>
                <Text style={[styles.podiumBadgeText, { color: BADGE_COLORS[top3[0]?.badge] }]}>{top3[0]?.badge}</Text>
              </View>
              <Text style={styles.podiumCount}>{formatCount(top3[0]?.appreciated || 0)} appreciated</Text>
            </View>

            <View style={styles.podiumSide}>
              <View style={[styles.podiumAvatarSm, { backgroundColor: AVATAR_BG[3] || "#E8C8FF" }]}>
                <Text style={styles.podiumInitialsSm}>{top3[2]?.initials.slice(0,2)}</Text>
              </View>
              <View style={[styles.rankBadgeSm, { backgroundColor: "#9088CC" }]}>
                <Text style={styles.rankBadgeText}>#3</Text>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>{top3[2]?.name}</Text>
              <View style={[styles.podiumBadgeChip, { backgroundColor: BADGE_COLORS[top3[2]?.badge] + "30" }]}>
                <Text style={[styles.podiumBadgeText, { color: BADGE_COLORS[top3[2]?.badge] }]}>{top3[2]?.badge}</Text>
              </View>
              <Text style={styles.podiumCount}>{formatCount(top3[2]?.appreciated || 0)} appreciated</Text>
            </View>
          </View>

          {rest.map(user => {
            const followed = followedIds.has(user.id);
            return (
              <View key={user.id} style={[styles.rankRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>#{user.rank}</Text>
                <View style={[styles.rankAvatar, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.rankAvatarText, { color: colors.primary }]}>{user.initials.slice(0,2)}</Text>
                </View>
                <View style={styles.rankInfo}>
                  <Text style={[styles.rankName, { color: colors.foreground }]} numberOfLines={1}>{user.name}</Text>
                  <View style={styles.rankMeta}>
                    <View style={[styles.rankBadgeChip, { backgroundColor: BADGE_COLORS[user.badge] + "25" }]}>
                      <Text style={[styles.rankBadgeLabel, { color: BADGE_COLORS[user.badge] }]}>{user.badge}</Text>
                    </View>
                    <Text style={[styles.rankCount, { color: colors.mutedForeground }]}>{formatCount(user.appreciated)} appreciated</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => toggleFollow(user.id)}
                  style={[styles.followBtn, {
                    backgroundColor: followed ? "transparent" : colors.primary,
                    borderColor: followed ? colors.border : colors.primary,
                  }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.followText, { color: followed ? colors.foreground : "#fff" }]}>
                    {followed ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingVertical: 10 },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.5 },
    searchContainer: {
      flexDirection: "row", alignItems: "center",
      marginHorizontal: 14, marginBottom: 4,
      paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: colors.secondary,
      borderRadius: 10, borderWidth: 1, borderColor: colors.border, gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", padding: 0 },
    discoverTabBar: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
    },
    discoverTab: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 12, paddingVertical: 10,
      borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1,
    },
    discoverTabActive: { borderBottomColor: colors.primary },
    discoverTabText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    discoverTabTextActive: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
    section: { paddingHorizontal: 16, paddingTop: 12 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 10 },
    trendingRow: { paddingBottom: 4, gap: 8 },
    trendChip: {
      flexDirection: "row", alignItems: "center", gap: 5,
      borderWidth: 1, borderColor: colors.border, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6,
      backgroundColor: colors.card,
    },
    trendChipText: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular" },
    categoriesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    categoryCard: {
      width: "47%", borderWidth: 1, borderRadius: 10,
      padding: 12, marginBottom: 0, overflow: "hidden",
    },
    categoryCardName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 3 },
    categoryCardCount: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 10 },
    categoryCardLine: { height: 3, width: 28, borderRadius: 2, marginTop: 4 },
    podium: {
      flexDirection: "row", alignItems: "flex-end",
      paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      gap: 8,
    },
    podiumCenter: { flex: 1, alignItems: "center" },
    podiumSide: { flex: 1, alignItems: "center", paddingTop: 20 },
    podiumFirstLabel: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 },
    podiumAvatarLg: {
      width: 80, height: 80, borderRadius: 40,
      alignItems: "center", justifyContent: "center", marginBottom: 4,
    },
    podiumAvatarSm: {
      width: 56, height: 56, borderRadius: 28,
      alignItems: "center", justifyContent: "center", marginBottom: 4,
    },
    podiumInitialsLg: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#2D2D50" },
    podiumInitialsSm: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#2D2D50" },
    rankBadgeLg: {
      width: 24, height: 24, borderRadius: 12,
      alignItems: "center", justifyContent: "center",
      marginTop: -12, marginBottom: 4,
    },
    rankBadgeSm: {
      width: 20, height: 20, borderRadius: 10,
      alignItems: "center", justifyContent: "center",
      marginTop: -10, marginBottom: 4,
    },
    rankBadgeText: { fontSize: 10, color: "#fff", fontFamily: "Inter_700Bold" },
    podiumName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center", marginBottom: 3 },
    podiumBadgeChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 3 },
    podiumBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    podiumCount: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    rankRow: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, gap: 10,
    },
    rankNum: { fontSize: 13, fontFamily: "Inter_600SemiBold", width: 28 },
    rankAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
    rankAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
    rankInfo: { flex: 1 },
    rankName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
    rankMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
    rankBadgeChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    rankBadgeLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
    rankCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
    followBtn: {
      paddingHorizontal: 16, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1,
    },
    followText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  });
}

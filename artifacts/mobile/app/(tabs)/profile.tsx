import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { formatCount } from "@/utils/format";

type ProfileTab = "Thoughts" | "Appreciated" | "Saved";
const PROFILE_TABS: ProfileTab[] = ["Thoughts", "Appreciated", "Saved"];

const BADGE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  Thinker:  { label: "Thinker",  color: "#818CF8", desc: "Posted 10+ quality thoughts" },
  Debater:  { label: "Debater",  color: "#F59E0B", desc: "Sparked 50+ discussions" },
  Scholar:  { label: "Scholar",  color: "#22C55E", desc: "Reputation over 500" },
  Sage:     { label: "Sage",     color: "#C084FC", desc: "Reputation over 1000" },
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { thoughts, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<ProfileTab>("Thoughts");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const myThoughts = thoughts.filter(t => t.authorId === currentUser.id);
  const appreciated = thoughts.filter(t => t.hasAppreciated);
  const saved = thoughts.filter(t => t.hasSaved);

  const displayThoughts =
    activeTab === "Thoughts" ? myThoughts
    : activeTab === "Appreciated" ? appreciated
    : saved;

  const badge = BADGE_INFO[currentUser.badge] || BADGE_INFO["Thinker"];
  const reputationPct = Math.min((currentUser.reputation / 1000) * 100, 100);

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7}>
          <Feather name="settings" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayThoughts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ThoughtCard thought={item} showReason={false} />}
        scrollEnabled={!!displayThoughts.length}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.profileCard}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "25" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {currentUser.displayName.charAt(0)}
                </Text>
              </View>
              <Text style={styles.displayName}>{currentUser.displayName}</Text>
              <Text style={[styles.username, { color: colors.mutedForeground }]}>
                @{currentUser.username}
              </Text>
              <Text style={styles.bio}>{currentUser.bio}</Text>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{formatCount(currentUser.thoughtsCount)}</Text>
                  <Text style={styles.statLabel}>Thoughts</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{formatCount(currentUser.followersCount)}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{formatCount(currentUser.followingCount)}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>

              <View style={styles.badgeRow}>
                <View style={[styles.badge, { borderColor: badge.color + "50", backgroundColor: badge.color + "15" }]}>
                  <Feather name="award" size={13} color={badge.color} />
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
                <View style={[styles.repContainer, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  <Text style={styles.repLabel}>Rep</Text>
                  <Text style={[styles.repValue, { color: colors.gold }]}>{formatCount(currentUser.reputation)}</Text>
                </View>
              </View>

              <View style={styles.repBar}>
                <View style={[styles.repBarFill, { width: `${reputationPct}%` as any, backgroundColor: colors.primary }]} />
              </View>
              <Text style={styles.repHint}>{currentUser.reputation} / 1000 reputation</Text>
            </View>

            <View style={styles.tabBar}>
              {PROFILE_TABS.map(tab => {
                const isActive = tab === activeTab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[styles.tabBtn, isActive && { borderBottomColor: colors.primary }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabText, isActive && { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather
              name={activeTab === "Thoughts" ? "edit-2" : activeTab === "Appreciated" ? "arrow-up" : "bookmark"}
              size={28}
              color={colors.mutedForeground}
            />
            <Text style={styles.emptyText}>
              {activeTab === "Thoughts"
                ? "You haven't posted any thoughts yet."
                : activeTab === "Appreciated"
                ? "Thoughts you appreciate will appear here."
                : "Thoughts you save will appear here."}
            </Text>
            {activeTab === "Thoughts" && (
              <TouchableOpacity
                onPress={() => router.push("/compose")}
                style={[styles.postBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.postBtnText, { color: colors.primaryForeground }]}>Post your first thought</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.5 },
    settingsBtn: {
      width: 38, height: 38, borderRadius: 19,
      alignItems: "center", justifyContent: "center",
      backgroundColor: colors.secondary,
    },
    profileCard: {
      alignItems: "center",
      paddingVertical: 24,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    avatarText: { fontSize: 28, fontFamily: "Inter_700Bold" },
    displayName: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    username: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2, marginBottom: 8 },
    bio: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 16 },
    statsRow: { flexDirection: "row", alignItems: "center", gap: 0, marginBottom: 14 },
    stat: { alignItems: "center", paddingHorizontal: 20 },
    statNum: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    statLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 1 },
    statDivider: { width: 1, height: 30 },
    badgeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
    badgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    repContainer: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
    repLabel: { fontSize: 12, color: "#7A7A90", fontFamily: "Inter_400Regular" },
    repValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
    repBar: { width: "100%", height: 3, backgroundColor: colors.secondary, borderRadius: 2, overflow: "hidden", marginBottom: 4 },
    repBarFill: { height: "100%", borderRadius: 2 },
    repHint: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
    tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
    tabText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    emptyState: { paddingTop: 60, alignItems: "center", gap: 8, paddingHorizontal: 40 },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
    postBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    postBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  });
}

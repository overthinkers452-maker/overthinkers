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

type ProfileTab = "Thoughts" | "Saved";
const PROFILE_TABS: ProfileTab[] = ["Thoughts", "Saved"];

const BADGE_INFO: Record<string, { label: string; color: string }> = {
  Newcomer: { label: "Newcomer", color: "#818CF8" },
  Thinker:  { label: "Thinker",  color: "#818CF8" },
  Debater:  { label: "Debater",  color: "#F59E0B" },
  Scholar:  { label: "Scholar",  color: "#22C55E" },
  Sage:     { label: "Sage",     color: "#C084FC" },
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { thoughts, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<ProfileTab>("Thoughts");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 62;

  const myThoughts = thoughts.filter(t => t.authorId === currentUser.id);
  const saved = thoughts.filter(t => t.hasSaved);
  const appreciated = thoughts.filter(t => t.hasAppreciated);

  const displayThoughts = activeTab === "Thoughts" ? myThoughts : saved;

  const badge = BADGE_INFO[currentUser.badge] || BADGE_INFO["Newcomer"];
  const streakDays = 1;

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]} activeOpacity={0.7}>
          <Feather name="settings" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayThoughts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ThoughtCard thought={item} showReason={false} />}
        scrollEnabled={!!displayThoughts.length}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
        ListHeaderComponent={
          <View>
            <View style={styles.profileSection}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {currentUser.username.slice(0, 2).toUpperCase()}
                </Text>
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{currentUser.username}</Text>
                <View style={[styles.badgeChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Feather name="award" size={12} color={badge.color} />
                  <Text style={[styles.badgeLabel, { color: colors.foreground }]}>{badge.label}</Text>
                </View>
              </View>

              <View style={[styles.streakBanner, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                <Feather name="zap" size={15} color="#D97706" />
                <Text style={styles.streakText}>{streakDays} day streak</Text>
                <Text style={styles.streakHint}>Keep thinking daily</Text>
              </View>

              <Text style={styles.bio}>{currentUser.bio}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{formatCount(currentUser.thoughtsCount)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Thoughts</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <Text style={styles.statNum}>{formatCount(appreciated.length)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Appreciated</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <Text style={styles.statNum}>{formatCount(currentUser.reputation)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Reputation</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
              {PROFILE_TABS.map(tab => {
                const isActive = tab === activeTab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[
                      styles.tabBtn,
                      {
                        backgroundColor: isActive ? colors.card : "transparent",
                        borderColor: isActive ? colors.border : "transparent",
                        shadowColor: isActive ? "#000" : "transparent",
                        shadowOpacity: isActive ? 0.06 : 0,
                        shadowRadius: isActive ? 4 : 0,
                        elevation: isActive ? 2 : 0,
                      }
                    ]}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={tab === "Thoughts" ? "edit-2" : "bookmark"}
                      size={14}
                      color={isActive ? colors.primary : colors.mutedForeground}
                    />
                    <Text style={[styles.tabText, { color: isActive ? colors.primary : colors.mutedForeground, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
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
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name={activeTab === "Thoughts" ? "edit-2" : "bookmark"} size={28} color={colors.mutedForeground} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === "Thoughts" ? "No thoughts yet" : "Nothing saved yet"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeTab === "Thoughts"
                ? "Tap the compose button on the feed to post your first thought."
                : "Thoughts you save will appear here."}
            </Text>
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
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.5 },
    settingsBtn: {
      width: 38, height: 38, borderRadius: 10,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1,
    },
    profileSection: { padding: 16, gap: 12 },
    avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 26, fontFamily: "Inter_700Bold" },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
    displayName: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    badgeChip: {
      flexDirection: "row", alignItems: "center", gap: 4,
      borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    },
    badgeLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
    streakBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    },
    streakText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#D97706", flex: 1 },
    streakHint: { fontSize: 13, color: "#92400E", fontFamily: "Inter_400Regular" },
    bio: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 21 },
    divider: { height: 1 },
    statsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
    stat: { flex: 1, alignItems: "center" },
    statNum: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    statDivider: { width: 1, height: 32 },
    tabBar: {
      flexDirection: "row", padding: 6, gap: 6, margin: 12,
      backgroundColor: colors.secondary, borderRadius: 12,
    },
    tabBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, paddingVertical: 10, borderRadius: 9,
      borderWidth: 1, shadowOffset: { width: 0, height: 1 },
    },
    tabText: { fontSize: 14 },
    emptyState: { paddingTop: 48, alignItems: "center", gap: 10, paddingHorizontal: 40 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center" },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  });
}

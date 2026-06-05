import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { formatCount } from "@/utils/format";

const AVATAR_BG_POOL = ["#C8F5D8","#C8D8FF","#E8C8FF","#FFE8C8","#C8FFEE","#FFD8E8"];
function avatarBg(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + h * 31; return AVATAR_BG_POOL[Math.abs(h) % AVATAR_BG_POOL.length]; }

export default function PublicProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, name } = useLocalSearchParams<{ userId: string; name?: string }>();
  const { thoughts, currentUser, followedUsers, toggleFollowUser } = useApp();
  const bottomPad = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  const isFollowed = followedUsers.has(userId!);

  const userThoughts = useMemo(
    () => thoughts.filter(t => t.authorId === userId && !t.isRepost),
    [thoughts, userId]
  );

  const displayName = name || (userThoughts[0]
    ? (userThoughts[0].alias || userThoughts[0].authorName)
    : userId);

  const totalAppreciations = userThoughts.reduce((s, t) => s + t.appreciations, 0);
  const topCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    userThoughts.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [userThoughts]);

  const badge = totalAppreciations >= 2000 ? { label: "Elder", color: "#F59E0B" }
    : totalAppreciations >= 1000 ? { label: "Insightful", color: "#C084FC" }
    : totalAppreciations >= 300 ? { label: "Thoughtful", color: "#818CF8" }
    : { label: "Newcomer", color: "#6EE7B7" };

  const styles = makeStyles(colors);

  return (
    <>
      <Stack.Screen options={{
        title: displayName || "Profile",
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <FlatList
        style={{ backgroundColor: colors.background }}
        data={userThoughts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ThoughtCard thought={item} showReason={false} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
        ListHeaderComponent={
          <View>
            {/* Banner */}
            <View style={[styles.banner, { backgroundColor: colors.primary + "25" }]}>
              <View style={[styles.avatar, { backgroundColor: avatarBg(displayName || userId!) }]}>
                <Text style={styles.avatarText}>
                  {(displayName || "?").slice(0, 2).toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.profileBody}>
              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{displayName}</Text>
                  <View style={[styles.badgeChip, { backgroundColor: badge.color + "25" }]}>
                    <Feather name="award" size={11} color={badge.color} />
                    <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>
                {userId !== currentUser.id && (
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleFollowUser(userId!); }}
                    style={[styles.followBtn, {
                      backgroundColor: isFollowed ? "transparent" : colors.primary,
                      borderColor: isFollowed ? colors.border : colors.primary,
                    }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.followBtnText, { color: isFollowed ? colors.foreground : "#fff" }]}>
                      {isFollowed ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.topCategory, { color: colors.mutedForeground }]}>
                Mostly thinks about <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{topCategory}</Text>
              </Text>

              <View style={[styles.statsRow, { borderColor: colors.border }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{formatCount(userThoughts.length)}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Thoughts</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{formatCount(totalAppreciations)}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Appreciated</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{topCategory}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Top Topic</Text>
                </View>
              </View>
            </View>

            <View style={[styles.sectionLabel, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionLabelText, { color: colors.mutedForeground }]}>THOUGHTS</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="edit-2" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No public thoughts yet.
            </Text>
          </View>
        }
      />
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    banner: { height: 110, alignItems: "center", justifyContent: "flex-end", paddingBottom: 0 },
    avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: -36, borderWidth: 3, borderColor: colors.background },
    avatarText: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#2D2D50" },
    profileBody: { paddingTop: 44, paddingHorizontal: 16, gap: 10 },
    nameRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    displayName: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
    badgeChip: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    badgeLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
    followBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, borderWidth: 1, marginTop: 4 },
    followBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    topCategory: { fontSize: 13, fontFamily: "Inter_400Regular" },
    statsRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 14, marginTop: 4 },
    stat: { flex: 1, alignItems: "center" },
    statNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
    statDivider: { width: 1, height: 28 },
    sectionLabel: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, marginTop: 8 },
    sectionLabelText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
    empty: { paddingTop: 60, alignItems: "center", gap: 8 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}

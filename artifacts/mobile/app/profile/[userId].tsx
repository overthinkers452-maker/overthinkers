import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Animated, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useApp, Thought } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { formatCount } from "@/utils/format";
import { useFeedback } from "@/hooks/useFeedback";
import { useBounce } from "@/hooks/useBounce";
import * as svc from "@/lib/thoughtsService";

const AVATAR_BG_POOL = ["#C8F5D8","#C8D8FF","#E8C8FF","#FFE8C8","#C8FFEE","#FFD8E8"];
function avatarBg(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + h * 31; return AVATAR_BG_POOL[Math.abs(h) % AVATAR_BG_POOL.length]; }

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  reputation: number;
  badge: string;
  followers_count: number;
  following_count: number;
  thoughts_count: number;
}

export default function PublicProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { currentUser, followedUsers, toggleFollowUser } = useApp();
  const { user } = useAuth();
  const { tap } = useFeedback();
  const { scale, bounce } = useBounce();
  const bottomPad = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userThoughts, setUserThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);

  const safeUserId = userId ?? "";
  const isOwnProfile = safeUserId === currentUser.id;
  const isFollowed = followedUsers.has(safeUserId);

  useEffect(() => {
    if (!safeUserId) return;
    setLoading(true);
    Promise.all([
      svc.fetchProfileById(safeUserId),
      svc.fetchProfileThoughts(safeUserId, user?.id),
    ]).then(([p, t]) => {
      setProfile(p as ProfileData);
      setUserThoughts(t);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [safeUserId, user?.id]);

  const displayName = profile?.display_name ?? safeUserId;
  const totalAppreciations = useMemo(() => userThoughts.reduce((s, t) => s + t.appreciations, 0), [userThoughts]);

  const topCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    userThoughts.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [userThoughts]);

  // Use Supabase badge field; fall back to reputation-based tier if not set
  const badgeLabel = profile?.badge && profile.badge !== "Newcomer" ? profile.badge
    : totalAppreciations >= 2000 ? "Elder"
    : totalAppreciations >= 1000 ? "Insightful"
    : totalAppreciations >= 300 ? "Thoughtful"
    : "Newcomer";
  const badge = badgeLabel === "Elder" ? { label: "Elder", color: "#F59E0B" }
    : badgeLabel === "Insightful" ? { label: "Insightful", color: "#C084FC" }
    : badgeLabel === "Thoughtful" ? { label: "Thoughtful", color: "#818CF8" }
    : { label: "Newcomer", color: "#6EE7B7" };

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Profile", headerStyle: { backgroundColor: colors.background } as any, headerTintColor: colors.primary }} />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

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
            <View style={[styles.banner, { backgroundColor: colors.primary + "25" }]}>
              {profile?.banner_url ? (
                <Image source={{ uri: profile.banner_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : null}
              <View style={[styles.avatar, { backgroundColor: avatarBg(displayName) }]}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={[styles.avatar, { position: "absolute" }]} />
                ) : (
                  <Text style={styles.avatarText}>{(displayName || "?").slice(0, 2).toUpperCase()}</Text>
                )}
              </View>
            </View>

            <View style={styles.profileBody}>
              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{displayName}</Text>
                  {profile?.username && (
                    <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{profile.username}</Text>
                  )}
                  <View style={[styles.badgeChip, { backgroundColor: badge.color + "25" }]}>
                    <Feather name="award" size={11} color={badge.color} />
                    <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>
                {isOwnProfile ? (
                  <TouchableOpacity
                    onPress={() => { tap(); router.push("/(tabs)/profile"); }}
                    style={[styles.followBtn, { backgroundColor: "transparent", borderColor: colors.border }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.followBtnText, { color: colors.foreground }]}>Edit Profile</Text>
                  </TouchableOpacity>
                ) : (
                  <Animated.View style={{ transform: [{ scale }] }}>
                    <TouchableOpacity
                      onPress={() => { tap(); bounce(); toggleFollowUser(safeUserId); }}
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
                  </Animated.View>
                )}
              </View>

              {profile?.bio ? (
                <Text style={[styles.bio, { color: colors.mutedForeground }]}>{profile.bio}</Text>
              ) : null}

              <Text style={[styles.topCategory, { color: colors.mutedForeground }]}>
                Mostly thinks about <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{topCategory}</Text>
              </Text>

              <View style={[styles.statsRow, { borderColor: colors.border }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{formatCount(profile?.thoughts_count ?? userThoughts.length)}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Thoughts</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{formatCount(totalAppreciations)}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Appreciated</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{formatCount(profile?.followers_count ?? 0)}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
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
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No public thoughts yet.</Text>
          </View>
        }
      />
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    banner: { height: 120, alignItems: "center", justifyContent: "flex-end", paddingBottom: 0, overflow: "hidden" },
    avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: -36, borderWidth: 3, borderColor: colors.background, overflow: "hidden" },
    avatarText: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#2D2D50" },
    profileBody: { paddingTop: 44, paddingHorizontal: 16, gap: 8 },
    nameRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    displayName: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 2 },
    handle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
    bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
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

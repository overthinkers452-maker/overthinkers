import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Platform, Modal, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { formatCount } from "@/utils/format";

type ProfileTab = "Thoughts" | "Saved";
const PROFILE_TABS: ProfileTab[] = ["Thoughts", "Saved"];

const MOOD_EMOJIS = ["💭", "🔥", "🌊", "⚡", "🌙", "🦋", "🧠", "✨", "🎯", "🌿", "💡", "🌀", "🫧", "🎭", "🌸"];
const BANNER_COLORS = ["#5B5BD6", "#E11D48", "#059669", "#D97706", "#7C3AED", "#0369A1", "#0F766E", "#BE185D", "#334155"];

const ACHIEVEMENT_DEFS = [
  { id: "first_thought",  label: "First Thought", emoji: "✍️",  color: "#818CF8", check: (t: any[], _s: any[]) => t.length > 0 },
  { id: "deep_thinker",   label: "Deep Thinker",  emoji: "🧠",  color: "#C084FC", check: (t: any[]) => t.some((x: any) => x.content.length > 200) },
  { id: "saver",          label: "Saver",          emoji: "🔖",  color: "#F59E0B", check: (_t: any[], s: any[]) => s.length > 0 },
  { id: "appreciated",    label: "Appreciated",    emoji: "💚",  color: "#22C55E", check: (_t: any[], _s: any[], a: any[]) => a.length > 0 },
  { id: "first_reshare",  label: "First Reshare",  emoji: "🔄",  color: "#06B6D4", check: (t: any[]) => t.some((x: any) => x.hasReposted) },
  { id: "prolific",       label: "Prolific",       emoji: "🚀",  color: "#EC4899", check: (t: any[]) => t.length >= 5 },
];

/** Build 35-day activity grid from thoughts */
function buildHeatmap(thoughts: any[]) {
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (34 - i));
    const dayStr = d.toDateString();
    const count = thoughts.filter((t: any) => new Date(t.createdAt).toDateString() === dayStr).length;
    return { day: dayStr, count };
  });
  return cells;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { thoughts, currentUser, moodEmoji, setMoodEmoji, bannerColor, setBannerColor, fleetingThoughts, addFleetingThought } = useApp();

  const [activeTab, setActiveTab] = useState<ProfileTab>("Thoughts");
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [showFleetingCompose, setShowFleetingCompose] = useState(false);
  const [fleetingText, setFleetingText] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  const myThoughts = useMemo(() => thoughts.filter(t => t.authorId === currentUser.id), [thoughts, currentUser.id]);
  const saved = useMemo(() => thoughts.filter(t => t.hasSaved), [thoughts]);
  const appreciated = useMemo(() => thoughts.filter(t => t.hasAppreciated), [thoughts]);
  const displayThoughts = activeTab === "Thoughts" ? myThoughts : saved;

  const heatmap = useMemo(() => buildHeatmap(myThoughts), [myThoughts]);
  const maxActivity = Math.max(1, ...heatmap.map(c => c.count));
  const streakDays = useMemo(() => {
    let streak = 0;
    for (let i = 34; i >= 0; i--) {
      if (heatmap[i].count > 0) streak++;
      else break;
    }
    return streak;
  }, [heatmap]);

  const achievements = useMemo(() =>
    ACHIEVEMENT_DEFS.map(a => ({ ...a, earned: a.check(myThoughts, saved, appreciated) })),
    [myThoughts, saved, appreciated]
  );

  const activeFleeting = fleetingThoughts.filter(f => f.authorId === currentUser.id && new Date(f.expiresAt).getTime() > Date.now());

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={[styles.iconBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Feather name="settings" size={17} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={displayThoughts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ThoughtCard thought={item} showReason={false} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
        ListHeaderComponent={
          <View>
            {/* Banner with color picker */}
            <TouchableOpacity
              onPress={() => setShowBannerPicker(true)}
              activeOpacity={0.85}
              style={[styles.banner, { backgroundColor: bannerColor + "40" }]}
            >
              <View style={styles.bannerOverlay}>
                <Feather name="edit-3" size={13} color="#fff" />
                <Text style={styles.bannerEditHint}>Edit banner</Text>
              </View>
            </TouchableOpacity>

            {/* Avatar + fleeting ring */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={() => setShowFleetingCompose(true)} activeOpacity={0.8}>
                <View style={[styles.fleetingRing, { borderColor: activeFleeting.length > 0 ? bannerColor : "transparent" }]}>
                  <View style={[styles.avatar, { backgroundColor: bannerColor + "30" }]}>
                    <Text style={[styles.avatarText, { color: bannerColor }]}>
                      {currentUser.username.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                </View>
                {activeFleeting.length > 0 && (
                  <View style={[styles.fleetingBadge, { backgroundColor: bannerColor }]}>
                    <Text style={styles.fleetingBadgeText}>{activeFleeting.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.nameBlock}>
                <View style={styles.nameRow}>
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{currentUser.username}</Text>
                  <TouchableOpacity onPress={() => setShowMoodPicker(true)} style={styles.moodBtn} activeOpacity={0.7}>
                    <Text style={styles.moodEmoji}>{moodEmoji}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.bio, { color: colors.mutedForeground }]}>{currentUser.bio}</Text>
              </View>
            </View>

            {/* Streak banner */}
            <View style={[styles.streakBanner, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
              <Feather name="zap" size={15} color="#D97706" />
              <Text style={styles.streakText}>{streakDays} day streak</Text>
              <Text style={styles.streakHint}>Keep thinking daily</Text>
            </View>

            {/* Stats */}
            <View style={[styles.statsRow, { borderColor: colors.border }]}>
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>{formatCount(myThoughts.length)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Thoughts</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>{formatCount(appreciated.length)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Appreciated</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>{formatCount(currentUser.reputation)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Reputation</Text>
              </View>
            </View>

            {/* Activity heatmap */}
            <View style={[styles.heatmapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.heatmapTitle, { color: colors.foreground }]}>Activity — last 35 days</Text>
              <View style={styles.heatmapGrid}>
                {heatmap.map((cell, i) => {
                  const intensity = cell.count === 0 ? 0 : Math.min(1, cell.count / maxActivity);
                  const bg = cell.count === 0
                    ? colors.secondary
                    : `rgba(91, 91, 214, ${0.2 + intensity * 0.8})`;
                  return (
                    <View key={i} style={[styles.heatmapCell, { backgroundColor: bg }]} />
                  );
                })}
              </View>
              <Text style={[styles.heatmapLegend, { color: colors.mutedForeground }]}>
                {heatmap.reduce((s, c) => s + c.count, 0)} total thoughts in 35 days
              </Text>
            </View>

            {/* Achievements */}
            <View style={[styles.achievementsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.achievementsTitle, { color: colors.foreground }]}>Badges</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsRow}>
                {achievements.map(a => (
                  <View key={a.id} style={[styles.achievementChip, { backgroundColor: a.earned ? a.color + "25" : colors.secondary, borderColor: a.earned ? a.color + "50" : colors.border, opacity: a.earned ? 1 : 0.45 }]}>
                    <Text style={styles.achievementEmoji}>{a.emoji}</Text>
                    <Text style={[styles.achievementLabel, { color: a.earned ? a.color : colors.mutedForeground }]}>{a.label}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Fleeting thoughts preview */}
            {activeFleeting.length > 0 && (
              <View style={[styles.fleetingCard, { backgroundColor: colors.card, borderColor: bannerColor + "50" }]}>
                <View style={styles.fleetingHeader}>
                  <Feather name="clock" size={14} color={bannerColor} />
                  <Text style={[styles.fleetingTitle, { color: bannerColor }]}>Fleeting thoughts · {activeFleeting.length} active</Text>
                </View>
                {activeFleeting.slice(0, 2).map(f => (
                  <Text key={f.id} style={[styles.fleetingSnippet, { color: colors.foreground }]} numberOfLines={2}>
                    {f.content}
                  </Text>
                ))}
                <Text style={[styles.fleetingExpiry, { color: colors.mutedForeground }]}>Disappears in 24h</Text>
              </View>
            )}

            {/* Tabs */}
            <View style={[styles.tabBar, { backgroundColor: colors.secondary }]}>
              {PROFILE_TABS.map(tab => {
                const isActive = tab === activeTab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTab(tab);
                    }}
                    style={[styles.tabBtn, isActive && { backgroundColor: colors.card, borderColor: colors.border, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }]}
                    activeOpacity={0.8}
                  >
                    <Feather name={tab === "Thoughts" ? "edit-2" : "bookmark"} size={14} color={isActive ? colors.primary : colors.mutedForeground} />
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
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {activeTab === "Thoughts" ? "No thoughts yet" : "Nothing saved yet"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeTab === "Thoughts" ? "Tap the compose button on the feed to post your first thought." : "Thoughts you save will appear here."}
            </Text>
          </View>
        }
      />

      {/* Mood emoji picker modal */}
      <Modal visible={showMoodPicker} transparent animationType="slide" onRequestClose={() => setShowMoodPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMoodPicker(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Choose mood</Text>
            <View style={styles.emojiGrid}>
              {MOOD_EMOJIS.map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => { setMoodEmoji(emoji); setShowMoodPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.emojiBtn, moodEmoji === emoji && { backgroundColor: colors.primary + "20" }]} activeOpacity={0.7}>
                  <Text style={styles.emojiOption}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Banner color picker modal */}
      <Modal visible={showBannerPicker} transparent animationType="slide" onRequestClose={() => setShowBannerPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBannerPicker(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Banner colour</Text>
            <View style={styles.colorGrid}>
              {BANNER_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => { setBannerColor(c); setShowBannerPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.colorSwatch, { backgroundColor: c }, bannerColor === c && styles.colorSwatchActive]} activeOpacity={0.8} />
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fleeting thought compose modal */}
      <Modal visible={showFleetingCompose} transparent animationType="slide" onRequestClose={() => setShowFleetingCompose(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFleetingCompose(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>✨ Fleeting thought</Text>
            <Text style={[styles.pickerSubtitle, { color: colors.mutedForeground }]}>Disappears in 24 hours</Text>
            <TextInput
              style={[styles.fleetingInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.secondary }]}
              placeholder="A thought for today only..."
              placeholderTextColor={colors.mutedForeground}
              value={fleetingText}
              onChangeText={setFleetingText}
              multiline
              maxLength={280}
              autoFocus
            />
            <TouchableOpacity
              onPress={() => { if (fleetingText.trim()) { addFleetingThought(fleetingText.trim()); setFleetingText(""); setShowFleetingCompose(false); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } }}
              style={[styles.fleetingSubmitBtn, { backgroundColor: fleetingText.trim() ? colors.primary : colors.muted }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.fleetingSubmitText, { color: fleetingText.trim() ? "#fff" : colors.mutedForeground }]}>Post fleeting thought</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
    headerActions: { flexDirection: "row", gap: 8 },
    iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
    banner: { height: 100, alignItems: "flex-end", justifyContent: "flex-end", padding: 10 },
    bannerOverlay: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    bannerEditHint: { fontSize: 11, color: "#fff", fontFamily: "Inter_500Medium" },
    avatarSection: { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingHorizontal: 16, marginTop: -28, marginBottom: 12 },
    fleetingRing: { borderWidth: 3, borderRadius: 42, padding: 2 },
    avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 24, fontFamily: "Inter_700Bold" },
    fleetingBadge: { position: "absolute", top: 0, right: 0, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    fleetingBadgeText: { fontSize: 10, color: "#fff", fontFamily: "Inter_700Bold" },
    nameBlock: { flex: 1, paddingBottom: 4 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    displayName: { fontSize: 18, fontFamily: "Inter_700Bold" },
    moodBtn: { padding: 2 },
    moodEmoji: { fontSize: 20 },
    bio: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 2 },
    streakBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginBottom: 12 },
    streakText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#D97706", flex: 1 },
    streakHint: { fontSize: 12, color: "#92400E", fontFamily: "Inter_400Regular" },
    statsRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, paddingVertical: 14 },
    stat: { flex: 1, alignItems: "center" },
    statNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
    statDivider: { width: 1, height: 28 },
    heatmapCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
    heatmapTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
    heatmapGrid: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
    heatmapCell: { width: 14, height: 14, borderRadius: 3 },
    heatmapLegend: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8 },
    achievementsCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
    achievementsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
    achievementsRow: { gap: 8, paddingBottom: 2 },
    achievementChip: { alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 4, minWidth: 72 },
    achievementEmoji: { fontSize: 22 },
    achievementLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
    fleetingCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 2, padding: 14, gap: 6 },
    fleetingHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
    fleetingTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    fleetingSnippet: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
    fleetingExpiry: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },
    tabBar: { flexDirection: "row", padding: 6, gap: 6, margin: 12, borderRadius: 12 },
    tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: "transparent" },
    tabText: { fontSize: 14 },
    emptyState: { paddingTop: 40, alignItems: "center", gap: 10, paddingHorizontal: 40 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
    pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
    pickerHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    pickerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
    pickerSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 14 },
    emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 8 },
    emojiBtn: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    emojiOption: { fontSize: 28 },
    colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 4, paddingBottom: 8 },
    colorSwatch: { width: 46, height: 46, borderRadius: 23 },
    colorSwatchActive: { borderWidth: 3, borderColor: "#fff" },
    fleetingInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular", minHeight: 100, textAlignVertical: "top", marginBottom: 12 },
    fleetingSubmitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    fleetingSubmitText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Platform, ScrollView, Animated, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApp, Thought } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { formatCount, timeAgo } from "@/utils/format";
import { useFeedback } from "@/hooks/useFeedback";
import { useModal } from "@/context/ModalContext";
import { applyFeedFilters } from "@/utils/feedFilter";
import * as svc from "@/lib/thoughtsService";
import { supabase } from "@/lib/supabase";
import { isNightOpenIST, minutesUntilOpenIST, minutesUntilCloseIST } from "@/utils/nightWindow";
import {
  fetchNightStreak, fetchNightBadges, fetchTodayActivity,
  fetchNightActivityHistory, updateNightMood, updateNightStreak,
  checkAndAwardBadges, getHighestBadge, prioritizeNightThoughts,
  computeNightMoodStats, fetchNightEngagement,
  NIGHT_BADGE_META, NIGHT_MOODS,
  NightStreak, NightBadge, NightActivity, NightMoodStats, NightEngagement, BadgeId,
} from "@/utils/nightStatsService";

// ─── Time helpers ─────────────────────────────────────────────────────────────

const TIMEZONE = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "your timezone"; }
})();

function tzAbbr() {
  try {
    const parts = new Date().toLocaleTimeString([], { timeZoneName: "short" }).split(" ");
    return parts[parts.length - 1];
  } catch { return ""; }
}

function fmtCountdown(mins: number): string {
  if (mins <= 0) return "any moment";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

interface DynamicStatus {
  label: string;
  fabLabel: string;
  isOpen: boolean;
  urgency: "normal" | "soon";
}

function getDynamicStatus(d: Date = new Date()): DynamicStatus {
  const open = isNightOpenIST(d);
  if (open) {
    const mins = minutesUntilCloseIST(d);
    if (mins <= 30) {
      return { label: `Closing in ${fmtCountdown(mins)}`, fabLabel: `Closing in ${fmtCountdown(mins)}`, isOpen: true, urgency: "soon" };
    }
    return { label: `Live now · closes in ${fmtCountdown(mins)}`, fabLabel: "Share now", isOpen: true, urgency: "normal" };
  } else {
    const mins = minutesUntilOpenIST(d);
    if (mins <= 30) {
      return { label: `Opening soon · in ${fmtCountdown(mins)}`, fabLabel: `Opening soon`, isOpen: false, urgency: "soon" };
    }
    return { label: `4 AM opens in ${fmtCountdown(mins)}`, fabLabel: `Opens in ${fmtCountdown(mins)}`, isOpen: false, urgency: "normal" };
  }
}

// ─── Night badges (preserved, augmented with DB persistence) ──────────────────

const NIGHT_BADGES = [
  { id: "night_owl",      label: "Night Owl",      emoji: "🦉",  color: "#A78BFA", min: 1 },
  { id: "night_thinker",  label: "Night Thinker",  emoji: "🌙",  color: "#818CF8", min: 5 },
  { id: "moon_child",     label: "Moon Child",     emoji: "🌕",  color: "#C4B5FD", min: 10 },
  { id: "nocturnal_sage", label: "Nocturnal Sage", emoji: "⭐",  color: "#F9A8D4", min: 20 },
];

function getNightBadge(count: number) {
  return [...NIGHT_BADGES].reverse().find(b => count >= b.min) || null;
}

// ─── Palette — always dark/moody regardless of app theme ─────────────────────

const NIGHT = {
  bg:      "#05051A",
  surface: "#0D0D2E",
  card:    "#12123A",
  border:  "#1E1E50",
  primary: "#7C3AED",
  accent:  "#C4B5FD",
  star:    "#F9A8D4",
  muted:   "#6B6BAA",
  text:    "#E8E8FF",
  subtext: "#9999CC",
  warn:    "#FBBF24",
  glow:    "rgba(196, 181, 253, 0.12)",
  streak:  "#FBBF24",
};

const STARS = ["✦", "✧", "⋆", "·", "✦", "⋆", "·", "✧", "✦", "·", "⋆", "✦"];

// ─── Starfield ────────────────────────────────────────────────────────────────

function StarField() {
  const anims = useRef(STARS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 400),
          Animated.timing(a, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.2, duration: 1800, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, [anims]);

  return (
    <View style={sf.container} pointerEvents="none">
      {STARS.map((star, i) => (
        <Animated.Text
          key={i}
          style={[sf.star, {
            opacity: anims[i],
            top: `${Math.floor(Math.random() * 80 + 5)}%` as any,
            left: `${Math.floor(Math.random() * 90 + 2)}%` as any,
            fontSize: [8, 10, 6, 12][i % 4],
          }]}
        >
          {star}
        </Animated.Text>
      ))}
    </View>
  );
}

const sf = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  star: { position: "absolute", color: "#C4B5FD" },
});

// ─── Compose modal ────────────────────────────────────────────────────────────

function ComposeModal({ visible, onClose, onSubmit }: {
  visible: boolean; onClose: () => void; onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const remaining = 280 - text.length;

  useEffect(() => {
    if (visible) setText("");
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={cm.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={cm.sheet}>
          <View style={cm.handle} />
          <View style={cm.headerRow}>
            <Text style={cm.title}>🌙 Share now</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color={NIGHT.muted} />
            </TouchableOpacity>
          </View>
          <View style={cm.tagRow}>
            <View style={cm.tag}><Text style={cm.tagText}>#overthink</Text></View>
            <Text style={cm.tagHint}>Added automatically</Text>
          </View>
          <TextInput
            style={cm.input}
            placeholder="What's keeping you up tonight..."
            placeholderTextColor={NIGHT.muted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={280}
            autoFocus
          />
          <View style={cm.liveNote}>
            <Feather name="zap" size={13} color={NIGHT.accent} />
            <Text style={cm.liveNoteText}>
              Posts <Text style={{ color: NIGHT.accent, fontFamily: "Inter_600SemiBold" }}>live, right now</Text> to the 4 AM feed
            </Text>
          </View>
          <View style={cm.footer}>
            <Text style={[cm.counter, remaining < 40 && { color: remaining < 10 ? "#EF4444" : NIGHT.warn }]}>
              {remaining}
            </Text>
            <TouchableOpacity
              onPress={() => { if (text.trim()) { onSubmit(text.trim()); setText(""); onClose(); } }}
              style={[cm.submitBtn, { opacity: text.trim() ? 1 : 0.4 }]}
              activeOpacity={0.8}
            >
              <Text style={cm.submitText}>Share now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  sheet: { backgroundColor: NIGHT.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: NIGHT.border, padding: 20, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: NIGHT.border, alignSelf: "center", marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", color: NIGHT.text },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  tag: { backgroundColor: NIGHT.primary + "40", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: NIGHT.primary + "60" },
  tagText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: NIGHT.accent },
  tagHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: NIGHT.muted },
  input: { backgroundColor: NIGHT.card, borderRadius: 12, borderWidth: 1, borderColor: NIGHT.border, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: NIGHT.text, minHeight: 120, textAlignVertical: "top", lineHeight: 22 },
  liveNote: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12, backgroundColor: NIGHT.primary + "18", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: NIGHT.primary + "35" },
  liveNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: NIGHT.subtext, lineHeight: 17 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  counter: { fontSize: 13, fontFamily: "Inter_400Regular", color: NIGHT.muted },
  submitBtn: { backgroundColor: NIGHT.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  submitText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});

// ─── Mood Picker Modal ────────────────────────────────────────────────────────

function MoodPickerModal({ visible, onClose, currentMood, onSelect }: {
  visible: boolean; onClose: () => void; currentMood: string | null; onSelect: (emoji: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={mp.overlay} activeOpacity={1} onPress={onClose}>
        <View style={mp.sheet}>
          <View style={mp.handle} />
          <Text style={mp.title}>How are you feeling tonight?</Text>
          <View style={mp.grid}>
            {NIGHT_MOODS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                onPress={() => { onSelect(emoji); onClose(); }}
                style={[mp.emojiBtn, currentMood === emoji && { backgroundColor: NIGHT.primary + "40", borderColor: NIGHT.accent }]}
                activeOpacity={0.7}
              >
                <Text style={mp.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const mp = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: 40 },
  sheet: { backgroundColor: NIGHT.surface, borderRadius: 20, borderWidth: 1, borderColor: NIGHT.border, padding: 20, width: "100%", maxWidth: 340 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: NIGHT.border, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: NIGHT.text, textAlign: "center", marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  emojiBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: NIGHT.border, backgroundColor: NIGHT.card },
  emojiText: { fontSize: 22 },
});

// ─── Stats / Insights Modal ───────────────────────────────────────────────────

function StatsModal({ visible, onClose, stats, engagement, streak }: {
  visible: boolean; onClose: () => void;
  stats: NightMoodStats | null;
  engagement: NightEngagement[];
  streak: NightStreak | null;
}) {
  const hasData = stats && stats.totalSessions > 0;
  const recentEngagement = engagement.slice(0, 7);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={stm.overlay}>
        <View style={stm.sheet}>
          <View style={stm.handle} />
          <View style={stm.headerRow}>
            <Text style={stm.title}>📊 Night Insights</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color={NIGHT.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={stm.scrollContent}>
            {/* Streak card */}
            {streak && (
              <View style={stm.card}>
                <View style={stm.cardRow}>
                  <Feather name="zap" size={18} color={NIGHT.streak} />
                  <Text style={stm.cardTitle}>Night Streak</Text>
                </View>
                <View style={stm.streakRow}>
                  <Text style={stm.streakValue}>{streak.currentStreak}</Text>
                  <Text style={stm.streakLabel}>current</Text>
                  <View style={stm.streakDivider} />
                  <Text style={stm.streakValue}>{streak.longestStreak}</Text>
                  <Text style={stm.streakLabel}>longest</Text>
                </View>
              </View>
            )}

            {/* Stats summary */}
            {hasData && (
              <View style={stm.card}>
                <View style={stm.cardRow}>
                  <Feather name="bar-chart-2" size={18} color={NIGHT.accent} />
                  <Text style={stm.cardTitle}>Night Stats</Text>
                </View>
                <View style={stm.statsGrid}>
                  <View style={stm.statItem}>
                    <Text style={stm.statValue}>{stats!.totalSessions}</Text>
                    <Text style={stm.statLabel}>sessions</Text>
                  </View>
                  <View style={stm.statItem}>
                    <Text style={stm.statValue}>{stats!.totalThoughts}</Text>
                    <Text style={stm.statLabel}>thoughts</Text>
                  </View>
                  <View style={stm.statItem}>
                    <Text style={stm.statValue}>{stats!.averageThoughtsPerSession}</Text>
                    <Text style={stm.statLabel}>avg/session</Text>
                  </View>
                  <View style={stm.statItem}>
                    <Text style={stm.statValue}>{stats!.totalAppreciationsReceived}</Text>
                    <Text style={stm.statLabel}>❤️ received</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Mood distribution */}
            {hasData && stats!.mostFrequentMood && (
              <View style={stm.card}>
                <View style={stm.cardRow}>
                  <Feather name="heart" size={18} color={NIGHT.star} />
                  <Text style={stm.cardTitle}>Your Night Moods</Text>
                </View>
                <Text style={stm.moodMost}>Most often: <Text style={stm.moodEmojiInline}>{stats!.mostFrequentMood}</Text></Text>
                {Object.entries(stats!.moodDistribution).sort((a, b) => b[1] - a[1]).map(([emoji, count]) => (
                  <View key={emoji} style={stm.moodRow}>
                    <Text style={stm.moodEmoji}>{emoji}</Text>
                    <View style={stm.moodBarBg}>
                      <View style={[stm.moodBar, { width: `${(count / stats!.totalSessions) * 100}%` }]} />
                    </View>
                    <Text style={stm.moodCount}>{count}x</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent engagement */}
            {recentEngagement.length > 0 && (
              <View style={stm.card}>
                <View style={stm.cardRow}>
                  <Feather name="activity" size={18} color={NIGHT.accent} />
                  <Text style={stm.cardTitle}>Recent Nights</Text>
                </View>
                {recentEngagement.map((day) => (
                  <View key={day.date} style={stm.engagementRow}>
                    <Text style={stm.engagementDate}>
                      {new Date(day.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </Text>
                    <Text style={stm.engagementMood}>{day.mood || "—"}</Text>
                    <Text style={stm.engagementPosts}>{day.thoughtsPosted} posts</Text>
                    <Text style={stm.engagementHearts}>{day.appreciationsReceived} ❤️</Text>
                  </View>
                ))}
              </View>
            )}

            {!hasData && (
              <View style={stm.emptyCard}>
                <Text style={stm.emptyText}>No night sessions yet.</Text>
                <Text style={stm.emptyHint}>Post to the 4 AM feed to start tracking your nights.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const stm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  sheet: { backgroundColor: NIGHT.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: NIGHT.border, padding: 20, paddingBottom: 40, maxHeight: "85%" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: NIGHT.border, alignSelf: "center", marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", color: NIGHT.text },
  scrollContent: { gap: 12, paddingBottom: 20 },
  card: { backgroundColor: NIGHT.card, borderRadius: 14, borderWidth: 1, borderColor: NIGHT.border, padding: 14 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: NIGHT.text },
  streakRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  streakValue: { fontSize: 36, fontFamily: "Inter_700Bold", color: NIGHT.streak },
  streakLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: NIGHT.subtext, marginTop: 4 },
  streakDivider: { width: 1, height: 40, backgroundColor: NIGHT.border, marginHorizontal: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statItem: { width: "47%", backgroundColor: NIGHT.surface, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: NIGHT.border },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: NIGHT.text },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: NIGHT.subtext, marginTop: 2 },
  moodMost: { fontSize: 13, fontFamily: "Inter_400Regular", color: NIGHT.subtext, marginBottom: 10 },
  moodEmojiInline: { fontSize: 18 },
  moodRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  moodEmoji: { fontSize: 18, width: 28 },
  moodBarBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: NIGHT.surface, overflow: "hidden" },
  moodBar: { height: 8, borderRadius: 4, backgroundColor: NIGHT.accent },
  moodCount: { fontSize: 12, fontFamily: "Inter_500Medium", color: NIGHT.subtext, width: 30, textAlign: "right" },
  engagementRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: NIGHT.border + "60" },
  engagementDate: { fontSize: 11, fontFamily: "Inter_500Medium", color: NIGHT.subtext, width: 90 },
  engagementMood: { fontSize: 16, width: 24, textAlign: "center" },
  engagementPosts: { fontSize: 11, fontFamily: "Inter_400Regular", color: NIGHT.text, flex: 1, textAlign: "right" },
  engagementHearts: { fontSize: 11, fontFamily: "Inter_400Regular", color: NIGHT.star, width: 50, textAlign: "right" },
  emptyCard: { backgroundColor: NIGHT.card, borderRadius: 14, borderWidth: 1, borderColor: NIGHT.border, padding: 20, alignItems: "center" },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: NIGHT.text, marginBottom: 4 },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular", color: NIGHT.subtext, textAlign: "center" },
});

// ─── Published night thought card (enhanced with anonymous glow) ──────────────

function NightThoughtCard({ content, author, alias, postingMode, createdAt, appreciations, hasAppreciated, onAppreciate }: {
  content: string; author: string; alias?: string; postingMode: string;
  createdAt: string; appreciations: number; hasAppreciated: boolean;
  onAppreciate: () => void;
}) {
  const displayName = postingMode === "Anonymous" ? "Anonymous" : (alias || author);
  const isAnonymous = postingMode === "Anonymous";

  return (
    <View style={[nc.card, isAnonymous && nc.cardAnonymous]}>
      <View style={nc.header}>
        <View style={[nc.avatar, isAnonymous && nc.avatarAnonymous]}>
          <Text style={[nc.avatarText, isAnonymous && nc.avatarTextAnonymous]}>
            {postingMode === "Anonymous" ? "?" : displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={[nc.author, isAnonymous && nc.authorAnonymous]}>{displayName}</Text>
          <Text style={nc.time}>{timeAgo(createdAt)}</Text>
        </View>
        {isAnonymous && (
          <View style={nc.anonChip}>
            <Feather name="eye-off" size={10} color={NIGHT.accent} />
            <Text style={nc.anonChipText}>Anonymous</Text>
          </View>
        )}
        <View style={nc.postedChip}>
          <Feather name="zap" size={10} color={NIGHT.accent} />
          <Text style={nc.postedChipText}>Live</Text>
        </View>
      </View>
      <Text style={[nc.content, isAnonymous && nc.contentAnonymous]}>{content.replace(/#overthink\s*/gi, "").trim()}</Text>
      <TouchableOpacity onPress={onAppreciate} style={nc.appreciateBtn} activeOpacity={0.7}>
        <Text style={[nc.heartIcon, hasAppreciated && { color: "#F9A8D4" }]}>
          {hasAppreciated ? "♥" : "♡"}
        </Text>
        <Text style={[nc.appreciateCount, hasAppreciated && { color: "#F9A8D4" }]}>
          {formatCount(appreciations)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const nc = StyleSheet.create({
  card: { backgroundColor: NIGHT.card, marginHorizontal: 12, marginVertical: 6, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: NIGHT.border },
  cardAnonymous: { borderColor: NIGHT.accent + "50", backgroundColor: NIGHT.primary + "08" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: NIGHT.primary + "40", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: NIGHT.primary + "60" },
  avatarAnonymous: { borderColor: NIGHT.accent + "80", backgroundColor: NIGHT.primary + "60" },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: NIGHT.accent },
  avatarTextAnonymous: { color: "#fff" },
  author: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: NIGHT.text },
  authorAnonymous: { color: NIGHT.accent, fontStyle: "italic" as any },
  time: { fontSize: 11, fontFamily: "Inter_400Regular", color: NIGHT.muted },
  content: { fontSize: 14, fontFamily: "Inter_400Regular", color: NIGHT.text, lineHeight: 22, marginBottom: 12 },
  contentAnonymous: { color: NIGHT.accent, fontFamily: "Inter_400Regular" },
  postedChip: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: NIGHT.primary + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: NIGHT.primary + "40" },
  postedChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: NIGHT.accent },
  anonChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: NIGHT.accent + "15", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: NIGHT.accent + "30" },
  anonChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: NIGHT.accent },
  appreciateBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  heartIcon: { fontSize: 18, color: NIGHT.muted },
  appreciateCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: NIGHT.muted },
});

// ─── Mood quick-select strip ──────────────────────────────────────────────────

function MoodStrip({ currentMood, onOpenPicker }: { currentMood: string | null; onOpenPicker: () => void }) {
  return (
    <TouchableOpacity style={ms.strip} onPress={onOpenPicker} activeOpacity={0.7}>
      <Text style={ms.label}>Tonight's mood</Text>
      <Text style={ms.mood}>{currentMood || "—"}</Text>
      <Feather name="edit-2" size={12} color={NIGHT.muted} />
    </TouchableOpacity>
  );
}

const ms = StyleSheet.create({
  strip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: NIGHT.surface, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: NIGHT.border, zIndex: 1 },
  label: { fontSize: 12, fontFamily: "Inter_400Regular", color: NIGHT.muted },
  mood: { fontSize: 18, fontFamily: "Inter_400Regular" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LateNightScreen() {
  const insets = useSafeAreaInsets();
  const { thoughts, currentUser, toggleAppreciate, isBlocked, isMuted, blockedUsers, mutedUsers, postNightThought } = useApp();
  const { user } = useAuth();
  const { blockedWords } = useSettings();
  const { tap, success } = useFeedback();
  const modal = useModal();

  const [showCompose, setShowCompose] = useState(false);
  const [status, setStatus] = useState<DynamicStatus>(() => getDynamicStatus());
  const [nightFeed, setNightFeed] = useState<Thought[]>([]);
  const [loadingNight, setLoadingNight] = useState(false);

  // Phase 2 state
  const [nightStreak, setNightStreak] = useState<NightStreak | null>(null);
  const [nightBadges, setNightBadges] = useState<NightBadge[]>([]);
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [moodStats, setMoodStats] = useState<NightMoodStats | null>(null);
  const [engagement, setEngagement] = useState<NightEngagement[]>([]);
  const [nightStatsLoading, setNightStatsLoading] = useState(false);

  // ─── 1-minute realtime clock — updates status label and open/closed state ──
  useEffect(() => {
    const tick = () => setStatus(getDynamicStatus());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // ─── Load Phase 2 data (streaks, badges, moods) ─────────────────────────
  useEffect(() => {
    if (!user) return;
    const loadNightData = async () => {
      setNightStatsLoading(true);
      try {
        const [streak, badges, activity] = await Promise.all([
          fetchNightStreak(user.id),
          fetchNightBadges(user.id),
          fetchTodayActivity(user.id),
        ]);
        if (streak) setNightStreak(streak);
        if (badges) setNightBadges(badges);
        if (activity?.moodEmoji) setTodayMood(activity.moodEmoji);
      } catch {
        // Non-critical — fall back gracefully
      } finally {
        setNightStatsLoading(false);
      }
    };
    loadNightData();
  }, [user]);

  // ─── Load initial night thoughts from Supabase ────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoadingNight(true);
    const excludeIds = [
      ...blockedUsers.map(b => b.id),
      ...mutedUsers.map(m => m.id),
    ];
    svc.fetchNightThoughts(user.id, excludeIds)
      .then(data => { if (data.length > 0) setNightFeed(data); })
      .catch(() => {})
      .finally(() => setLoadingNight(false));
  }, [user]);

  // ─── Supabase Realtime subscription for live 4 AM feed ───────────────────
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("4am-feed-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thoughts",
          filter: "is_night_thought=eq.true",
        },
        async (payload) => {
          const row = payload.new as any;
          // Skip thoughts we already have (our own optimistic entries)
          if (!row?.id) return;

          // Server-side guard: skip before any extra fetch if author is known blocked/muted
          if (row.author_id && (isBlocked(row.author_id) || isMuted(row.author_id))) return;

          // Fetch the full thought with profile join + user interactions
          const { data } = await supabase
            .from("thoughts")
            .select("*, profiles!thoughts_author_id_fkey(display_name, username, hide_appreciations, hide_reposts)")
            .eq("id", row.id)
            .single();

          if (!data) return;

          // Final guard in case block/mute state changed after the preflight check
          if (isBlocked(data.author_id) || isMuted(data.author_id)) return;

          const interactions = await svc.fetchUserInteractions(user.id, [row.id]);
          // Map manually since mapDbThought is not exported
          const newThought: Thought = {
            id: data.id,
            content: data.content,
            authorId: data.author_id,
            authorName: data.profiles?.display_name ?? "Unknown",
            authorUsername: data.profiles?.username ?? "",
            postingMode: data.posting_mode,
            alias: data.alias ?? undefined,
            category: data.category,
            appreciations: data.appreciations,
            disagreements: data.disagreements,
            reposts: data.reposts,
            saves: data.saves,
            comments: data.comments,
            reportCount: data.report_count,
            qualityScore: data.quality_score,
            createdAt: data.created_at,
            isEdited: data.is_edited,
            editedAt: data.edited_at ?? undefined,
            hasAppreciated: interactions.appreciated.has(row.id),
            hasDisagreed: interactions.disagreed.has(row.id),
            hasSaved: interactions.saved.has(row.id),
            hasReposted: interactions.reposted.has(row.id),
            hasReported: interactions.reported.has(row.id),
            type: data.type,
            feedReason: data.feed_reason ?? undefined,
            isRepost: data.is_repost,
          };

          setNightFeed(prev => {
            if (prev.find(t => t.id === newThought.id)) return prev;
            return [newThought, ...prev];
          });
        }
      )
      .subscribe((status: string, err?: any) => {
        if (status === "SUBSCRIBED") {
          console.log("🔧 4AM REALTIME: Subscribed");
        }
        if (status === "CHANNEL_ERROR" && err) {
          console.error("🔧 4AM REALTIME ERROR:", err?.message || err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  // Merge local new night thoughts with server data
  const localNightThoughts = useMemo(
    () => thoughts.filter(t => t.content.toLowerCase().includes("#overthink")),
    [thoughts]
  );

  const allNightThoughts = useMemo(() => {
    const merged = [...localNightThoughts];
    nightFeed.forEach(t => {
      if (!merged.find(x => x.id === t.id)) merged.push(t);
    });
    return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [localNightThoughts, nightFeed]);

  // ─── Apply filters + deep thought prioritization (Phase 2) ──────────────
  const nightThoughts = useMemo(
    () => {
      const filtered = applyFeedFilters(
        allNightThoughts,
        { blockedWords, isBlocked, isMuted, currentUserId: currentUser.id }
      );
      // Phase 2: Deep thoughts prioritization
      return prioritizeNightThoughts(filtered);
    },
    [allNightThoughts, blockedWords, isBlocked, isMuted, currentUser.id]
  );

  const myNightCount = useMemo(
    () => nightThoughts.filter(t => t.authorId === currentUser.id).length,
    [nightThoughts, currentUser.id]
  );
  const myBadge = getNightBadge(myNightCount);

  // Phase 2: Use persisted badges as fallback
  const earnedBadgeMeta = useMemo(() => {
    const highest = getHighestBadge(nightBadges);
    return highest ? NIGHT_BADGE_META[highest.badgeId as BadgeId] : null;
  }, [nightBadges]);

  const badgeToShow = earnedBadgeMeta || myBadge;

  const topContributors = useMemo(() => {
    const counts: Record<string, { name: string; count: number; badge: typeof NIGHT_BADGES[0] | null }> = {};
    nightThoughts.forEach(t => {
      if (t.postingMode === "Anonymous") return;
      const name = t.alias || t.authorName;
      if (!counts[name]) counts[name] = { name, count: 0, badge: null };
      counts[name].count++;
    });
    return Object.values(counts)
      .map(c => ({ ...c, badge: getNightBadge(c.count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [nightThoughts]);

  const onSubmitThought = useCallback(async (text: string) => {
    const posted = postNightThought(text);
    if (posted) {
      success();
      // Phase 2: Update streak and badges after posting
      if (user) {
        updateNightStreak(user.id).catch(() => {});
        checkAndAwardBadges(user.id).then(newBadges => {
          if (newBadges.length > 0) {
            fetchNightBadges(user.id).then(setNightBadges).catch(() => {});
          }
        }).catch(() => {});
        // Refresh streak
        fetchNightStreak(user.id).then(setNightStreak).catch(() => {});
      }
    } else {
      modal.alert({
        title: "The feed just closed 🌙",
        message: "4 AM closes at 4:00 AM. Come back at 10:00 PM to share instantly.",
      });
    }
  }, [success, postNightThought, modal, user]);

  const onPressShare = useCallback(() => {
    tap();
    if (!status.isOpen) {
      modal.alert({
        title: "The feed is asleep 🌙",
        message: "4 AM is open from 10:00 PM to 4:00 AM. Come back during those hours to share instantly.",
      });
      return;
    }
    setShowCompose(true);
  }, [tap, modal, status.isOpen]);

  // Phase 2: Mood selection handler
  const onMoodSelect = useCallback(async (emoji: string) => {
    setTodayMood(emoji);
    if (user) {
      updateNightMood(user.id, emoji).catch(() => {});
    }
  }, [user]);

  // Phase 2: Open stats modal — load data on demand
  const onOpenStats = useCallback(async () => {
    setShowStats(true);
    if (!user) return;
    try {
      const [activities, engagementData, streakData] = await Promise.all([
        fetchNightActivityHistory(user.id, 30),
        fetchNightEngagement(user.id, 7),
        fetchNightStreak(user.id),
      ]);
      setMoodStats(computeNightMoodStats(activities));
      setEngagement(engagementData);
      if (streakData) setNightStreak(streakData);
    } catch {
      // Graceful failure
    }
  }, [user]);

  // Status bar color cues
  const statusColor = status.urgency === "soon"
    ? (status.isOpen ? NIGHT.warn : NIGHT.accent)
    : (status.isOpen ? NIGHT.accent : NIGHT.muted);

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <StarField />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>4 AM 🌙</Text>
          <Text style={s.subtitle}>Open 10 PM–4 AM · share instantly</Text>
        </View>
        <View style={s.headerRight}>
          {/* Night streak indicator */}
          {nightStreak && nightStreak.currentStreak > 0 && (
            <TouchableOpacity style={s.streakBadge} onPress={onOpenStats} activeOpacity={0.7}>
              <Feather name="zap" size={12} color={NIGHT.streak} />
              <Text style={s.streakText}>{nightStreak.currentStreak}</Text>
            </TouchableOpacity>
          )}
          {badgeToShow && (
            <View style={[s.myBadge, { borderColor: badgeToShow.color + "60", backgroundColor: badgeToShow.color + "20" }]}>
              <Text style={s.myBadgeEmoji}>{badgeToShow.emoji}</Text>
              <Text style={[s.myBadgeLabel, { color: badgeToShow.color }]}>{badgeToShow.label}</Text>
            </View>
          )}
          {/* Stats button */}
          <TouchableOpacity style={s.statsBtn} onPress={onOpenStats} activeOpacity={0.7}>
            <Feather name="bar-chart-2" size={14} color={NIGHT.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dynamic realtime status bar */}
      <View style={s.tzBar}>
        <Feather
          name={status.isOpen ? "zap" : "moon"}
          size={13}
          color={statusColor}
        />
        <Text style={[s.tzText, { color: NIGHT.subtext }]}>
          <Text style={{ color: statusColor, fontFamily: "Inter_600SemiBold" }}>
            {status.label}
          </Text>
          {status.isOpen ? ` · ${tzAbbr()} · ${TIMEZONE}` : ` · ${TIMEZONE}`}
        </Text>
      </View>

      {/* Phase 2: Mood quick-select for tonight */}
      {status.isOpen && (
        <MoodStrip currentMood={todayMood} onOpenPicker={() => setShowMoodPicker(true)} />
      )}

      <FlatList
        data={status.isOpen ? nightThoughts : []}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
        renderItem={({ item }) => (
          <NightThoughtCard
            content={item.content}
            author={item.authorName}
            alias={item.alias}
            postingMode={item.postingMode}
            createdAt={item.createdAt}
            appreciations={item.appreciations}
            hasAppreciated={item.hasAppreciated}
            onAppreciate={() => { tap(); toggleAppreciate(item.id); }}
          />
        )}
        ListHeaderComponent={
          <View>
            {topContributors.length > 0 && (
              <View style={s.leaderStrip}>
                <Text style={s.leaderLabel}>⭐ TONIGHT'S THINKERS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.leaderRow}>
                  {topContributors.map((c, i) => (
                    <View key={c.name} style={s.leaderChip}>
                      <Text style={s.leaderRank}>#{i + 1}</Text>
                      <Text style={s.leaderName}>{c.name}</Text>
                      {c.badge && <Text style={s.leaderBadge}>{c.badge.emoji}</Text>}
                      <Text style={s.leaderCount}>{c.count} posts</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Phase 2: "Deep Thought" section label */}
            {nightThoughts.length > 0 && (
              <Text style={[s.sectionLabel, { marginHorizontal: 16, marginTop: 8 }]}>
                🌙 DEEP THOUGHTS · LIVE ON THE FEED
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyMoon}>🌕</Text>
            <Text style={s.emptyTitle}>The feed is quiet</Text>
            <Text style={s.emptyText}>
              {status.isOpen
                ? "Share a thought and it'll appear here instantly."
                : `4 AM opens at 10 PM. Come back then to share instantly.`}
            </Text>
            {!status.isOpen && (
              <View style={s.countdownPill}>
                <Feather name="clock" size={12} color={NIGHT.accent} />
                <Text style={s.countdownPillText}>{status.label}</Text>
              </View>
            )}
          </View>
        }
      />

      {/* Compose FAB — dynamic label */}
      <TouchableOpacity
        style={[s.fab, { bottom: bottomPad + 16 }, !status.isOpen && s.fabClosed, status.urgency === "soon" && status.isOpen && s.fabWarning]}
        onPress={onPressShare}
        activeOpacity={0.85}
      >
        <Text style={s.fabMoon}>{status.isOpen ? "🌙" : "💤"}</Text>
        <Text style={[s.fabText, !status.isOpen && { color: NIGHT.subtext }]}>
          {status.fabLabel}
        </Text>
      </TouchableOpacity>

      <ComposeModal
        visible={showCompose}
        onClose={() => setShowCompose(false)}
        onSubmit={onSubmitThought}
      />

      {/* Phase 2: Mood picker */}
      <MoodPickerModal
        visible={showMoodPicker}
        onClose={() => setShowMoodPicker(false)}
        currentMood={todayMood}
        onSelect={onMoodSelect}
      />

      {/* Phase 2: Stats & Insights modal */}
      <StatsModal
        visible={showStats}
        onClose={() => setShowStats(false)}
        stats={moodStats}
        engagement={engagement}
        streak={nightStreak}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHT.bg },
  header: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: NIGHT.border, zIndex: 1,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: NIGHT.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: NIGHT.muted, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: NIGHT.streak + "15", borderRadius: 14, borderWidth: 1,
    borderColor: NIGHT.streak + "40", paddingHorizontal: 8, paddingVertical: 4,
  },
  streakText: { fontSize: 12, fontFamily: "Inter_700Bold", color: NIGHT.streak },
  myBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  myBadgeEmoji: { fontSize: 14 },
  myBadgeLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsBtn: {
    width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: NIGHT.surface, borderWidth: 1, borderColor: NIGHT.border,
  },
  tzBar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NIGHT.surface, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: NIGHT.border, zIndex: 1,
  },
  tzText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: NIGHT.muted, letterSpacing: 1.2, marginBottom: 8, marginHorizontal: 12 },
  leaderStrip: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 8, zIndex: 1 },
  leaderLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: NIGHT.muted, letterSpacing: 1.2, marginBottom: 8 },
  leaderRow: { gap: 8 },
  leaderChip: {
    backgroundColor: NIGHT.surface, borderRadius: 10, borderWidth: 1, borderColor: NIGHT.border,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", gap: 2, minWidth: 80,
  },
  leaderRank: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: NIGHT.muted },
  leaderName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: NIGHT.text },
  leaderBadge: { fontSize: 14 },
  leaderCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: NIGHT.muted },
  empty: { paddingTop: 60, alignItems: "center", gap: 12, paddingHorizontal: 40, zIndex: 1 },
  emptyMoon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: NIGHT.text, textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: NIGHT.subtext, textAlign: "center", lineHeight: 22 },
  countdownPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NIGHT.primary + "20", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: NIGHT.primary + "40", marginTop: 4,
  },
  countdownPillText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: NIGHT.accent },
  fab: {
    position: "absolute", left: 16, right: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: NIGHT.primary, borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: NIGHT.accent + "40",
    shadowColor: NIGHT.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    zIndex: 10,
  },
  fabClosed: { backgroundColor: NIGHT.surface, borderColor: NIGHT.border, shadowOpacity: 0 },
  fabWarning: { backgroundColor: "#92400E", borderColor: NIGHT.warn + "60" },
  fabMoon: { fontSize: 18 },
  fabText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
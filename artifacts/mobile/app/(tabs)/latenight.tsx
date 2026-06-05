import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Platform, ScrollView, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { useSettings } from "@/context/SettingsContext";
import { formatCount, timeAgo } from "@/utils/format";
import { useFeedback } from "@/hooks/useFeedback";
import { useModal } from "@/context/ModalContext";
import { applyFeedFilters } from "@/utils/feedFilter";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

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

const OPEN_HOUR = 22; // 10 PM
const CLOSE_HOUR = 4; // 4 AM

/** The feed is open from 10 PM through 4 AM (local time). */
function isNightOpen(d: Date = new Date()) {
  const h = d.getHours();
  return h >= OPEN_HOUR || h < CLOSE_HOUR;
}

// ─── Night badges ─────────────────────────────────────────────────────────────

const NIGHT_BADGES = [
  { id: "night_owl",    label: "Night Owl",       emoji: "🦉",  color: "#A78BFA", min: 1 },
  { id: "night_thinker",label: "Night Thinker",   emoji: "🌙",  color: "#818CF8", min: 5 },
  { id: "moon_child",   label: "Moon Child",      emoji: "🌕",  color: "#C4B5FD", min: 10 },
  { id: "nocturnal_sage",label:"Nocturnal Sage",  emoji: "⭐",  color: "#F9A8D4", min: 20 },
];

function getNightBadge(count: number) {
  return [...NIGHT_BADGES].reverse().find(b => count >= b.min) || null;
}

// ─── Palette — always dark/moody regardless of app theme ─────────────────────

const NIGHT = {
  bg:        "#05051A",
  surface:   "#0D0D2E",
  card:      "#12123A",
  border:    "#1E1E50",
  primary:   "#7C3AED",
  accent:    "#C4B5FD",
  star:      "#F9A8D4",
  muted:     "#6B6BAA",
  text:      "#E8E8FF",
  subtext:   "#9999CC",
};

const STARS = ["✦","✧","⋆","·","✦","⋆","·","✧","✦","·","⋆","✦"];

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

// ─── Compose modal — posts instantly ───────────────────────────────────────────

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
      <KeyboardAvoidingView style={cm.overlay} behavior="padding">
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
              Posts <Text style={{ color: NIGHT.accent, fontFamily: "Inter_600SemiBold" }}>live, right now</Text> to the Late Night feed
            </Text>
          </View>
          <View style={cm.footer}>
            <Text style={[cm.counter, remaining < 40 && { color: remaining < 10 ? "#EF4444" : "#FBBF24" }]}>
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

// ─── Published night thought card ──────────────────────────────────────────────

function NightThoughtCard({ content, author, alias, postingMode, createdAt, appreciations, hasAppreciated, onAppreciate }: {
  content: string; author: string; alias?: string; postingMode: string;
  createdAt: string; appreciations: number; hasAppreciated: boolean;
  onAppreciate: () => void;
}) {
  const displayName = postingMode === "Anonymous" ? "Anonymous" : (alias || author);
  return (
    <View style={nc.card}>
      <View style={nc.header}>
        <View style={nc.avatar}>
          <Text style={nc.avatarText}>
            {postingMode === "Anonymous" ? "?" : displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={nc.author}>{displayName}</Text>
          <Text style={nc.time}>{timeAgo(createdAt)}</Text>
        </View>
        <View style={nc.postedChip}>
          <Feather name="check" size={10} color={NIGHT.accent} />
          <Text style={nc.postedChipText}>Live</Text>
        </View>
      </View>
      <Text style={nc.content}>{content.replace(/#overthink\s*/gi, "").trim()}</Text>
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
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: NIGHT.primary + "40", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: NIGHT.primary + "60" },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: NIGHT.accent },
  author: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: NIGHT.text },
  time: { fontSize: 11, fontFamily: "Inter_400Regular", color: NIGHT.muted },
  content: { fontSize: 14, fontFamily: "Inter_400Regular", color: NIGHT.text, lineHeight: 22, marginBottom: 12 },
  postedChip: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: NIGHT.primary + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: NIGHT.primary + "40" },
  postedChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: NIGHT.accent },
  appreciateBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  heartIcon: { fontSize: 18, color: NIGHT.muted },
  appreciateCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: NIGHT.muted },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LateNightScreen() {
  const insets = useSafeAreaInsets();
  const { thoughts, currentUser, toggleAppreciate, isBlocked, postNightThought } = useApp();
  const { blockedWords } = useSettings();
  const { tap, success } = useFeedback();
  const modal = useModal();

  const [showCompose, setShowCompose] = useState(false);
  const [nightOpen, setNightOpen] = useState(() => isNightOpen());

  // Re-evaluate the open/closed window periodically so the UI flips at 10 PM / 4 AM.
  useEffect(() => {
    const id = setInterval(() => setNightOpen(isNightOpen()), 30_000);
    return () => clearInterval(id);
  }, []);

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  // Published night thoughts = any thought containing #overthink
  const nightThoughts = useMemo(
    () => applyFeedFilters(
      thoughts.filter(t => t.content.toLowerCase().includes("#overthink")),
      { blockedWords, isBlocked, currentUserId: currentUser.id }
    ),
    [thoughts, blockedWords, isBlocked, currentUser.id]
  );

  const myNightCount = useMemo(
    () => nightThoughts.filter(t => t.authorId === currentUser.id).length,
    [nightThoughts, currentUser.id]
  );
  const myBadge = getNightBadge(myNightCount);

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

  const onSubmitThought = useCallback((text: string) => {
    const posted = postNightThought(text);
    if (posted) {
      success();
    } else {
      modal.alert({
        title: "The feed just closed 🌙",
        message: "Late Night closes at 4:00 AM. Come back at 10:00 PM to share instantly.",
      });
    }
  }, [success, postNightThought, modal]);

  const onPressShare = useCallback(() => {
    tap();
    if (!isNightOpen()) {
      modal.alert({
        title: "The feed is asleep 🌙",
        message: "Late Night is open from 10:00 PM to 4:00 AM. Come back during those hours to share instantly.",
      });
      return;
    }
    setShowCompose(true);
  }, [tap, modal]);

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <StarField />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Late Night 🌙</Text>
          <Text style={s.subtitle}>Open 10 PM–4 AM · share instantly</Text>
        </View>
        {myBadge && (
          <View style={[s.myBadge, { borderColor: myBadge.color + "60", backgroundColor: myBadge.color + "20" }]}>
            <Text style={s.myBadgeEmoji}>{myBadge.emoji}</Text>
            <Text style={[s.myBadgeLabel, { color: myBadge.color }]}>{myBadge.label}</Text>
          </View>
        )}
      </View>

      {/* Open / closed status */}
      <View style={s.tzBar}>
        <Feather name={nightOpen ? "zap" : "moon"} size={13} color={nightOpen ? NIGHT.accent : NIGHT.muted} />
        {nightOpen ? (
          <Text style={s.tzText}>
            <Text style={{ color: NIGHT.accent, fontFamily: "Inter_600SemiBold" }}>Live now</Text> · open until 4:00 AM {tzAbbr()} · {TIMEZONE}
          </Text>
        ) : (
          <Text style={s.tzText}>
            Opens at <Text style={{ color: NIGHT.accent, fontFamily: "Inter_600SemiBold" }}>10:00 PM {tzAbbr()}</Text> · {TIMEZONE}
          </Text>
        )}
      </View>

      <FlatList
        data={nightThoughts}
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

            {nightThoughts.length > 0 && (
              <Text style={[s.sectionLabel, { marginHorizontal: 16, marginTop: 8 }]}>🌙 LIVE ON THE FEED</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyMoon}>🌕</Text>
            <Text style={s.emptyTitle}>The feed is quiet</Text>
            <Text style={s.emptyText}>
              {nightOpen
                ? "Share a thought and it'll appear here instantly."
                : "Late Night opens at 10 PM. Come back then to share instantly."}
            </Text>
          </View>
        }
      />

      {/* Compose FAB */}
      <TouchableOpacity
        style={[s.fab, { bottom: bottomPad + 16 }, !nightOpen && s.fabClosed]}
        onPress={onPressShare}
        activeOpacity={0.85}
      >
        <Text style={s.fabMoon}>{nightOpen ? "🌙" : "💤"}</Text>
        <Text style={s.fabText}>{nightOpen ? "Share now (10 PM–4 AM)" : "Opens at 10 PM"}</Text>
      </TouchableOpacity>

      <ComposeModal
        visible={showCompose}
        onClose={() => setShowCompose(false)}
        onSubmit={onSubmitThought}
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
  myBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  myBadgeEmoji: { fontSize: 14 },
  myBadgeLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tzBar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NIGHT.surface, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: NIGHT.border, zIndex: 1,
  },
  tzText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: NIGHT.subtext },
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
  fab: {
    position: "absolute", left: 16, right: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: NIGHT.primary, borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: NIGHT.accent + "40",
    shadowColor: NIGHT.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    zIndex: 10,
  },
  fabClosed: { backgroundColor: NIGHT.surface, borderColor: NIGHT.border, shadowOpacity: 0 },
  fabMoon: { fontSize: 18 },
  fabText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});

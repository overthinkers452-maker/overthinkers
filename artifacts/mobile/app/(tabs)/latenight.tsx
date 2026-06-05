import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Platform, ScrollView, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useApp, ScheduledThought } from "@/context/AppContext";
import { useSettings } from "@/context/SettingsContext";
import { formatCount, timeAgo } from "@/utils/format";
import { useFeedback } from "@/hooks/useFeedback";
import { useModal } from "@/context/ModalContext";
import { applyFeedFilters } from "@/utils/feedFilter";

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

function formatPublishAt(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const day = sameDay ? "today" : isTomorrow ? "tomorrow" : d.toLocaleDateString([], { weekday: "long" });
  return `${time} ${day}`;
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

// ─── Compose / edit modal ──────────────────────────────────────────────────────

function ComposeModal({ visible, onClose, onSubmit, initialText, isEdit }: {
  visible: boolean; onClose: () => void; onSubmit: (text: string) => void;
  initialText?: string; isEdit?: boolean;
}) {
  const [text, setText] = useState("");
  const remaining = 280 - text.length;

  useEffect(() => {
    if (visible) setText(initialText ?? "");
  }, [visible, initialText]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cm.overlay}>
        <View style={cm.sheet}>
          <View style={cm.handle} />
          <View style={cm.headerRow}>
            <Text style={cm.title}>{isEdit ? "🌙 Edit scheduled thought" : "🌙 Schedule a thought"}</Text>
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
          {!isEdit && (
            <View style={cm.scheduleNote}>
              <Feather name="clock" size={13} color={NIGHT.accent} />
              <Text style={cm.scheduleNoteText}>
                Auto-posts at <Text style={{ color: NIGHT.accent, fontFamily: "Inter_600SemiBold" }}>1:00 AM {tzAbbr()}</Text> ({TIMEZONE})
              </Text>
            </View>
          )}
          <View style={cm.footer}>
            <Text style={[cm.counter, remaining < 40 && { color: remaining < 10 ? "#EF4444" : "#FBBF24" }]}>
              {remaining}
            </Text>
            <TouchableOpacity
              onPress={() => { if (text.trim()) { onSubmit(text.trim()); setText(""); onClose(); } }}
              style={[cm.submitBtn, { opacity: text.trim() ? 1 : 0.4 }]}
              activeOpacity={0.8}
            >
              <Text style={cm.submitText}>{isEdit ? "Save changes" : "Schedule for 1 AM"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  scheduleNote: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12, backgroundColor: NIGHT.primary + "18", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: NIGHT.primary + "35" },
  scheduleNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: NIGHT.subtext, lineHeight: 17 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  counter: { fontSize: 13, fontFamily: "Inter_400Regular", color: NIGHT.muted },
  submitBtn: { backgroundColor: NIGHT.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  submitText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});

// ─── Scheduled thought card (pending, owned by the user) ───────────────────────

function ScheduledCard({ item, onEdit, onDelete }: {
  item: ScheduledThought; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.topRow}>
        <View style={sc.badge}>
          <Feather name="clock" size={11} color={NIGHT.accent} />
          <Text style={sc.badgeText}>Scheduled</Text>
        </View>
        <Text style={sc.when}>Posts {formatPublishAt(item.publishAt)}</Text>
      </View>
      <Text style={sc.content}>{item.content}</Text>
      <View style={sc.actions}>
        <TouchableOpacity onPress={onEdit} style={sc.actionBtn} activeOpacity={0.7}>
          <Feather name="edit-2" size={13} color={NIGHT.accent} />
          <Text style={sc.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={sc.actionBtn} activeOpacity={0.7}>
          <Feather name="trash-2" size={13} color="#F9A8D4" />
          <Text style={[sc.actionText, { color: "#F9A8D4" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  card: { backgroundColor: NIGHT.surface, marginHorizontal: 12, marginVertical: 5, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: NIGHT.primary + "40", borderStyle: "dashed" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: NIGHT.primary + "30", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: NIGHT.accent },
  when: { fontSize: 11, fontFamily: "Inter_500Medium", color: NIGHT.subtext },
  content: { fontSize: 14, fontFamily: "Inter_400Regular", color: NIGHT.text, lineHeight: 21, marginBottom: 12 },
  actions: { flexDirection: "row", gap: 18 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, fontFamily: "Inter_500Medium", color: NIGHT.accent },
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
          <Text style={nc.postedChipText}>Posted</Text>
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
  postedChip: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: NIGHT.primary + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: NIGHT.primary + "40" },
  postedChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: NIGHT.accent },
  content: { fontSize: 14, fontFamily: "Inter_400Regular", color: NIGHT.text, lineHeight: 22, marginBottom: 12 },
  appreciateBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  heartIcon: { fontSize: 18, color: NIGHT.muted },
  appreciateCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: NIGHT.muted },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LateNightScreen() {
  const insets = useSafeAreaInsets();
  const {
    thoughts, currentUser, toggleAppreciate, isBlocked,
    scheduledThoughts, scheduleNightThought, editScheduledThought, deleteScheduledThought,
  } = useApp();
  const { blockedWords } = useSettings();
  const { tap, success } = useFeedback();
  const modal = useModal();

  const [showCompose, setShowCompose] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  // The current user's pending (scheduled, not yet posted) thoughts
  const myScheduled = useMemo(
    () => scheduledThoughts.filter(s => s.authorId === currentUser.id),
    [scheduledThoughts, currentUser.id]
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

  const editingItem = editingId ? myScheduled.find(s => s.id === editingId) : null;

  const onSubmitThought = useCallback((text: string) => {
    success();
    if (editingId) {
      editScheduledThought(editingId, text);
      setEditingId(null);
    } else {
      scheduleNightThought(text);
    }
  }, [success, editingId, editScheduledThought, scheduleNightThought]);

  const onDeleteScheduled = useCallback((item: ScheduledThought) => {
    modal.confirm({
      title: "Delete scheduled thought",
      message: "This won't be posted to the 1 AM Feed.",
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => deleteScheduledThought(item.id),
    });
  }, [modal, deleteScheduledThought]);

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <StarField />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>1 AM Feed 🌙</Text>
          <Text style={s.subtitle}>Write anytime · auto-posts at 1 AM</Text>
        </View>
        {myBadge && (
          <View style={[s.myBadge, { borderColor: myBadge.color + "60", backgroundColor: myBadge.color + "20" }]}>
            <Text style={s.myBadgeEmoji}>{myBadge.emoji}</Text>
            <Text style={[s.myBadgeLabel, { color: myBadge.color }]}>{myBadge.label}</Text>
          </View>
        )}
      </View>

      {/* Timezone clarity */}
      <View style={s.tzBar}>
        <Feather name="globe" size={13} color={NIGHT.muted} />
        <Text style={s.tzText}>
          Posts go live at <Text style={{ color: NIGHT.accent, fontFamily: "Inter_600SemiBold" }}>1:00 AM {tzAbbr()}</Text> · {TIMEZONE}
        </Text>
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
            {myScheduled.length > 0 && (
              <View style={s.scheduledSection}>
                <Text style={s.sectionLabel}>⏳ YOUR SCHEDULED THOUGHTS</Text>
                {myScheduled.map(item => (
                  <ScheduledCard
                    key={item.id}
                    item={item}
                    onEdit={() => { tap(); setEditingId(item.id); setShowCompose(true); }}
                    onDelete={() => onDeleteScheduled(item)}
                  />
                ))}
              </View>
            )}

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
              <Text style={[s.sectionLabel, { marginHorizontal: 16, marginTop: 8 }]}>🌙 POSTED TO THE FEED</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyMoon}>🌕</Text>
            <Text style={s.emptyTitle}>The feed is quiet</Text>
            <Text style={s.emptyText}>
              Schedule a thought and it'll appear here when the clock strikes 1 AM.
            </Text>
          </View>
        }
      />

      {/* Compose FAB — always available */}
      <TouchableOpacity
        style={[s.fab, { bottom: bottomPad + 16 }]}
        onPress={() => { tap(); setEditingId(null); setShowCompose(true); }}
        activeOpacity={0.85}
      >
        <Text style={s.fabMoon}>🌙</Text>
        <Text style={s.fabText}>Schedule a thought</Text>
      </TouchableOpacity>

      <ComposeModal
        visible={showCompose}
        onClose={() => { setShowCompose(false); setEditingId(null); }}
        onSubmit={onSubmitThought}
        initialText={editingItem?.content}
        isEdit={!!editingId}
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
  scheduledSection: { paddingTop: 14, paddingBottom: 4, zIndex: 1 },
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
  fabMoon: { fontSize: 18 },
  fabText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});

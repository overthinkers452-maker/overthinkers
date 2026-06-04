import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApp, PostingMode } from "@/context/AppContext";
import { ModeSelector } from "@/components/ModeSelector";

const CATEGORIES = [
  "Philosophy", "Technology", "Culture", "Psychology",
  "Mental Health", "Politics", "Science", "Education", "Economics", "Other",
];

const CHAR_LIMIT = 500;

export default function ComposeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addThought, currentUser } = useApp();

  const [content, setContent] = useState("");
  const [mode, setMode] = useState<PostingMode>("Public");
  const [category, setCategory] = useState("Philosophy");
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState<"24h" | "48h" | "7d">("24h");
  const [showCategories, setShowCategories] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  const remaining = CHAR_LIMIT - content.length;
  const canPost = content.trim().length > 0 && content.length <= CHAR_LIMIT;

  const modeColor =
    mode === "Public" ? colors.publicMode
    : mode === "Pseudonymous" ? colors.pseudonymousMode
    : colors.anonymousMode;

  const styles = makeStyles(colors);

  const onPost = () => {
    if (!canPost) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const pollData = showPoll && pollOptions.filter(o => o.trim()).length >= 2
      ? {
          options: pollOptions.filter(o => o.trim()).map(text => ({ text, votes: 0 })),
          duration: pollDuration,
          expiresAt: new Date(Date.now() + (pollDuration === "24h" ? 86400000 : pollDuration === "48h" ? 172800000 : 604800000)).toISOString(),
          totalVotes: 0,
        }
      : undefined;

    addThought({
      content: content.trim(),
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      postingMode: mode,
      alias: mode === "Pseudonymous" ? currentUser.displayName.split(" ")[0] + " " + currentUser.displayName.split(" ").slice(1).map(w => w[0]).join(".") : undefined,
      category,
      type: pollData ? "poll" : "standard",
      poll: pollData,
    });

    router.back();
  };

  const updatePollOption = (index: number, value: string) => {
    setPollOptions(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) setPollOptions(prev => [...prev, ""]);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) setPollOptions(prev => prev.filter((_, i) => i !== index));
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen options={{
        title: "New Thought",
        headerBackTitle: "Cancel",
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
        headerRight: () => (
          <TouchableOpacity
            onPress={onPost}
            disabled={!canPost}
            style={[styles.postBtn, { backgroundColor: canPost ? colors.primary : colors.muted }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.postBtnText, { color: canPost ? colors.primaryForeground : colors.mutedForeground }]}>
              Post
            </Text>
          </TouchableOpacity>
        ),
      }} />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.composerRow}>
          <View style={[styles.avatar, { backgroundColor: modeColor + "20" }]}>
            <Text style={[styles.avatarText, { color: modeColor }]}>
              {mode === "Anonymous" ? "?" : currentUser.displayName.charAt(0)}
            </Text>
          </View>
          <View style={styles.composerRight}>
            <TouchableOpacity
              onPress={() => setShowModeSelector(!showModeSelector)}
              style={[styles.modeBtn, { borderColor: modeColor + "50", backgroundColor: modeColor + "15" }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeBtnText, { color: modeColor }]}>
                {mode}
              </Text>
              <Feather name="chevron-down" size={13} color={modeColor} />
            </TouchableOpacity>
          </View>
        </View>

        {showModeSelector && (
          <View style={styles.modeSelectorWrapper}>
            <ModeSelector mode={mode} onChange={(m) => { setMode(m); setShowModeSelector(false); }} />
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={CHAR_LIMIT}
          value={content}
          onChangeText={setContent}
          autoFocus
          textAlignVertical="top"
        />

        <View style={styles.charRow}>
          <Text style={[styles.charCount, { color: remaining < 50 ? colors.disagree : colors.mutedForeground }]}>
            {remaining}
          </Text>
          <View style={[styles.charBar, { backgroundColor: colors.secondary }]}>
            <View style={[
              styles.charFill,
              {
                width: `${Math.min((content.length / CHAR_LIMIT) * 100, 100)}%` as any,
                backgroundColor: remaining < 50 ? colors.disagree : colors.primary,
              }
            ]} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.categoryBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
          onPress={() => setShowCategories(!showCategories)}
          activeOpacity={0.8}
        >
          <Feather name="tag" size={14} color={colors.mutedForeground} />
          <Text style={styles.categoryText}>{category}</Text>
          <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>

        {showCategories && (
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => { setCategory(c); setShowCategories(false); }}
                style={[
                  styles.categoryChip,
                  {
                    borderColor: c === category ? colors.primary : colors.border,
                    backgroundColor: c === category ? colors.primary + "15" : colors.secondary,
                  }
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryChipText, { color: c === category ? colors.primary : colors.foreground }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.pollToggleRow}>
          <View style={styles.pollToggleLeft}>
            <Feather name="bar-chart-2" size={16} color={showPoll ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.pollToggleText, { color: showPoll ? colors.primary : colors.foreground }]}>
              Add a poll
            </Text>
          </View>
          <Switch
            value={showPoll}
            onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPoll(v); }}
            trackColor={{ false: colors.muted, true: colors.primary + "60" }}
            thumbColor={showPoll ? colors.primary : colors.mutedForeground}
          />
        </View>

        {showPoll && (
          <View style={styles.pollSection}>
            {pollOptions.map((opt, i) => (
              <View key={i} style={styles.pollOptionRow}>
                <TextInput
                  style={[styles.pollInput, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={colors.mutedForeground}
                  value={opt}
                  onChangeText={v => updatePollOption(i, v)}
                  maxLength={80}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity onPress={() => removePollOption(i)} activeOpacity={0.7}>
                    <Feather name="x" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {pollOptions.length < 4 && (
              <TouchableOpacity onPress={addPollOption} style={styles.addOptionBtn} activeOpacity={0.7}>
                <Feather name="plus" size={14} color={colors.primary} />
                <Text style={[styles.addOptionText, { color: colors.primary }]}>Add option</Text>
              </TouchableOpacity>
            )}
            <View style={styles.durationRow}>
              <Text style={[styles.durationLabel, { color: colors.mutedForeground }]}>Duration</Text>
              <View style={styles.durationOptions}>
                {(["24h", "48h", "7d"] as const).map(d => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setPollDuration(d)}
                    style={[styles.durationChip, {
                      borderColor: pollDuration === d ? colors.primary : colors.border,
                      backgroundColor: pollDuration === d ? colors.primary + "15" : colors.secondary,
                    }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.durationText, { color: pollDuration === d ? colors.primary : colors.foreground }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16 },
    composerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
    avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
    composerRight: { flex: 1, paddingTop: 4 },
    modeBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4, alignSelf: "flex-start" },
    modeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
    modeSelectorWrapper: { marginBottom: 12 },
    input: { fontSize: 16, lineHeight: 24, color: colors.foreground, fontFamily: "Inter_400Regular", minHeight: 120, marginBottom: 8 },
    charRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
    charCount: { fontSize: 13, fontFamily: "Inter_500Medium", minWidth: 28, textAlign: "right" },
    charBar: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" },
    charFill: { height: "100%", borderRadius: 2 },
    categoryBtn: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10, alignSelf: "flex-start" },
    categoryText: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_500Medium" },
    categoriesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
    categoryChip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
    categoryChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    pollToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
    pollToggleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    pollToggleText: { fontSize: 15, fontFamily: "Inter_500Medium" },
    pollSection: { gap: 8, paddingBottom: 16 },
    pollOptionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    pollInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
    addOptionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
    addOptionText: { fontSize: 14, fontFamily: "Inter_500Medium" },
    durationRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
    durationLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
    durationOptions: { flexDirection: "row", gap: 6 },
    durationChip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
    durationText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    postBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginRight: 4 },
    postBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  });
}

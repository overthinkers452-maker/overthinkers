import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApp, PostingMode, PollDuration } from "@/context/AppContext";
import { ModeSelector } from "@/components/ModeSelector";
import { useFeedback } from "@/hooks/useFeedback";
import { useSettings } from "@/context/SettingsContext";
import { modeLabel, t } from "@/utils/i18n";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { uploadThoughtMedia } from "@/lib/thoughtsService";
import { useRateLimitStore } from "@/stores/rateLimitStore";
import { capture } from "@/lib/analytics";

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
  const { success, select } = useFeedback();
  const { appLanguage } = useSettings();
  const { canPostThought, recordThought, thoughtCooldownLeft } = useRateLimitStore();

  const [content, setContent] = useState("");
  const [mode, setMode] = useState<PostingMode>("Public");
  const [category, setCategory] = useState("Philosophy");
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState<PollDuration>("24h");
  const [showCategories, setShowCategories] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const remaining = CHAR_LIMIT - content.length;
  const validPollOptions = pollOptions.filter(o => o.trim()).length;
  const canPost = content.trim().length > 0 && content.length <= CHAR_LIMIT
    && (!showPoll || validPollOptions >= 2)
    && !uploading;

  const modeColor =
    mode === "Public" ? colors.publicMode
    : mode === "Pseudonymous" ? colors.pseudonymousMode
    : colors.anonymousMode;

  const styles = makeStyles(colors);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const onPost = async () => {
    if (!canPost) return;
    if (!canPostThought()) {
      const secs = Math.ceil(thoughtCooldownLeft() / 1000);
      return;
    }
    success();

    let mediaUrl: string | undefined;
    if (mediaUri) {
      setUploading(true);
      mediaUrl = await uploadThoughtMedia(currentUser.id, mediaUri) ?? undefined;
      setUploading(false);
    }

    const pollData = showPoll && pollOptions.filter(o => o.trim()).length >= 2
      ? {
          options: pollOptions.filter(o => o.trim()).map(text => ({ text, votes: 0 })),
          duration: pollDuration,
          expiresAt: pollDuration === "manual"
            ? null
            : new Date(Date.now() + (pollDuration === "24h" ? 86400000 : pollDuration === "48h" ? 172800000 : 604800000)).toISOString(),
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
      mediaUrl,
    });

    recordThought();
    capture("thought_posted", { mode, category, hasPoll: !!pollData, hasMedia: !!mediaUrl });
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
        title: t(appLanguage, "compose.title"),
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
              {t(appLanguage, "compose.post")}
            </Text>
          </TouchableOpacity>
        ),
      }} />

      <KeyboardAwareScrollViewCompat
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
                {modeLabel(appLanguage, mode)}
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
          placeholder={t(appLanguage, "compose.placeholder")}
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
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.attachBtn, { borderColor: mediaUri ? colors.primary : colors.border, backgroundColor: mediaUri ? colors.primary + "15" : colors.secondary }]}
            activeOpacity={0.7}
          >
            <Feather name="image" size={15} color={mediaUri ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {mediaUri && (
          <View style={styles.mediaPreview}>
            <Image source={{ uri: mediaUri }} style={styles.mediaThumb} resizeMode="cover" />
            <TouchableOpacity
              onPress={() => setMediaUri(null)}
              style={[styles.removeMedia, { backgroundColor: colors.background }]}
              activeOpacity={0.8}
            >
              <Feather name="x" size={14} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        )}

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
            onValueChange={(v) => { select(); setShowPoll(v); }}
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
                {([
                  { value: "24h" as PollDuration, label: "24h" },
                  { value: "48h" as PollDuration, label: "48h" },
                  { value: "7d" as PollDuration, label: "7d" },
                  { value: "manual" as PollDuration, label: "Until I delete it" },
                ]).map(d => (
                  <TouchableOpacity
                    key={d.value}
                    onPress={() => { select(); setPollDuration(d.value); }}
                    style={[styles.durationChip, {
                      borderColor: pollDuration === d.value ? colors.primary : colors.border,
                      backgroundColor: pollDuration === d.value ? colors.primary + "15" : colors.secondary,
                    }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.durationText, { color: pollDuration === d.value ? colors.primary : colors.foreground }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
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
    attachBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    mediaPreview: { position: "relative", marginBottom: 12, alignSelf: "flex-start" },
    mediaThumb: { width: 100, height: 100, borderRadius: 10 },
    removeMedia: {
      position: "absolute", top: -6, right: -6,
      width: 20, height: 20, borderRadius: 10,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: colors.border,
    },
  });
}

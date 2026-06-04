import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { Thought, useApp } from "@/context/AppContext";
import { PollCard } from "@/components/PollCard";
import { formatCount, timeAgo, withinEditWindow } from "@/utils/format";

interface ThoughtCardProps {
  thought: Thought;
  showReason?: boolean;
}

const AVATAR_COLORS = [
  "#E8D5FF", "#D5E8FF", "#D5FFE8", "#FFE8D5", "#FFD5E8",
  "#D5F0FF", "#F0FFD5", "#FFD5F0",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ThoughtCard({ thought, showReason = true }: ThoughtCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { toggleAppreciate, toggleDisagree, toggleSave, toggleRepost, reportThought, deleteThought, currentUser } = useApp();

  const isOwnThought = thought.authorId === currentUser.id;
  const isAnon = thought.postingMode === "Anonymous";
  const isPseudo = thought.postingMode === "Pseudonymous";

  const authorDisplay =
    isAnon ? "Anonymous"
    : isPseudo ? (thought.alias || "Anonymous")
    : thought.authorName;

  const avatarBg = isAnon ? "#F0EEFF" : getAvatarColor(authorDisplay);
  const avatarText = isAnon ? "#9088CC" : "#5B5BD6";

  const modeColor =
    thought.postingMode === "Public" ? colors.publicMode
    : thought.postingMode === "Pseudonymous" ? colors.pseudonymousMode
    : colors.anonymousMode;

  const modeIcon: keyof typeof Feather.glyphMap =
    thought.postingMode === "Public" ? "globe"
    : thought.postingMode === "Pseudonymous" ? "user"
    : "lock";

  const onAppreciate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleAppreciate(thought.id);
  }, [thought.id, toggleAppreciate]);

  const onDisagree = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleDisagree(thought.id);
  }, [thought.id, toggleDisagree]);

  const onSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSave(thought.id);
  }, [thought.id, toggleSave]);

  const onRepost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleRepost(thought.id);
  }, [thought.id, toggleRepost]);

  const onPress = useCallback(() => {
    router.push({ pathname: "/thought/[id]", params: { id: thought.id } });
  }, [thought.id, router]);

  /** Section 37 + 67 — "..." contextual menu */
  const onMenuPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isOwnThought) {
      const canEdit = withinEditWindow(thought.createdAt);
      const options: { text: string; style?: "default" | "destructive" | "cancel"; onPress?: () => void }[] = [
        ...(canEdit
          ? [{ text: "Edit thought", onPress: () => router.push({ pathname: "/thought/[id]", params: { id: thought.id, edit: "1" } }) }]
          : [{ text: "Edit window closed (30 min)", style: "default" as const }]
        ),
        {
          text: "Delete thought",
          style: "destructive" as const,
          onPress: () => {
            Alert.alert("Delete thought", "This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => deleteThought(thought.id) },
            ]);
          },
        },
        { text: "Cancel", style: "cancel" as const },
      ];
      Alert.alert("Thought options", undefined, options);
    } else {
      Alert.alert(
        "Report or block",
        thought.hasReported ? "You've already reported this thought." : undefined,
        [
          {
            text: thought.hasReported ? "Already reported" : "Report this thought",
            style: thought.hasReported ? "default" : "destructive",
            onPress: () => {
              if (thought.hasReported) return;
              reportThought(thought.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert("Reported", "Thank you. Our moderation team will review this.");
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  }, [isOwnThought, thought, router, reportThought, deleteThought]);

  const styles = makeStyles(colors);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      {showReason && thought.feedReason && (
        <View style={styles.feedReasonRow}>
          <Feather name="zap" size={11} color={colors.mutedForeground} />
          <Text style={styles.feedReason}>{thought.feedReason}</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={[styles.avatarText, { color: avatarText }]}>
            {isAnon ? "?" : authorDisplay.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{authorDisplay}</Text>
          <Text style={styles.meta}>
            {thought.category} · {timeAgo(thought.createdAt)}
            {thought.isEdited && <Text style={styles.editedMark}> · edited</Text>}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.modeBadge, { backgroundColor: modeColor + "18", borderColor: modeColor + "30" }]}>
            <Feather name={modeIcon} size={11} color={modeColor} />
            <Text style={[styles.modeText, { color: modeColor }]}>{thought.postingMode}</Text>
          </View>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={onMenuPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.content}>{thought.content}</Text>

      {thought.type === "poll" && thought.poll && (
        <PollCard thought={thought} />
      )}

      <View style={styles.actions}>
        <TouchableOpacity onPress={onAppreciate} style={styles.actionBtn} activeOpacity={0.7}>
          <Feather
            name="heart"
            size={16}
            color={thought.hasAppreciated ? colors.appreciate : colors.mutedForeground}
          />
          <Text style={[styles.actionCount, thought.hasAppreciated && { color: colors.appreciate }]}>
            {formatCount(thought.appreciations)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDisagree} style={styles.actionBtn} activeOpacity={0.7}>
          <Feather
            name="minus-circle"
            size={16}
            color={thought.hasDisagreed ? colors.disagree : colors.mutedForeground}
          />
          <Text style={[styles.actionCount, thought.hasDisagreed && { color: colors.disagree }]}>
            {formatCount(thought.disagreements)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onPress} style={styles.actionBtn} activeOpacity={0.7}>
          <Feather name="message-circle" size={16} color={colors.mutedForeground} />
          <Text style={styles.actionCount}>{formatCount(thought.comments)}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onRepost} style={styles.actionBtn} activeOpacity={0.7}>
          <Feather
            name="repeat"
            size={16}
            color={thought.hasReposted ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.actionCount, thought.hasReposted && { color: colors.primary }]}>
            {formatCount(thought.reposts)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSave} style={styles.actionBtn} activeOpacity={0.7}>
          <Feather
            name="bookmark"
            size={16}
            color={thought.hasSaved ? colors.gold : colors.mutedForeground}
          />
          <Text style={[styles.actionCount, thought.hasSaved && { color: colors.gold }]}>
            {formatCount(thought.saves)}
          </Text>
        </TouchableOpacity>
      </View>

      {thought.qualityScore >= 80 && (
        <View style={styles.qualityRow}>
          <Text style={[styles.qualityText, { color: colors.gold }]}>
            Q·{thought.qualityScore.toFixed(1)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 12,
      marginVertical: 6,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    cardPressed: { opacity: 0.88 },
    feedReasonRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
    feedReason: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
    authorInfo: { flex: 1 },
    authorName: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 1 },
    meta: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    editedMark: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontStyle: "italic" },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    modeBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    modeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    menuBtn: { padding: 2 },
    content: { fontSize: 14, lineHeight: 21, color: colors.foreground, fontFamily: "Inter_400Regular", marginBottom: 12 },
    actions: { flexDirection: "row", alignItems: "center" },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, flex: 1, justifyContent: "center" },
    actionCount: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    qualityRow: { alignItems: "flex-end", marginTop: 4 },
    qualityText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  });
}

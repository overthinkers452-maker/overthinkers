import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { Thought, useApp } from "@/context/AppContext";
import { PollCard } from "@/components/PollCard";
import { formatCount, timeAgo } from "@/utils/format";

interface ThoughtCardProps {
  thought: Thought;
  showReason?: boolean;
}

export function ThoughtCard({ thought, showReason = true }: ThoughtCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { toggleAppreciate, toggleDisagree, toggleSave, toggleRepost } = useApp();

  const modeColor =
    thought.postingMode === "Public"
      ? colors.publicMode
      : thought.postingMode === "Pseudonymous"
      ? colors.pseudonymousMode
      : colors.anonymousMode;

  const modeLabel =
    thought.postingMode === "Anonymous"
      ? "anon"
      : thought.postingMode === "Pseudonymous"
      ? "pseudo"
      : "public";

  const authorDisplay =
    thought.postingMode === "Anonymous"
      ? "Anonymous"
      : thought.postingMode === "Pseudonymous"
      ? thought.alias || "Anonymous"
      : thought.authorName;

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

  const styles = makeStyles(colors);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      {showReason && thought.feedReason && (
        <Text style={styles.feedReason}>{thought.feedReason}</Text>
      )}

      <View style={styles.header}>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: modeColor + "25" }]}>
            <Text style={[styles.avatarText, { color: modeColor }]}>
              {thought.postingMode === "Anonymous" ? "?" : authorDisplay.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{authorDisplay}</Text>
            <Text style={styles.meta}>
              {timeAgo(thought.createdAt)} · {thought.category}
            </Text>
          </View>
        </View>
        <View style={[styles.modeBadge, { borderColor: modeColor + "40", backgroundColor: modeColor + "15" }]}>
          <Text style={[styles.modeText, { color: modeColor }]}>{modeLabel}</Text>
        </View>
      </View>

      <Text style={styles.content}>{thought.content}</Text>

      {thought.type === "poll" && thought.poll && (
        <PollCard thought={thought} />
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onAppreciate}
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          <Feather
            name="arrow-up"
            size={17}
            color={thought.hasAppreciated ? colors.appreciate : colors.mutedForeground}
          />
          <Text style={[styles.actionCount, thought.hasAppreciated && { color: colors.appreciate }]}>
            {formatCount(thought.appreciations)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDisagree}
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          <Feather
            name="arrow-down"
            size={17}
            color={thought.hasDisagreed ? colors.disagree : colors.mutedForeground}
          />
          <Text style={[styles.actionCount, thought.hasDisagreed && { color: colors.disagree }]}>
            {formatCount(thought.disagreements)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPress}
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={17} color={colors.mutedForeground} />
          <Text style={styles.actionCount}>{formatCount(thought.comments)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRepost}
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          <Feather
            name="repeat"
            size={17}
            color={thought.hasReposted ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.actionCount, thought.hasReposted && { color: colors.primary }]}>
            {formatCount(thought.reposts)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSave}
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          <Feather
            name={thought.hasSaved ? "bookmark" : "bookmark"}
            size={17}
            color={thought.hasSaved ? colors.gold : colors.mutedForeground}
          />
        </TouchableOpacity>

        {thought.qualityScore >= 90 && (
          <View style={styles.qualityBadge}>
            <Text style={[styles.qualityText, { color: colors.gold }]}>
              {thought.qualityScore.toFixed(0)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cardPressed: {
      opacity: 0.85,
    },
    feedReason: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginBottom: 8,
      fontFamily: "Inter_400Regular",
      letterSpacing: 0.3,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    authorRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    avatarText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    authorInfo: {
      flex: 1,
    },
    authorName: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 1,
    },
    meta: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    modeBadge: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    modeText: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    content: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      marginBottom: 12,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 6,
      minWidth: 44,
    },
    actionCount: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    qualityBadge: {
      marginLeft: "auto",
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    qualityText: {
      fontSize: 11,
      fontFamily: "Inter_700Bold",
    },
  });
}

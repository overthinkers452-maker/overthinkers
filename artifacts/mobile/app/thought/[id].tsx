import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useApp, Thought, Comment, PostingMode } from "@/context/AppContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { formatCount, timeAgo } from "@/utils/format";

export default function ThoughtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { thoughts, comments, addComment, currentUser } = useApp();
  const [replyText, setReplyText] = useState("");
  const [replyMode, setReplyMode] = useState<PostingMode>("Public");

  const thought = thoughts.find(t => t.id === id);
  const threadComments = (comments[id!] || []).filter(c => !c.parentId);
  const getReplies = (parentId: string) => (comments[id!] || []).filter(c => c.parentId === parentId);

  const styles = makeStyles(colors);

  if (!thought) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: colors.mutedForeground }}>Thought not found.</Text>
      </View>
    );
  }

  const onSubmitComment = () => {
    if (!replyText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addComment({
      thoughtId: id!,
      content: replyText.trim(),
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      postingMode: replyMode,
      alias: replyMode === "Pseudonymous" ? currentUser.displayName.split(" ")[0] : undefined,
      depth: 0,
    });
    setReplyText("");
  };

  const modeColor =
    replyMode === "Public" ? colors.publicMode
    : replyMode === "Pseudonymous" ? colors.pseudonymousMode
    : colors.anonymousMode;

  const renderComment = ({ item: comment }: { item: Comment }) => {
    const replies = getReplies(comment.id);
    const authorDisplay =
      comment.postingMode === "Anonymous" ? "Anonymous"
      : comment.postingMode === "Pseudonymous" ? comment.alias || "Anonymous"
      : comment.authorName;
    const cModeColor =
      comment.postingMode === "Public" ? colors.publicMode
      : comment.postingMode === "Pseudonymous" ? colors.pseudonymousMode
      : colors.anonymousMode;

    return (
      <View>
        <View style={[styles.comment, { marginLeft: comment.depth * 20 }]}>
          <View style={[styles.commentAvatar, { backgroundColor: cModeColor + "20" }]}>
            <Text style={[styles.commentAvatarText, { color: cModeColor }]}>
              {comment.postingMode === "Anonymous" ? "?" : authorDisplay.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentAuthor}>{authorDisplay}</Text>
              <Text style={styles.commentMeta}>{timeAgo(comment.createdAt)}</Text>
            </View>
            <Text style={styles.commentText}>{comment.content}</Text>
            <View style={styles.commentActions}>
              <TouchableOpacity style={styles.commentAction} activeOpacity={0.7}>
                <Feather name="arrow-up" size={14} color={comment.hasAppreciated ? colors.appreciate : colors.mutedForeground} />
                <Text style={styles.commentActionText}>{formatCount(comment.appreciations)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {replies.map(reply => {
          const rDisplay =
            reply.postingMode === "Anonymous" ? "Anonymous"
            : reply.postingMode === "Pseudonymous" ? reply.alias || "Anonymous"
            : reply.authorName;
          const rColor =
            reply.postingMode === "Public" ? colors.publicMode
            : reply.postingMode === "Pseudonymous" ? colors.pseudonymousMode
            : colors.anonymousMode;

          return (
            <View key={reply.id} style={[styles.comment, { marginLeft: 40, borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: 12 }]}>
              <View style={[styles.commentAvatar, { backgroundColor: rColor + "20", width: 28, height: 28, borderRadius: 14 }]}>
                <Text style={[styles.commentAvatarText, { color: rColor, fontSize: 11 }]}>
                  {reply.postingMode === "Anonymous" ? "?" : rDisplay.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{rDisplay}</Text>
                  <Text style={styles.commentMeta}>{timeAgo(reply.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{reply.content}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen options={{
        title: "Thought",
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          data={threadComments}
          keyExtractor={item => item.id}
          renderItem={renderComment}
          scrollEnabled={!!threadComments.length}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <ThoughtCard thought={thought} showReason={false} />
              <View style={styles.commentsDivider}>
                <Text style={styles.commentsLabel}>{thought.comments} comments</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyComments}>
              <Feather name="message-circle" size={28} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No comments yet. Be the first to respond.</Text>
            </View>
          }
        />

        <View style={[styles.inputBar, { borderTopColor: colors.border, paddingBottom: bottomPad + 8 }]}>
          <TouchableOpacity
            onPress={() => setReplyMode(m => m === "Public" ? "Pseudonymous" : m === "Pseudonymous" ? "Anonymous" : "Public")}
            style={[styles.modeToggle, { borderColor: modeColor + "50", backgroundColor: modeColor + "15" }]}
            activeOpacity={0.8}
          >
            <Feather
              name={replyMode === "Public" ? "globe" : replyMode === "Pseudonymous" ? "user" : "eye-off"}
              size={14}
              color={modeColor}
            />
          </TouchableOpacity>
          <TextInput
            style={[styles.replyInput, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
            placeholder="Reply thoughtfully..."
            placeholderTextColor={colors.mutedForeground}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={onSubmitComment}
            disabled={!replyText.trim()}
            style={[styles.sendBtn, { backgroundColor: replyText.trim() ? colors.primary : colors.muted }]}
            activeOpacity={0.8}
          >
            <Feather name="send" size={15} color={replyText.trim() ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    centered: { alignItems: "center", justifyContent: "center" },
    commentsDivider: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.secondary,
    },
    commentsLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    comment: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    commentAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    commentAvatarText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    commentContent: { flex: 1 },
    commentHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
    commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    commentMeta: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    commentText: { fontSize: 14, lineHeight: 20, color: colors.foreground, fontFamily: "Inter_400Regular" },
    commentActions: { flexDirection: "row", marginTop: 6, gap: 12 },
    commentAction: { flexDirection: "row", alignItems: "center", gap: 4 },
    commentActionText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyComments: { paddingTop: 48, alignItems: "center", gap: 8, paddingHorizontal: 40 },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      gap: 8,
      backgroundColor: colors.background,
    },
    modeToggle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    replyInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 9,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      maxHeight: 100,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}

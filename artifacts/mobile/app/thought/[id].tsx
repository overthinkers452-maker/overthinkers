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
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useApp, Comment, PostingMode } from "@/context/AppContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { formatCount, timeAgo, withinEditWindow } from "@/utils/format";
import { useFeedback } from "@/hooks/useFeedback";
import { useModal } from "@/context/ModalContext";
import { useSettings, AppLanguage } from "@/context/SettingsContext";
import { modeLabel } from "@/utils/i18n";

type Styles = ReturnType<typeof makeStyles>;
type Colors = ReturnType<typeof useColors>;

const MAX_VISUAL_INDENT = 5;
const MAX_RENDER_DEPTH = 50;

function commentDisplayName(comment: Comment) {
  return comment.postingMode === "Anonymous" ? "Anonymous"
    : comment.postingMode === "Pseudonymous" ? (comment.alias || comment.authorUsername || "Anonymous")
    : comment.authorName;
}

interface CommentNodeProps {
  comment: Comment;
  allComments: Comment[];
  depth: number;
  styles: Styles;
  colors: Colors;
  appLanguage: AppLanguage;
  onReply: (c: Comment) => void;
  onAppreciate: (cid: string) => void;
  onReport: (c: Comment) => void;
  onAuthor: (c: Comment) => void;
  renderDepth?: number;
  visited?: ReadonlySet<string>;
}

function CommentNode({ comment, allComments, depth, styles, colors, appLanguage, onReply, onAppreciate, onReport, onAuthor, renderDepth = 0, visited }: CommentNodeProps) {
  const seen = visited ?? new Set<string>();
  const canRecurse = renderDepth < MAX_RENDER_DEPTH && !seen.has(comment.id);
  const childVisited = canRecurse ? new Set(seen).add(comment.id) : seen;
  const replies = canRecurse
    ? allComments.filter(c => c.parentId === comment.id && !c.hasReported && !seen.has(c.id))
    : [];
  const authorDisplay = commentDisplayName(comment);
  const isAnon = comment.postingMode === "Anonymous";
  const cModeColor =
    comment.postingMode === "Public" ? colors.publicMode
    : comment.postingMode === "Pseudonymous" ? colors.pseudonymousMode
    : colors.anonymousMode;
  const indented = depth > 0;
  const avatarSize = indented ? styles.replyAvatar : null;

  return (
    <View>
      <View style={[styles.comment, indented && styles.replyComment, indented && { borderLeftColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => onAuthor(comment)}
          activeOpacity={isAnon ? 1 : 0.7}
          disabled={isAnon}
        >
          <View style={[styles.commentAvatar, avatarSize, { backgroundColor: cModeColor + "20" }]}>
            <Text style={[styles.commentAvatarText, { color: cModeColor }, indented && { fontSize: 11 }]}>
              {isAnon ? "?" : authorDisplay.charAt(0).toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <TouchableOpacity onPress={() => onAuthor(comment)} activeOpacity={isAnon ? 1 : 0.7} disabled={isAnon}>
              <Text style={[styles.commentAuthor, !isAnon && { color: colors.primary }]}>{authorDisplay}</Text>
            </TouchableOpacity>
            <Text style={styles.commentMeta}>· {modeLabel(appLanguage, comment.postingMode)} · {timeAgo(comment.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>
          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.commentAction} onPress={() => onAppreciate(comment.id)} activeOpacity={0.7}>
              <Feather name="heart" size={13} color={comment.hasAppreciated ? colors.appreciate : colors.mutedForeground} />
              <Text style={[styles.commentActionText, comment.hasAppreciated && { color: colors.appreciate }]}>
                {formatCount(comment.appreciations)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.commentAction} onPress={() => onReply(comment)} activeOpacity={0.7}>
              <Feather name="corner-down-right" size={13} color={colors.mutedForeground} />
              <Text style={styles.commentActionText}>Reply</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.commentAction} onPress={() => onReport(comment)} activeOpacity={0.7}>
              <Feather name="flag" size={13} color={colors.mutedForeground} />
              <Text style={styles.commentActionText}>Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {replies.map(reply => (
        <CommentNode
          key={reply.id}
          comment={reply}
          allComments={allComments}
          depth={Math.min(depth + 1, MAX_VISUAL_INDENT)}
          renderDepth={renderDepth + 1}
          visited={childVisited}
          styles={styles}
          colors={colors}
          appLanguage={appLanguage}
          onReply={onReply}
          onAppreciate={onAppreciate}
          onReport={onReport}
          onAuthor={onAuthor}
        />
      ))}
    </View>
  );
}

export default function ThoughtDetailScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { thoughts, comments, addComment, toggleCommentAppreciate, reportComment, editThought, currentUser, refreshComments } = useApp();
  const { tap } = useFeedback();
  const modal = useModal();
  const { appLanguage } = useSettings();

  const [replyText, setReplyText] = useState("");
  const [replyMode, setReplyMode] = useState<PostingMode>("Public");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyingToName, setReplyingToName] = useState<string | null>(null);

  // Edit mode state
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(edit === "1");

  const thought = thoughts.find(t => t.id === id);

  // Load comments from Supabase on mount
  React.useEffect(() => {
    if (id) refreshComments(id);
  }, [id]);
  const allComments = (comments[id!] || []).filter(c => !c.hasReported);
  const threadComments = allComments.filter(c => !c.parentId);

  const styles = makeStyles(colors);

  if (!thought) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Thought not found.</Text>
      </View>
    );
  }

  const isOwnThought = thought.authorId === currentUser.id;
  const canEdit = isOwnThought && withinEditWindow(thought.createdAt);

  const onSubmitComment = () => {
    if (!replyText.trim()) return;
    tap();

    const parentComment = replyingToId ? (comments[id!] || []).find(c => c.id === replyingToId) : null;
    const depth = parentComment ? parentComment.depth + 1 : 0;

    addComment({
      thoughtId: id!,
      content: replyText.trim(),
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      postingMode: replyMode,
      alias: replyMode === "Pseudonymous" ? currentUser.displayName.split("_")[0] : undefined,
      parentId: replyingToId || undefined,
      depth,
    });
    setReplyText("");
    setReplyingToId(null);
    setReplyingToName(null);
  };

  const onStartEdit = () => {
    setEditContent(thought.content);
    setIsEditing(true);
  };

  const onSaveEdit = () => {
    if (!editContent.trim() || editContent.trim() === thought.content) {
      setIsEditing(false);
      return;
    }
    const succeeded = editThought(thought.id, editContent.trim());
    if (!succeeded) {
      modal.alert({ title: "Edit window closed", message: "Thoughts can only be edited within 30 minutes of posting." });
    }
    setIsEditing(false);
  };

  const onStartReply = (comment: Comment) => {
    setReplyingToId(comment.id);
    setReplyingToName(commentDisplayName(comment));
    setReplyText("");
  };

  const onAppreciateComment = (cid: string) => {
    tap();
    toggleCommentAppreciate(id!, cid);
  };

  const onAuthor = (comment: Comment) => {
    if (comment.postingMode === "Anonymous") return;
    if (comment.authorId === currentUser.id) {
      router.push("/(tabs)/profile");
    } else {
      router.push({ pathname: "/profile/[userId]", params: { userId: comment.authorId, name: commentDisplayName(comment) } });
    }
  };

  const onReportComment = (comment: Comment) => {
    if (comment.authorId === currentUser.id) {
      modal.alert({ title: "Can't report", message: "You can't report your own comment." });
      return;
    }
    if (comment.hasReported) {
      modal.alert({ title: "Already reported", message: "Our moderation team is reviewing this comment." });
      return;
    }
    modal.report({
      title: "Report this comment",
      onSubmit: (reason, description) => {
        const res = reportComment(id!, comment.id, reason.label, description);
        modal.alert({ title: res.ok ? "Thanks for reporting" : "Couldn't report", message: res.message });
      },
    });
  };

  const modeColor =
    replyMode === "Public" ? colors.publicMode
    : replyMode === "Pseudonymous" ? colors.pseudonymousMode
    : colors.anonymousMode;

  const cycleMode = () => {
    setReplyMode(m => m === "Public" ? "Pseudonymous" : m === "Pseudonymous" ? "Anonymous" : "Public");
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <CommentNode
      comment={item}
      allComments={allComments}
      depth={0}
      styles={styles}
      colors={colors}
      appLanguage={appLanguage}
      onReply={onStartReply}
      onAppreciate={onAppreciateComment}
      onReport={onReportComment}
      onAuthor={onAuthor}
    />
  );

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen options={{
        title: "Thought",
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
        headerRight: isOwnThought && !isEditing ? () => (
          <TouchableOpacity
            onPress={canEdit ? onStartEdit : () => modal.alert({ title: "Edit window closed", message: "Thoughts can only be edited within 30 minutes of posting." })}
            style={{ marginRight: 12, padding: 4 }}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={18} color={canEdit ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        ) : isEditing ? () => (
          <TouchableOpacity onPress={onSaveEdit} style={{ marginRight: 12, padding: 4 }} activeOpacity={0.8}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 15 }}>Save</Text>
          </TouchableOpacity>
        ) : undefined,
      }} />

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {isEditing ? (
          <View style={[styles.editContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>
              Editing · {500 - editContent.length} chars remaining
            </Text>
            <TextInput
              style={[styles.editInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              autoFocus
              maxLength={500}
              textAlignVertical="top"
            />
            <TouchableOpacity
              onPress={() => setIsEditing(false)}
              style={styles.cancelEditBtn}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={threadComments}
            keyExtractor={item => item.id}
            renderItem={renderComment}
            scrollEnabled={!!threadComments.length}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View>
                <ThoughtCard thought={thought} showReason={false} />
                <View style={[styles.commentsDivider, { borderBottomColor: colors.border, backgroundColor: colors.secondary }]}>
                  <Text style={[styles.commentsLabel, { color: colors.mutedForeground }]}>
                    {thought.comments} {thought.comments === 1 ? "comment" : "comments"}
                  </Text>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Feather name="message-circle" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No comments yet. Be the first to respond.
                </Text>
              </View>
            }
          />
        )}

        {!isEditing && (
          <View style={[styles.inputBar, { borderTopColor: colors.border, paddingBottom: bottomPad + 8, backgroundColor: colors.background }]}>
            {replyingToId && (
              <View style={[styles.replyBanner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                <Feather name="corner-down-right" size={12} color={colors.primary} />
                <Text style={[styles.replyBannerText, { color: colors.primary }]}>
                  Replying to {replyingToName}
                </Text>
                <TouchableOpacity onPress={() => { setReplyingToId(null); setReplyingToName(null); }}>
                  <Feather name="x" size={13} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <TouchableOpacity
                onPress={cycleMode}
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
                placeholder={replyingToId ? `Reply to ${replyingToName}...` : "Reply thoughtfully..."}
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
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    centered: { alignItems: "center", justifyContent: "center" },
    commentsDivider: {
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1,
    },
    commentsLabel: {
      fontSize: 13, fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase", letterSpacing: 0.8,
    },
    comment: {
      flexDirection: "row", gap: 10,
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    replyComment: {
      marginLeft: 24,
      borderLeftWidth: 2,
      paddingLeft: 12,
      paddingHorizontal: 12,
    },
    commentAvatar: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    replyAvatar: { width: 26, height: 26, borderRadius: 13 },
    commentAvatarText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    commentContent: { flex: 1 },
    commentHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" },
    commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    commentMeta: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    commentText: { fontSize: 14, lineHeight: 20, color: colors.foreground, fontFamily: "Inter_400Regular" },
    commentActions: { flexDirection: "row", marginTop: 6, gap: 16 },
    commentAction: { flexDirection: "row", alignItems: "center", gap: 4 },
    commentActionText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyComments: { paddingTop: 48, alignItems: "center", gap: 8, paddingHorizontal: 40 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
    inputBar: {
      borderTopWidth: 1,
      paddingHorizontal: 12,
      paddingTop: 8,
    },
    replyBanner: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 8, borderWidth: 1, marginBottom: 6,
    },
    replyBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
    inputRow: {
      flexDirection: "row", alignItems: "flex-end", gap: 8,
    },
    modeToggle: {
      width: 36, height: 36, borderRadius: 18, borderWidth: 1,
      alignItems: "center", justifyContent: "center",
    },
    replyInput: {
      flex: 1, borderWidth: 1, borderRadius: 18,
      paddingHorizontal: 14, paddingVertical: 9,
      fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100,
    },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: "center", justifyContent: "center",
    },
    editContainer: {
      flex: 1, padding: 16, gap: 10,
    },
    editLabel: {
      fontSize: 12, fontFamily: "Inter_500Medium",
      textTransform: "uppercase", letterSpacing: 0.8,
    },
    editInput: {
      flex: 1, borderWidth: 1, borderRadius: 12,
      padding: 14, fontSize: 15, lineHeight: 22,
      fontFamily: "Inter_400Regular",
    },
    cancelEditBtn: {
      alignItems: "center", paddingVertical: 10,
    },
  });
}

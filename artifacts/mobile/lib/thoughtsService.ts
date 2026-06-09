import { supabase } from "./supabase";
import { Thought, Comment, Poll } from "@/context/AppContext";
import { calculateQualityScore } from "@/utils/format";
import * as push from "@/lib/pushNotifications";

// Wrap any Supabase thenable so native .catch() works
async function rpc(name: string, params?: Record<string, unknown>) {
  return supabase.rpc(name, params as any);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapDbThought(row: any, userId?: string, userInteractions?: {
  appreciated: Set<string>;
  disagreed: Set<string>;
  saved: Set<string>;
  reposted: Set<string>;
  reported: Set<string>;
  pollVotes: Record<string, number>;
}): Thought {
  const poll: Poll | undefined = row.poll_data
    ? {
        options: row.poll_data.options,
        duration: row.poll_data.duration,
        expiresAt: row.poll_data.expiresAt,
        totalVotes: row.poll_data.options.reduce((s: number, o: any) => s + (o.votes || 0), 0),
        userVote: userId && userInteractions?.pollVotes[row.id] !== undefined
          ? userInteractions.pollVotes[row.id]
          : undefined,
      }
    : undefined;

  return {
    id: row.id,
    content: row.content,
    authorId: row.author_id,
    authorName: row.profiles?.display_name ?? "Unknown",
    authorUsername: row.profiles?.username ?? "",
    postingMode: row.posting_mode,
    alias: row.alias ?? undefined,
    category: row.category,
    appreciations: row.appreciations,
    disagreements: row.disagreements,
    reposts: row.reposts,
    saves: row.saves,
    comments: row.comments,
    reportCount: row.report_count,
    qualityScore: row.quality_score,
    createdAt: row.created_at,
    isEdited: row.is_edited,
    editedAt: row.edited_at ?? undefined,
    hasAppreciated: userInteractions?.appreciated.has(row.id) ?? false,
    hasDisagreed: userInteractions?.disagreed.has(row.id) ?? false,
    hasSaved: userInteractions?.saved.has(row.id) ?? false,
    hasReposted: userInteractions?.reposted.has(row.id) ?? false,
    hasReported: userInteractions?.reported.has(row.id) ?? false,
    type: row.type,
    poll,
    feedReason: row.feed_reason ?? undefined,
    isRepost: row.is_repost,
    originalAuthorId: row.original_author_id ?? undefined,
    originalAuthorName: row.original_author?.display_name ?? undefined,
    originalPostingMode: row.original_author_id ? row.posting_mode : undefined,
    authorHideAppreciations: row.profiles?.hide_appreciations ?? false,
    authorHideReposts: row.profiles?.hide_reposts ?? false,
    authorStrikeCount: row.profiles?.strike_count ?? 0,
  };
}

function mapDbComment(row: any, userId?: string, appreciatedSet?: Set<string>, reportedSet?: Set<string>): Comment {
  return {
    id: row.id,
    thoughtId: row.thought_id,
    content: row.content,
    authorId: row.author_id,
    authorName: row.profiles?.display_name ?? "Unknown",
    authorUsername: row.profiles?.username ?? "",
    postingMode: row.posting_mode,
    alias: row.alias ?? undefined,
    appreciations: row.appreciations,
    createdAt: row.created_at,
    parentId: row.parent_id ?? undefined,
    depth: row.depth,
    hasAppreciated: appreciatedSet?.has(row.id) ?? false,
    reportCount: row.report_count,
    hasReported: reportedSet?.has(row.id) ?? false,
  };
}

// ─── Fetch user interaction sets for a batch of thought IDs ──────────────────

export async function fetchUserInteractions(userId: string, thoughtIds: string[]) {
  if (!thoughtIds.length) {
    return {
      appreciated: new Set<string>(),
      disagreed: new Set<string>(),
      saved: new Set<string>(),
      reposted: new Set<string>(),
      reported: new Set<string>(),
      pollVotes: {} as Record<string, number>,
    };
  }

  const [appr, disagr, saves, repos, reports, votes] = await Promise.all([
    supabase.from("appreciations").select("thought_id").eq("user_id", userId).in("thought_id", thoughtIds),
    supabase.from("disagreements").select("thought_id").eq("user_id", userId).in("thought_id", thoughtIds),
    supabase.from("saves").select("thought_id").eq("user_id", userId).in("thought_id", thoughtIds),
    supabase.from("reposts").select("thought_id").eq("user_id", userId).in("thought_id", thoughtIds),
    supabase.from("reports").select("thought_id").eq("reporter_id", userId).in("thought_id", thoughtIds),
    supabase.from("poll_votes").select("thought_id, option_index").eq("user_id", userId).in("thought_id", thoughtIds),
  ]);

  return {
    appreciated: new Set<string>((appr.data ?? []).map((r: any) => r.thought_id)),
    disagreed: new Set<string>((disagr.data ?? []).map((r: any) => r.thought_id)),
    saved: new Set<string>((saves.data ?? []).map((r: any) => r.thought_id)),
    reposted: new Set<string>((repos.data ?? []).map((r: any) => r.thought_id)),
    reported: new Set<string>((reports.data ?? []).filter((r: any) => r.thought_id).map((r: any) => r.thought_id)),
    pollVotes: Object.fromEntries((votes.data ?? []).map((r: any) => [r.thought_id, r.option_index])),
  };
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export async function fetchFeed(opts: {
  userId?: string;
  feedType: "For You" | "Trending" | "Latest" | "Following";
  category?: string | null;
  followingIds?: string[];
  excludeIds?: string[];
  limit?: number;
  offset?: number;
}) {
  const { userId, feedType, category, followingIds = [], excludeIds = [], limit = 30, offset = 0 } = opts;

  let query = supabase
    .from("thoughts")
    .select("*, profiles!thoughts_author_id_fkey(display_name, username, hide_appreciations, hide_reposts)")
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);

  if (excludeIds.length > 0) {
    query = query.not("author_id", "in", `("${excludeIds.join('","')}")`);
  }

  switch (feedType) {
    case "Trending":
      query = query.order("appreciations", { ascending: false });
      break;
    case "Latest":
      query = query.order("created_at", { ascending: false });
      break;
    case "Following":
      if (followingIds.length > 0) {
        query = query.in("author_id", followingIds).order("created_at", { ascending: false });
      } else {
        return [];
      }
      break;
    default:
      query = query.order("quality_score", { ascending: false });
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const ids = data.map((r: any) => r.id);
  const interactions = userId ? await fetchUserInteractions(userId, ids) : undefined;

  return data.map((row: any) => mapDbThought(row, userId, interactions));
}

// ─── Create Thought ───────────────────────────────────────────────────────────

export async function createThought(params: {
  authorId: string;
  content: string;
  category: string;
  postingMode: "Public" | "Pseudonymous" | "Anonymous";
  alias?: string;
  type: "standard" | "poll";
  pollData?: Poll;
  isNightThought?: boolean;
}) {
  const { data, error } = await supabase.from("thoughts").insert({
    author_id: params.authorId,
    content: params.content,
    category: params.category,
    posting_mode: params.postingMode,
    alias: params.alias ?? null,
    type: params.type,
    poll_data: params.pollData ? {
      options: params.pollData.options,
      duration: params.pollData.duration,
      expiresAt: params.pollData.expiresAt,
    } : null,
    is_night_thought: params.isNightThought ?? false,
    quality_score: 0,
  }).select("*, profiles!thoughts_author_id_fkey(display_name, username, hide_appreciations, hide_reposts)").single();

  if (error) { console.error("CREATE THOUGHT ERROR", error); throw error; }

  await rpc("increment_profile_thoughts", { profile_id: params.authorId }).catch(() => {});

  indexThoughtHashtags(data.id, params.content).catch(() => {});
  const authorDisplayName = (data as any).profiles?.display_name as string | undefined;
  notifyMentions(params.content, params.authorId, data.id, authorDisplayName).catch(() => {});

  return mapDbThought(data, params.authorId);
}

// ─── Edit Thought ─────────────────────────────────────────────────────────────

export async function editThought(thoughtId: string, content: string, authorId: string) {
  const { data: existing } = await supabase.from("thoughts").select("created_at").eq("id", thoughtId).single();
  if (!existing) return { ok: false, message: "Thought not found." };

  const elapsed = Date.now() - new Date(existing.created_at).getTime();
  if (elapsed > 30 * 60000) return { ok: false, message: "You can only edit within 30 minutes of posting." };

  const { error } = await supabase.from("thoughts")
    .update({ content, is_edited: true, edited_at: new Date().toISOString() })
    .eq("id", thoughtId)
    .eq("author_id", authorId);

  return error ? { ok: false, message: error.message } : { ok: true, message: "" };
}

// ─── Delete Thought ───────────────────────────────────────────────────────────

export async function deleteThought(thoughtId: string, authorId: string) {
  const { error } = await supabase.from("thoughts")
    .delete()
    .eq("id", thoughtId)
    .eq("author_id", authorId);
  if (error) throw error;
  await rpc("decrement_profile_thoughts", { profile_id: authorId }).catch(() => {});
}

// ─── Toggle Appreciation ──────────────────────────────────────────────────────

export async function toggleAppreciation(
  thoughtId: string,
  userId: string,
  currentlyAppreciated: boolean,
  thoughtAuthorId?: string,
  senderDisplayName?: string,
  thoughtContent?: string,
) {
  if (currentlyAppreciated) {
    await supabase.from("appreciations").delete().eq("thought_id", thoughtId).eq("user_id", userId);
    await rpc("decrement_thought_appreciations", { thought_id: thoughtId }).catch(() => {});
  } else {
    await supabase.from("appreciations").insert({ thought_id: thoughtId, user_id: userId });
    await rpc("increment_thought_appreciations", { thought_id: thoughtId }).catch(() => {});
    if (thoughtAuthorId && thoughtAuthorId !== userId) {
      supabase.from("notifications").insert({
        user_id: thoughtAuthorId,
        type: "appreciation",
        actor_id: userId,
        thought_id: thoughtId,
      }).then(undefined, () => {});
      push.sendAppreciationNotification({
        recipientId: thoughtAuthorId,
        senderName: senderDisplayName ?? "Someone",
        thoughtContent: thoughtContent ?? "",
        thoughtId,
      }).catch(() => {});
    }
  }
}

// ─── Toggle Disagreement ──────────────────────────────────────────────────────

export async function toggleDisagreement(thoughtId: string, userId: string, currentlyDisagreed: boolean) {
  if (currentlyDisagreed) {
    await supabase.from("disagreements").delete().eq("thought_id", thoughtId).eq("user_id", userId);
    await rpc("decrement_thought_disagreements", { thought_id: thoughtId }).catch(() => {});
  } else {
    await supabase.from("disagreements").insert({ thought_id: thoughtId, user_id: userId });
    await rpc("increment_thought_disagreements", { thought_id: thoughtId }).catch(() => {});
  }
}

// ─── Toggle Save ──────────────────────────────────────────────────────────────

export async function toggleSave(thoughtId: string, userId: string, currentlySaved: boolean) {
  if (currentlySaved) {
    await supabase.from("saves").delete().eq("thought_id", thoughtId).eq("user_id", userId);
    await rpc("decrement_thought_saves", { thought_id: thoughtId }).catch(() => {});
  } else {
    await supabase.from("saves").insert({ thought_id: thoughtId, user_id: userId });
    await rpc("increment_thought_saves", { thought_id: thoughtId }).catch(() => {});
  }
}

// ─── Toggle Repost ────────────────────────────────────────────────────────────

export async function toggleRepost(thought: Thought, userId: string, userDisplayName: string, userUsername: string) {
  if (thought.hasReposted) {
    await supabase.from("reposts").delete().eq("thought_id", thought.id).eq("user_id", userId);
    await supabase.from("thoughts").delete().eq("original_thought_id", thought.id).eq("author_id", userId).eq("is_repost", true);
    await rpc("decrement_thought_reposts", { thought_id: thought.id }).catch(() => {});
  } else {
    await supabase.from("reposts").insert({ thought_id: thought.id, user_id: userId });
    await supabase.from("thoughts").insert({
      author_id: userId,
      content: thought.content,
      category: thought.category,
      posting_mode: "Public",
      type: thought.type,
      poll_data: null,
      is_repost: true,
      original_thought_id: thought.id,
      original_author_id: thought.authorId,
      quality_score: 0,
      feed_reason: `Reshared from ${thought.postingMode === "Anonymous" ? "Anonymous" : (thought.alias || thought.authorName)}`,
    });
    await rpc("increment_thought_reposts", { thought_id: thought.id }).catch(() => {});
    if (thought.authorId !== userId && thought.postingMode !== "Anonymous") {
      push.sendRepostNotification({
        recipientId: thought.authorId,
        senderName: userDisplayName,
        thoughtContent: thought.content,
        thoughtId: thought.id,
      }).catch(() => {});
      supabase.from("notifications").insert({
        user_id: thought.authorId,
        type: "repost",
        actor_id: userId,
        thought_id: thought.id,
      }).then(undefined, () => {});
    }
  }
}

// ─── Vote on Poll ─────────────────────────────────────────────────────────────

export async function votePoll(thoughtId: string, userId: string, optionIndex: number, pollData: Poll) {
  await supabase.from("poll_votes").insert({ thought_id: thoughtId, user_id: userId, option_index: optionIndex });
  const updatedOptions = pollData.options.map((o, i) =>
    i === optionIndex ? { ...o, votes: o.votes + 1 } : o
  );
  await supabase.from("thoughts").update({
    poll_data: { ...pollData, options: updatedOptions },
  }).eq("id", thoughtId);
}

// ─── Report ───────────────────────────────────────────────────────────────────

export async function reportThought(thoughtId: string, reporterId: string, reason: string, description?: string) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    thought_id: thoughtId,
    reason,
    description: description ?? null,
  });
  if (!error) {
    await rpc("increment_thought_reports", { thought_id: thoughtId }).catch(() => {});
  }
  return { ok: !error, message: error?.message ?? "Thanks — our moderation team will review this." };
}

export async function reportComment(commentId: string, reporterId: string, reason: string, description?: string) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    comment_id: commentId,
    reason,
    description: description ?? null,
  });
  return { ok: !error, message: error?.message ?? "Thanks — our moderation team will review this." };
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function fetchComments(thoughtId: string, userId?: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles!comments_author_id_fkey(display_name, username)")
    .eq("thought_id", thoughtId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const commentIds = data.map((r: any) => r.id);
  let appreciatedSet = new Set<string>();
  let reportedSet = new Set<string>();

  if (userId && commentIds.length > 0) {
    const [appr, reps] = await Promise.all([
      supabase.from("comment_appreciations").select("comment_id").eq("user_id", userId).in("comment_id", commentIds),
      supabase.from("reports").select("comment_id").eq("reporter_id", userId).in("comment_id", commentIds),
    ]);
    appreciatedSet = new Set<string>((appr.data ?? []).map((r: any) => r.comment_id));
    reportedSet = new Set<string>((reps.data ?? []).filter((r: any) => r.comment_id).map((r: any) => r.comment_id));
  }

  return data.map((row: any) => mapDbComment(row, userId, appreciatedSet, reportedSet));
}

export async function createComment(params: {
  thoughtId: string;
  authorId: string;
  content: string;
  postingMode: "Public" | "Pseudonymous" | "Anonymous";
  alias?: string;
  parentId?: string;
  depth?: number;
  thoughtAuthorId?: string;
  senderDisplayName?: string;
  thoughtContent?: string;
}) {
  const { data, error } = await supabase.from("comments").insert({
    thought_id: params.thoughtId,
    author_id: params.authorId,
    content: params.content,
    posting_mode: params.postingMode,
    alias: params.alias ?? null,
    parent_id: params.parentId ?? null,
    depth: params.depth ?? 0,
  }).select("*, profiles!comments_author_id_fkey(display_name, username)").single();

  if (error) { console.error("CREATE COMMENT ERROR", error); throw error; }

  await rpc("increment_thought_comments", { thought_id: params.thoughtId }).catch(() => {});

  // Notify the thought author (if not self-comment)
  if (params.thoughtAuthorId && params.thoughtAuthorId !== params.authorId) {
    supabase.from("notifications").insert({
      user_id: params.thoughtAuthorId,
      type: params.parentId ? "reply" : "comment",
      actor_id: params.authorId,
      thought_id: params.thoughtId,
    }).then(undefined, () => {});

    const displayName = params.postingMode === "Anonymous"
      ? "Someone"
      : params.postingMode === "Pseudonymous"
      ? (params.alias || params.senderDisplayName || "Someone")
      : (params.senderDisplayName ?? "Someone");

    const sender = params.parentId
      ? push.sendReplyNotification
      : push.sendCommentNotification;
    sender({
      recipientId: params.thoughtAuthorId,
      senderName: displayName,
      [params.parentId ? "replyContent" : "commentContent"]: params.content,
      thoughtId: params.thoughtId,
    } as any).catch(() => {});
  }

  const mentionName = params.postingMode === "Anonymous"
    ? undefined
    : params.postingMode === "Pseudonymous"
    ? (params.alias || params.senderDisplayName)
    : params.senderDisplayName;
  notifyMentions(params.content, params.authorId, params.thoughtId, mentionName).catch(() => {});

  return mapDbComment(data);
}

export async function toggleCommentAppreciation(commentId: string, userId: string, currentlyAppreciated: boolean) {
  if (currentlyAppreciated) {
    await supabase.from("comment_appreciations").delete().eq("comment_id", commentId).eq("user_id", userId);
    await rpc("decrement_comment_appreciations", { comment_id: commentId }).catch(() => {});
  } else {
    await supabase.from("comment_appreciations").insert({ comment_id: commentId, user_id: userId });
    await rpc("increment_comment_appreciations", { comment_id: commentId }).catch(() => {});
  }
}

// ─── Saved bookmarks ─────────────────────────────────────────────────────────

export async function fetchSavedThoughts(userId: string): Promise<Thought[]> {
  const { data: saveRows } = await supabase
    .from("saves")
    .select("thought_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!saveRows || saveRows.length === 0) return [];
  const ids = saveRows.map((r: any) => r.thought_id);

  const { data } = await supabase
    .from("thoughts")
    .select("*, profiles!thoughts_author_id_fkey(display_name, username, hide_appreciations, hide_reposts)")
    .in("id", ids);

  if (!data) return [];
  const interactions = await fetchUserInteractions(userId, ids);
  return data.map((row: any) => mapDbThought(row, userId, interactions));
}

// ─── Follow system ────────────────────────────────────────────────────────────

export async function fetchFollowingIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  return (data ?? []).map((r: any) => r.following_id);
}

export async function toggleFollow(
  followerId: string,
  followingId: string,
  isFollowing: boolean,
  senderDisplayName?: string,
) {
  if (isFollowing) {
    await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
    await rpc("decrement_follow_counts", { follower_id: followerId, following_id: followingId }).catch(() => {});
  } else {
    await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
    await rpc("increment_follow_counts", { follower_id: followerId, following_id: followingId }).catch(() => {});
    push.sendFollowNotification({
      recipientId: followingId,
      senderName: senderDisplayName ?? "Someone",
      senderId: followerId,
    }).catch(() => {});
    supabase.from("notifications").insert({
      user_id: followingId,
      type: "follow",
      actor_id: followerId,
    }).then(undefined, () => {});
  }
}

// ─── Block system ─────────────────────────────────────────────────────────────

export async function fetchBlockedIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId);
  return (data ?? []).map((r: any) => r.blocked_id);
}

export async function fetchBlockedUsers(userId: string): Promise<{ id: string; name: string; username: string }[]> {
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id, profiles!blocks_blocked_id_fkey(display_name, username)")
    .eq("blocker_id", userId);
  return (data ?? []).map((r: any) => ({
    id: r.blocked_id,
    name: r.profiles?.display_name ?? r.profiles?.username ?? r.blocked_id,
    username: r.profiles?.username ?? "",
  }));
}

export async function blockUser(blockerId: string, blockedId: string) {
  await supabase.from("blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await supabase.from("blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function fetchNotifications(userId: string) {
  const { data } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(display_name, username), thought:thoughts(content)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    type: row.type,
    actorName: row.actor?.display_name ?? "Someone",
    actorId: row.actor_id ?? undefined,
    thoughtId: row.thought_id ?? undefined,
    thoughtContent: row.thought?.content ?? undefined,
    message: row.message ?? undefined,
    createdAt: row.created_at,
    read: row.read,
  }));
}

export async function markAllNotificationsRead(userId: string) {
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchThoughts(query: string, userId?: string, category?: string | null): Promise<Thought[]> {
  let q = supabase
    .from("thoughts")
    .select("*, profiles!thoughts_author_id_fkey(display_name, username, hide_appreciations, hide_reposts)")
    .textSearch("content", query, { type: "websearch" })
    .limit(30);

  if (category) q = q.eq("category", category);

  const { data } = await q;
  if (!data) return [];
  const ids = data.map((r: any) => r.id);
  const interactions = userId ? await fetchUserInteractions(userId, ids) : undefined;
  return data.map((row: any) => mapDbThought(row, userId, interactions));
}

export async function searchProfiles(query: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, followers_count, thoughts_count")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);
  return data ?? [];
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function fetchProfileById(userId: string, viewerUserId?: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!data) return null;

  if (data.is_private && viewerUserId !== userId) {
    // No viewer ID (unauthenticated/unresolved) → treat as non-follower
    if (!viewerUserId) return { ...data, _isPrivateAndHidden: true };
    const { data: follow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", viewerUserId)
      .eq("following_id", userId)
      .maybeSingle();
    return { ...data, _isPrivateAndHidden: !follow };
  }

  return { ...data, _isPrivateAndHidden: false };
}

export async function fetchProfileThoughts(userId: string, viewerUserId?: string): Promise<Thought[]> {
  // Treat missing viewer as non-follower — private accounts return empty for unauthenticated viewers
  const isOwnProfile = viewerUserId && viewerUserId === userId;
  if (!isOwnProfile) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("is_private")
      .eq("id", userId)
      .single();
    if (prof?.is_private) {
      if (!viewerUserId) return [];
      const { data: follow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", viewerUserId)
        .eq("following_id", userId)
        .maybeSingle();
      if (!follow) return [];
    }
  }

  const { data } = await supabase
    .from("thoughts")
    .select("*, profiles!thoughts_author_id_fkey(display_name, username, hide_appreciations, hide_reposts)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (!data) return [];
  const ids = data.map((r: any) => r.id);
  const interactions = viewerUserId ? await fetchUserInteractions(viewerUserId, ids) : undefined;
  return data.map((row: any) => mapDbThought(row, viewerUserId, interactions));
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  authorId: string;
  name: string;
  username: string;
  appreciated: number;
  badge: string;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, badge, reputation")
    .order("reputation", { ascending: false })
    .limit(50);

  if (!data) return [];
  return data.map((row: any, i: number) => ({
    authorId: row.id,
    name: row.display_name ?? row.username ?? "Unknown",
    username: row.username ?? "",
    appreciated: row.reputation ?? 0,
    badge: row.badge ?? (
      (row.reputation ?? 0) >= 2000 ? "Elder" :
      (row.reputation ?? 0) >= 1000 ? "Insightful" :
      (row.reputation ?? 0) >= 300 ? "Thoughtful" : "Newcomer"
    ),
  }));
}

// ─── Night thoughts ───────────────────────────────────────────────────────────

export async function fetchNightThoughts(userId?: string, excludeIds: string[] = []): Promise<Thought[]> {
  let query = supabase
    .from("thoughts")
    .select("*, profiles!thoughts_author_id_fkey(display_name, username, hide_appreciations, hide_reposts)")
    .eq("is_night_thought", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (excludeIds.length > 0) {
    query = query.not("author_id", "in", `("${excludeIds.join('","')}")`);
  }

  const { data } = await query;
  if (!data) return [];
  const ids = data.map((r: any) => r.id);
  const interactions = userId ? await fetchUserInteractions(userId, ids) : undefined;
  return data.map((row: any) => mapDbThought(row, userId, interactions));
}

// ─── Mutes ────────────────────────────────────────────────────────────────────

export async function fetchMutedIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("mutes")
    .select("muted_id")
    .eq("muter_id", userId);
  return (data ?? []).map((r: any) => r.muted_id);
}

export async function fetchMutedUsers(userId: string): Promise<{ id: string; name: string; username: string }[]> {
  const { data } = await supabase
    .from("mutes")
    .select("muted_id, profiles!mutes_muted_id_fkey(display_name, username)")
    .eq("muter_id", userId);
  return (data ?? []).map((r: any) => ({
    id: r.muted_id,
    name: r.profiles?.display_name ?? r.profiles?.username ?? r.muted_id,
    username: r.profiles?.username ?? "",
  }));
}

export async function muteUser(muterId: string, mutedId: string): Promise<void> {
  await supabase.from("mutes").insert({ muter_id: muterId, muted_id: mutedId });
}

export async function unmuteUser(muterId: string, mutedId: string): Promise<void> {
  await supabase.from("mutes").delete().eq("muter_id", muterId).eq("muted_id", mutedId);
}

// ─── Security Logging ─────────────────────────────────────────────────────────

export type SecurityEventType = "login_success" | "login_fail" | "password_change" | "signout" | "signup";

export async function logSecurityEvent(
  userId: string,
  eventType: SecurityEventType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await supabase.from("security_logs").insert({
    user_id: userId,
    event_type: eventType,
    metadata: metadata ?? null,
  });
}

// ─── Mentions ─────────────────────────────────────────────────────────────────

const MENTION_RE = /@([a-zA-Z0-9_]{3,20})(?=[^a-zA-Z0-9_]|$)/g;

function extractMentions(content: string): string[] {
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(content)) !== null) names.push(m[1].toLowerCase());
  MENTION_RE.lastIndex = 0;
  return [...new Set(names)];
}

export async function notifyMentions(
  content: string,
  authorId: string,
  thoughtId: string,
  authorName?: string,
): Promise<void> {
  const usernames = extractMentions(content).slice(0, 5);
  if (usernames.length === 0) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .in("username", usernames);

  const recipientIds = (profiles ?? [])
    .map((p: any) => p.id as string)
    .filter(id => id !== authorId);

  if (recipientIds.length === 0) return;

  const rows = recipientIds.map(uid => ({
    user_id: uid,
    type: "mention" as const,
    actor_id: authorId,
    thought_id: thoughtId,
  }));

  await supabase.from("notifications").insert(rows).then(undefined, () => {});

  // Fire push notifications for each mentioned user
  if (authorName) {
    for (const recipientId of recipientIds) {
      push.sendMentionNotification({
        recipientId,
        senderName: authorName,
        thoughtContent: content,
        thoughtId,
      }).catch(() => {});
    }
  }
}

// ─── Hashtags ─────────────────────────────────────────────────────────────────

const HASHTAG_RE = /#([a-zA-Z0-9_]{2,30})(?=[^a-zA-Z0-9_]|$)/g;

export function extractHashtags(content: string): string[] {
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = HASHTAG_RE.exec(content)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  HASHTAG_RE.lastIndex = 0;
  return [...new Set(tags)];
}

export async function indexThoughtHashtags(thoughtId: string, content: string): Promise<void> {
  const tags = extractHashtags(content);
  if (tags.length === 0) return;

  for (const tag of tags) {
    const hashtagId = await rpc("upsert_hashtag_and_increment", { p_tag: tag }).then(
      (res: any) => res.data as string,
      () => null,
    );
    if (!hashtagId) continue;
    await supabase
      .from("thought_hashtags")
      .insert({ thought_id: thoughtId, hashtag_id: hashtagId })
      .then(undefined, () => {});
  }
}

export async function searchHashtags(query: string): Promise<{ id: string; tag: string; usage_count: number }[]> {
  const { data } = await supabase
    .from("hashtags")
    .select("id, tag, usage_count")
    .ilike("tag", `${query.replace(/^#/, "").toLowerCase()}%`)
    .order("usage_count", { ascending: false })
    .limit(20);
  return data ?? [];
}

// ─── Admin / Moderation ───────────────────────────────────────────────────────

export interface ReportGroup {
  targetId: string;
  targetType: "thought" | "comment";
  reportCount: number;
  latestReason: string;
  latestAt: string;
  authorId?: string;
  contentSnippet?: string;
}

export async function fetchReportQueue(): Promise<ReportGroup[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("thought_id, comment_id, reason, created_at, thoughts(author_id, content), comments(author_id, content)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  const groups: Map<string, ReportGroup> = new Map();
  for (const r of data as any[]) {
    const isThought = !!r.thought_id;
    const targetId: string = r.thought_id ?? r.comment_id;
    const targetType: "thought" | "comment" = isThought ? "thought" : "comment";
    const key = `${targetType}:${targetId}`;
    if (!groups.has(key)) {
      const source = isThought ? r.thoughts : r.comments;
      groups.set(key, {
        targetId,
        targetType,
        reportCount: 1,
        latestReason: r.reason,
        latestAt: r.created_at,
        authorId: source?.author_id,
        contentSnippet: source?.content?.slice(0, 120),
      });
    } else {
      const g = groups.get(key)!;
      g.reportCount += 1;
      if (r.created_at > g.latestAt) {
        g.latestAt = r.created_at;
        g.latestReason = r.reason;
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.reportCount - a.reportCount);
}

export async function dismissReports(targetType: "thought" | "comment", targetId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_dismiss_reports" as any, {
    p_target_type: targetType,
    p_target_id: targetId,
  });
  if (error) throw new Error(error.message);
}

export async function removeContent(targetType: "thought" | "comment", targetId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_remove_content" as any, {
    p_target_type: targetType,
    p_target_id: targetId,
  });
  if (error) throw new Error(error.message);
}

export async function warnUser(userId: string, reason: string): Promise<void> {
  // issue_user_strike (security-definer) inserts the user_strike, moderation_action
  // log, increments strike_count, and delivers the badge notification atomically.
  const { error } = await supabase.rpc("issue_user_strike" as any, {
    p_user_id: userId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

export async function fetchHashtagFeed(
  tag: string,
  userId: string | undefined,
  limit = 20,
  offset = 0,
): Promise<Thought[]> {
  const normalizedTag = tag.replace(/^#/, "").toLowerCase();

  const { data: hashtagRow } = await supabase
    .from("hashtags")
    .select("id")
    .eq("tag", normalizedTag)
    .single();

  if (!hashtagRow) return [];

  const { data: joins } = await supabase
    .from("thought_hashtags")
    .select("thought_id")
    .eq("hashtag_id", hashtagRow.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!joins || joins.length === 0) return [];

  const thoughtIds = joins.map((r: any) => r.thought_id as string);

  const { data } = await supabase
    .from("thoughts")
    .select("*, profiles!thoughts_author_id_fkey(display_name, username, hide_appreciations, hide_reposts)")
    .in("id", thoughtIds)
    .order("created_at", { ascending: false });

  if (!data) return [];
  const interactions = userId ? await fetchUserInteractions(userId, thoughtIds) : undefined;
  return data.map((row: any) => mapDbThought(row, userId, interactions));
}

// ─── Trending Mentions ─────────────────────────────────────────────────────────

export interface TrendingMention {
  userId: string;
  displayName: string;
  username: string;
  followersCount: number;
  mentionCount: number;
}

export async function fetchTrendingMentions(limit = 5): Promise<TrendingMention[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("notifications")
    .select("user_id, profiles!notifications_user_id_fkey(display_name, username, followers_count)")
    .eq("type", "mention")
    .gte("created_at", since);

  if (!data || data.length === 0) return [];

  // Aggregate mention counts per user in JS
  const counts = new Map<string, { profile: any; count: number }>();
  for (const row of data as any[]) {
    if (!row.user_id || !row.profiles) continue;
    const existing = counts.get(row.user_id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(row.user_id, { profile: row.profiles, count: 1 });
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([userId, { profile, count }]) => ({
      userId,
      displayName: profile.display_name ?? "Unknown",
      username: profile.username ?? "",
      followersCount: profile.followers_count ?? 0,
      mentionCount: count,
    }));
}

// ─── Storage: Profile Images ───────────────────────────────────────────────────

export async function uploadProfileImage(
  userId: string,
  uri: string,
  kind: "avatar" | "banner",
): Promise<string> {
  const path = `${userId}/${kind}-${Date.now()}.jpg`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

import { supabase } from "./supabase";
import { Thought, Comment, Poll } from "@/context/AppContext";
import { calculateQualityScore } from "@/utils/format";

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
  limit?: number;
  offset?: number;
}) {
  const { userId, feedType, category, followingIds = [], limit = 30, offset = 0 } = opts;

  let query = supabase
    .from("thoughts")
    .select("*, profiles!thoughts_author_id_fkey(display_name, username)")
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);

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
  }).select("*, profiles!thoughts_author_id_fkey(display_name, username)").single();

  if (error) throw error;

  await rpc("increment_profile_thoughts", { profile_id: params.authorId }).catch(() => {});

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

export async function toggleAppreciation(thoughtId: string, userId: string, currentlyAppreciated: boolean, thoughtAuthorId?: string) {
  if (currentlyAppreciated) {
    await supabase.from("appreciations").delete().eq("thought_id", thoughtId).eq("user_id", userId);
    await rpc("decrement_thought_appreciations", { thought_id: thoughtId }).catch(() => {});
  } else {
    await supabase.from("appreciations").insert({ thought_id: thoughtId, user_id: userId });
    await rpc("increment_thought_appreciations", { thought_id: thoughtId }).catch(() => {});
    // Notify the thought author (if not self-appreciation)
    if (thoughtAuthorId && thoughtAuthorId !== userId) {
      supabase.from("notifications").insert({
        user_id: thoughtAuthorId,
        type: "appreciation",
        actor_id: userId,
        thought_id: thoughtId,
      }).then(undefined, () => {});
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

  if (error) throw error;

  await rpc("increment_thought_comments", { thought_id: params.thoughtId }).catch(() => {});

  // Notify the thought author (if not self-comment)
  if (params.thoughtAuthorId && params.thoughtAuthorId !== params.authorId) {
    supabase.from("notifications").insert({
      user_id: params.thoughtAuthorId,
      type: "comment",
      actor_id: params.authorId,
      thought_id: params.thoughtId,
    }).then(undefined, () => {});
  }

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
    .select("*, profiles!thoughts_author_id_fkey(display_name, username)")
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

export async function toggleFollow(followerId: string, followingId: string, isFollowing: boolean) {
  if (isFollowing) {
    await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
    await rpc("decrement_follow_counts", { follower_id: followerId, following_id: followingId }).catch(() => {});
  } else {
    await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
    await rpc("increment_follow_counts", { follower_id: followerId, following_id: followingId }).catch(() => {});
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
    createdAt: row.created_at,
    read: row.read,
  }));
}

export async function markAllNotificationsRead(userId: string) {
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchThoughts(query: string, userId?: string): Promise<Thought[]> {
  const { data } = await supabase
    .from("thoughts")
    .select("*, profiles!thoughts_author_id_fkey(display_name, username)")
    .textSearch("content", query, { type: "websearch" })
    .limit(30);

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

export async function fetchProfileById(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

export async function fetchProfileThoughts(userId: string, viewerUserId?: string): Promise<Thought[]> {
  const { data } = await supabase
    .from("thoughts")
    .select("*, profiles!thoughts_author_id_fkey(display_name, username)")
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

export async function fetchNightThoughts(userId?: string): Promise<Thought[]> {
  const { data } = await supabase
    .from("thoughts")
    .select("*, profiles!thoughts_author_id_fkey(display_name, username)")
    .eq("is_night_thought", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data) return [];
  const ids = data.map((r: any) => r.id);
  const interactions = userId ? await fetchUserInteractions(userId, ids) : undefined;
  return data.map((row: any) => mapDbThought(row, userId, interactions));
}

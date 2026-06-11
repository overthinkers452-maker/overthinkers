import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculateQualityScore } from "@/utils/format";
import { useAuth } from "@/context/AuthContext";
import * as svc from "@/lib/thoughtsService";
import { supabase } from "@/lib/supabase";

export type PostingMode = "Public" | "Pseudonymous" | "Anonymous";
export type FeedType = "For You" | "Following" | "Trending" | "Latest";

export interface PollOption { text: string; votes: number; }
export type PollDuration = "24h" | "48h" | "7d" | "manual";
export interface Poll {
  options: PollOption[];
  duration: PollDuration;
  expiresAt: string | null;
  totalVotes: number;
  userVote?: number;
}

export interface Thought {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  postingMode: PostingMode;
  alias?: string;
  category: string;
  appreciations: number;
  disagreements: number;
  reposts: number;
  saves: number;
  comments: number;
  reportCount: number;
  qualityScore: number;
  createdAt: string;
  isEdited: boolean;
  editedAt?: string;
  hasAppreciated: boolean;
  hasDisagreed: boolean;
  hasSaved: boolean;
  hasReposted: boolean;
  hasReported: boolean;
  type: "standard" | "poll";
  poll?: Poll;
  feedReason?: string;
  isRepost?: boolean;
  originalAuthorName?: string;
  originalAuthorId?: string;
  originalPostingMode?: PostingMode;
  authorHideAppreciations?: boolean;
  authorHideReposts?: boolean;
  authorStrikeCount?: number;
  mediaUrl?: string;
  language?: "en" | "hi" | "hinglish";
}

export interface Comment {
  id: string;
  thoughtId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorUsername?: string;
  postingMode: PostingMode;
  alias?: string;
  appreciations: number;
  createdAt: string;
  parentId?: string;
  depth: number;
  hasAppreciated: boolean;
  reportCount: number;
  hasReported: boolean;
}

export interface Notification {
  id: string;
  type: "appreciation" | "comment" | "repost" | "follow" | "badge" | "reply" | "mention" | "system";
  actorName: string;
  actorId?: string;
  thoughtId?: string;
  thoughtContent?: string;
  message?: string;
  createdAt: string;
  read: boolean;
}

export interface FleetingThought {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  expiresAt: string;
}

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  reputation: number;
  badge: string;
  followersCount: number;
  followingCount: number;
  thoughtsCount: number;
  avatarUri?: string;
  bannerUri?: string;
  usernameChangedAt?: string;
}

export type ReportResult = { ok: boolean; message: string };


export interface TranslateLang { code: string; label: string; roman?: boolean; }
export interface BlockedUser { id: string; name: string; }
export interface MutedUser { id: string; name: string; username: string; }

interface AppContextType {
  thoughts: Thought[];
  comments: Record<string, Comment[]>;
  notifications: Notification[];
  currentUser: AppUser;
  unreadCount: number;
  feedLoading: boolean;
  moodEmoji: string;
  setMoodEmoji: (emoji: string) => void;
  bannerColor: string;
  setBannerColor: (color: string) => void;
  translateLang: TranslateLang | null;
  setTranslateLang: (lang: TranslateLang | null) => void;
  fleetingThoughts: FleetingThought[];
  addFleetingThought: (content: string) => void;
  followedUsers: Set<string>;
  followingIds: string[];
  toggleFollowUser: (userId: string) => void;
  blockedUsers: BlockedUser[];
  blockUser: (userId: string, name: string) => void;
  unblockUser: (userId: string) => void;
  isBlocked: (userId: string) => boolean;
  mutedUsers: MutedUser[];
  muteUser: (userId: string, name: string, username?: string) => void;
  unmuteUser: (userId: string) => void;
  isMuted: (userId: string) => boolean;
  canChangeUsername: () => { allowed: boolean; nextChangeAt?: string };
  addThought: (thought: Omit<Thought, "id"|"createdAt"|"qualityScore"|"appreciations"|"disagreements"|"reposts"|"saves"|"comments"|"reportCount"|"hasAppreciated"|"hasDisagreed"|"hasSaved"|"hasReposted"|"hasReported"|"isEdited"|"editedAt"|"isRepost"|"originalAuthorName"|"originalAuthorId">) => void;
  editThought: (thoughtId: string, newContent: string) => boolean;
  deleteThought: (thoughtId: string) => void;
  toggleAppreciate: (thoughtId: string) => void;
  toggleDisagree: (thoughtId: string) => void;
  toggleSave: (thoughtId: string) => void;
  toggleRepost: (thoughtId: string) => void;
  reportThought: (thoughtId: string, reason: string, description?: string) => ReportResult;
  votePoll: (thoughtId: string, optionIndex: number) => void;
  addComment: (comment: Omit<Comment, "id"|"createdAt"|"appreciations"|"hasAppreciated"|"reportCount"|"hasReported">) => void;
  toggleCommentAppreciate: (thoughtId: string, commentId: string) => void;
  reportComment: (thoughtId: string, commentId: string, reason: string, description?: string) => ReportResult;
  postNightThought: (content: string) => boolean;
  markAllRead: () => void;
  refreshFeed: (feedType?: FeedType, category?: string | null) => Promise<void>;
  loadMoreFeed: (feedType?: FeedType, category?: string | null) => Promise<void>;
  hasMoreFeed: boolean;
  refreshComments: (thoughtId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  savedThoughts: Thought[];
  refreshSaved: () => Promise<void>;
}



const defaultUser: AppUser = {
  id: "me", username: "QuietMind_516", displayName: "QuietMind_516",
  bio: "Thinking in public, one thought at a time.",
  reputation: 6, badge: "Newcomer",
  followersCount: 0, followingCount: 3, thoughtsCount: 0,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const KEYS = {
  MOOD: "@overthinkers/moodEmoji",
  BANNER: "@overthinkers/bannerColor",
  LANG: "@overthinkers/translateLang",
  FLEETING: "@overthinkers/fleeting",
  REPORTLOG: "@overthinkers/reportLog/v1",
};

const REPORT_RATE_WINDOW_MS = 3600000;
const REPORT_RATE_MAX = 5;

function recomputeScore(t: Thought): Thought {
  return { ...t, qualityScore: calculateQualityScore({ appreciations: t.appreciations, comments: t.comments, reposts: t.reposts, saves: t.saves, pollTotalVotes: t.poll?.totalVotes, reportCount: t.reportCount, createdAt: t.createdAt }) };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();

  // Start empty when user will authenticate (avoids flash of mock data)
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [savedThoughts, setSavedThoughts] = useState<Thought[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const feedOffsetRef = useRef(0);
  const [moodEmoji, setMoodEmojiState] = useState("💭");
  const [bannerColor, setBannerColorState] = useState("#5B5BD6");
  const [translateLang, setTranslateLangState] = useState<TranslateLang | null>(null);
  const [fleetingThoughts, setFleetingThoughts] = useState<FleetingThought[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const reportLog = useRef<number[]>([]);

  // Derive currentUser from auth profile or default
  const currentUser: AppUser = profile ? {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio ?? "",
    reputation: profile.reputation,
    badge: profile.badge,
    followersCount: profile.followers_count,
    followingCount: profile.following_count,
    thoughtsCount: profile.thoughts_count,
    avatarUri: profile.avatar_url ?? undefined,
    bannerUri: profile.banner_url ?? undefined,
    usernameChangedAt: profile.username_changed_at ?? undefined,
  } : defaultUser;

  // ─── Load preferences from AsyncStorage ───────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const [mood, banner, lang, fl, rlog] = await Promise.all([
          AsyncStorage.getItem(KEYS.MOOD),
          AsyncStorage.getItem(KEYS.BANNER),
          AsyncStorage.getItem(KEYS.LANG),
          AsyncStorage.getItem(KEYS.FLEETING),
          AsyncStorage.getItem(KEYS.REPORTLOG),
        ]);
        if (mood) setMoodEmojiState(mood);
        if (banner) setBannerColorState(banner);
        if (lang) setTranslateLangState(JSON.parse(lang));
        if (fl) {
          const parsed: FleetingThought[] = JSON.parse(fl);
          const now = Date.now();
          setFleetingThoughts(parsed.filter(f => new Date(f.expiresAt).getTime() > now));
        }
        if (rlog) reportLog.current = JSON.parse(rlog);
      } catch {}
    };
    load();
  }, []);

  // ─── Load from Supabase when authenticated ─────────────────────────────────

  const FEED_PAGE_SIZE = 30;

  const refreshFeed = useCallback(async (feedType: FeedType = "For You", category: string | null = null) => {
    if (!user) return;
    setFeedLoading(true);
    feedOffsetRef.current = 0;
    const excludeIds = [...blockedUsers.map(b => b.id), ...mutedUsers.map(m => m.id)];
    try {
      const data = await svc.fetchFeed({
        userId: user.id,
        feedType,
        category,
        followingIds,
        excludeIds,
        limit: FEED_PAGE_SIZE,
        offset: 0,
      });
      setThoughts(data.length > 0 ? data : []);
      setHasMoreFeed(data.length === FEED_PAGE_SIZE);
      feedOffsetRef.current = data.length;
    } catch {
      // keep existing thoughts on error
    } finally {
      setFeedLoading(false);
    }
  }, [user, followingIds, blockedUsers, mutedUsers]);

  const loadMoreFeed = useCallback(async (feedType: FeedType = "For You", category: string | null = null) => {
    if (!user || feedLoadingMore || !hasMoreFeed) return;
    setFeedLoadingMore(true);
    const excludeIds = [...blockedUsers.map(b => b.id), ...mutedUsers.map(m => m.id)];
    try {
      const data = await svc.fetchFeed({
        userId: user.id,
        feedType,
        category,
        followingIds,
        excludeIds,
        limit: FEED_PAGE_SIZE,
        offset: feedOffsetRef.current,
      });
      if (data.length > 0) {
        setThoughts(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newOnes = data.filter(t => !existingIds.has(t.id));
          return [...prev, ...newOnes];
        });
      }
      setHasMoreFeed(data.length === FEED_PAGE_SIZE);
      feedOffsetRef.current += data.length;
    } catch {
      // ignore — don't break existing feed
    } finally {
      setFeedLoadingMore(false);
    }
  }, [user, followingIds, blockedUsers, mutedUsers, feedLoadingMore, hasMoreFeed]);

  const refreshComments = useCallback(async (thoughtId: string) => {
    if (!user) return;
    try {
      const data = await svc.fetchComments(thoughtId, user.id);
      setComments(prev => ({ ...prev, [thoughtId]: data }));
    } catch {}
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await svc.fetchNotifications(user.id);
      setNotifications(data);
    } catch {}
  }, [user]);

  // Real-time: append new notifications as they arrive without a full refetch
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { refreshNotifications(); },
      )
      .subscribe((status: string, err?: any) => {
        if (status === "CHANNEL_ERROR" && err) {
          console.error("🔧 NOTIF REALTIME ERROR:", err?.message || err);
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refreshNotifications]);

  const refreshSaved = useCallback(async () => {
    if (!user) return;
    try {
      const data = await svc.fetchSavedThoughts(user.id);
      setSavedThoughts(data);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Load blocked + muted BEFORE followingIds so that when followingIds triggers
    // the feed refresh effect, exclusion lists are already in state.
    Promise.all([
      svc.fetchFollowingIds(user.id),
      svc.fetchBlockedUsers(user.id),
      svc.fetchMutedUsers(user.id),
    ]).then(([ids, blocked, muted]) => {
      setBlockedUsers(blocked);
      setMutedUsers(muted);
      setFollowingIds(ids);
      setFollowedUsers(new Set(ids));
    }).catch(() => {});
    refreshNotifications();
    refreshSaved();
  }, [user]);

  useEffect(() => {
    if (user && followingIds !== undefined) {
      refreshFeed();
    }
  }, [user, followingIds]);

  // ─── Preferences ──────────────────────────────────────────────────────────

  const setMoodEmoji = useCallback((emoji: string) => {
    setMoodEmojiState(emoji);
    AsyncStorage.setItem(KEYS.MOOD, emoji).catch(() => {});
  }, []);

  const setBannerColor = useCallback((color: string) => {
    setBannerColorState(color);
    AsyncStorage.setItem(KEYS.BANNER, color).catch(() => {});
  }, []);

  const setTranslateLang = useCallback((lang: TranslateLang | null) => {
    setTranslateLangState(lang);
    AsyncStorage.setItem(KEYS.LANG, JSON.stringify(lang)).catch(() => {});
  }, []);

  const addFleetingThought = useCallback((content: string) => {
    const ft: FleetingThought = {
      id: Date.now().toString(),
      content,
      authorId: currentUser.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    };
    setFleetingThoughts(prev => {
      const next = [ft, ...prev];
      AsyncStorage.setItem(KEYS.FLEETING, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [currentUser.id]);

  // ─── Follow ────────────────────────────────────────────────────────────────

  const toggleFollowUser = useCallback((userId: string) => {
    const isFollowing = followedUsers.has(userId);
    setFollowedUsers(prev => {
      const next = new Set(prev);
      if (isFollowing) next.delete(userId); else next.add(userId);
      return next;
    });
    setFollowingIds(prev => isFollowing ? prev.filter(id => id !== userId) : [...prev, userId]);
    if (user) {
      svc.toggleFollow(user.id, userId, isFollowing, currentUser.displayName).catch(() => {});
    }
  }, [user, followedUsers]);

  // ─── Block ─────────────────────────────────────────────────────────────────

  const blockUser = useCallback((userId: string, name: string) => {
    setBlockedUsers(prev => {
      if (prev.some(b => b.id === userId)) return prev;
      return [...prev, { id: userId, name }];
    });
    setFollowedUsers(prev => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    if (user) svc.blockUser(user.id, userId).catch(() => {});
  }, [user]);

  const unblockUser = useCallback((userId: string) => {
    setBlockedUsers(prev => prev.filter(b => b.id !== userId));
    if (user) svc.unblockUser(user.id, userId).catch(() => {});
  }, [user]);

  const isBlocked = useCallback((userId: string) => blockedUsers.some(b => b.id === userId), [blockedUsers]);

  // ─── Mute ──────────────────────────────────────────────────────────────────

  const muteUser = useCallback((userId: string, name: string, username = "") => {
    setMutedUsers(prev => {
      if (prev.some(m => m.id === userId)) return prev;
      return [...prev, { id: userId, name, username }];
    });
    if (user) svc.muteUser(user.id, userId).catch(() => {});
  }, [user]);

  const unmuteUser = useCallback((userId: string) => {
    setMutedUsers(prev => prev.filter(m => m.id !== userId));
    if (user) svc.unmuteUser(user.id, userId).catch(() => {});
  }, [user]);

  const isMuted = useCallback((userId: string) => mutedUsers.some(m => m.id === userId), [mutedUsers]);

  // ─── Profile editing ───────────────────────────────────────────────────────

  const canChangeUsername = useCallback((): { allowed: boolean; nextChangeAt?: string } => {
    if (!currentUser.usernameChangedAt) return { allowed: true };
    const last = new Date(currentUser.usernameChangedAt).getTime();
    const elapsed = Date.now() - last;
    const cooldown = 14 * 24 * 3600000;
    if (elapsed >= cooldown) return { allowed: true };
    return { allowed: false, nextChangeAt: new Date(last + cooldown).toISOString() };
  }, [currentUser.usernameChangedAt]);


  // ─── Report rate limiter ───────────────────────────────────────────────────

  const checkReportRate = useCallback((): boolean => {
    const now = Date.now();
    reportLog.current = reportLog.current.filter(ts => now - ts < REPORT_RATE_WINDOW_MS);
    if (reportLog.current.length >= REPORT_RATE_MAX) return false;
    reportLog.current = [...reportLog.current, now];
    AsyncStorage.setItem(KEYS.REPORTLOG, JSON.stringify(reportLog.current)).catch(() => {});
    return true;
  }, []);

  // ─── Night thoughts ────────────────────────────────────────────────────────

  const postNightThought = useCallback((content: string): boolean => {
    // Use IST-based night window check instead of local device time
    const istDate = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
    const h = istDate.getUTCHours();
    if (!(h >= 22 || h < 4)) return false;
    if (!user) return false;

    const optimistic: Thought = recomputeScore({
      id: "night_" + Date.now().toString(),
      content: `#overthink ${content.trim()}`,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      postingMode: "Pseudonymous", alias: currentUser.username,
      category: "Night", appreciations: 0, disagreements: 0, reposts: 0, saves: 0, comments: 0,
      reportCount: 0, qualityScore: 0, createdAt: new Date().toISOString(), isEdited: false,
      hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
      type: "standard", feedReason: "Shared to the 4 AM feed",
    });
    setThoughts(prev => [optimistic, ...prev]);

    svc.createThought({
      authorId: user.id,
      content: `#overthink ${content.trim()}`,
      category: "Night",
      postingMode: "Pseudonymous",
      alias: currentUser.username,
      type: "standard",
      isNightThought: true,
    }).then(created => {
      setThoughts(prev => prev.map(t => t.id === optimistic.id ? created : t));
    }).catch(() => {});

    return true;
  }, [user, currentUser]);

  // ─── Thought CRUD ──────────────────────────────────────────────────────────

  const addThought = useCallback((thought: Omit<Thought, "id"|"createdAt"|"qualityScore"|"appreciations"|"disagreements"|"reposts"|"saves"|"comments"|"reportCount"|"hasAppreciated"|"hasDisagreed"|"hasSaved"|"hasReposted"|"hasReported"|"isEdited"|"editedAt"|"isRepost"|"originalAuthorName"|"originalAuthorId">) => {
    const optimisticId = "opt_" + Date.now().toString();
    const optimistic: Thought = {
      ...thought,
      id: optimisticId,
      createdAt: new Date().toISOString(),
      qualityScore: 0, appreciations: 0, disagreements: 0, reposts: 0, saves: 0, comments: 0,
      reportCount: 0, hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
      isEdited: false,
    };
    setThoughts(prev => [optimistic, ...prev]);

    if (!user) return;
    svc.createThought({
      authorId: user.id,
      content: thought.content,
      category: thought.category,
      postingMode: thought.postingMode,
      alias: thought.alias,
      type: thought.type,
      pollData: thought.poll,
      mediaUrl: thought.mediaUrl,
      language: thought.language,
    }).then(created => {
      setThoughts(prev => prev.map(t => t.id === optimisticId ? created : t));
    }).catch(() => {
      setThoughts(prev => prev.filter(t => t.id !== optimisticId));
    });
  }, [user]);

  const editThought = useCallback((thoughtId: string, newContent: string): boolean => {
    let ok = false;
    setThoughts(prev => {
      const t = prev.find(x => x.id === thoughtId);
      if (!t) return prev;
      if (Date.now() - new Date(t.createdAt).getTime() > 30 * 60000) return prev;
      ok = true;
      return prev.map(x => x.id !== thoughtId ? x : { ...x, content: newContent, isEdited: true, editedAt: new Date().toISOString() });
    });
    if (ok && user) {
      svc.editThought(thoughtId, newContent, user.id).catch(() => {});
    }
    return ok;
  }, [user]);

  const deleteThought = useCallback((thoughtId: string) => {
    setThoughts(prev => prev.filter(t => t.id !== thoughtId));
    if (user) svc.deleteThought(thoughtId, user.id).catch(() => {});
  }, [user]);

  // ─── Engagement ────────────────────────────────────────────────────────────

  const toggleAppreciate = useCallback((thoughtId: string) => {
    let wasOn = false;
    let authorId: string | undefined;
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId) return t;
        wasOn = t.hasAppreciated;
        authorId = t.authorId;
        return recomputeScore({ ...t, hasAppreciated: !wasOn, hasDisagreed: wasOn ? t.hasDisagreed : false, appreciations: wasOn ? t.appreciations - 1 : t.appreciations + 1, disagreements: !wasOn && t.hasDisagreed ? t.disagreements - 1 : t.disagreements });
      });
      return next;
    });
    if (user) svc.toggleAppreciation(thoughtId, user.id, wasOn, authorId, currentUser.displayName, thoughts.find(t => t.id === thoughtId)?.content).catch(() => {});
  }, [user]);

  const toggleDisagree = useCallback((thoughtId: string) => {
    let wasOn = false;
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId) return t;
        wasOn = t.hasDisagreed;
        return recomputeScore({ ...t, hasDisagreed: !wasOn, hasAppreciated: wasOn ? t.hasAppreciated : false, disagreements: wasOn ? t.disagreements - 1 : t.disagreements + 1, appreciations: !wasOn && t.hasAppreciated ? t.appreciations - 1 : t.appreciations });
      });
      return next;
    });
    if (user) svc.toggleDisagreement(thoughtId, user.id, wasOn).catch(() => {});
  }, [user]);

  const toggleSave = useCallback((thoughtId: string) => {
    let wasOn = false;
    let thought: Thought | undefined;
    setThoughts(prev => prev.map(t => {
      if (t.id !== thoughtId) return t;
      wasOn = t.hasSaved;
      thought = t;
      return recomputeScore({ ...t, hasSaved: !wasOn, saves: wasOn ? t.saves - 1 : t.saves + 1 });
    }));
    // Optimistically update savedThoughts list too
    if (!wasOn && thought) {
      setSavedThoughts(prev => [{ ...thought!, hasSaved: true }, ...prev.filter(t => t.id !== thoughtId)]);
    } else {
      setSavedThoughts(prev => prev.filter(t => t.id !== thoughtId));
    }
    if (user) svc.toggleSave(thoughtId, user.id, wasOn).catch(() => {});
  }, [user]);

  const toggleRepost = useCallback((thoughtId: string) => {
    const original = thoughts.find(t => t.id === thoughtId);
    if (!original) return;

    if (!original.hasReposted) {
      const repostEntry: Thought = {
        ...original,
        id: `rp_${thoughtId}_${Date.now()}`,
        authorId: currentUser.id,
        authorName: currentUser.displayName,
        authorUsername: currentUser.username,
        postingMode: "Public",
        createdAt: new Date().toISOString(),
        isRepost: true,
        originalAuthorName: original.postingMode === "Anonymous" ? "Anonymous" : (original.alias || original.authorName),
        originalAuthorId: original.authorId,
        originalPostingMode: original.postingMode,
        appreciations: 0, disagreements: 0, reposts: 0, saves: 0, comments: 0,
        hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
        feedReason: `Reshared from ${original.postingMode === "Anonymous" ? "Anonymous" : (original.alias || original.authorName)}`,
        qualityScore: 0,
      };
      setThoughts(prev => [repostEntry, ...prev.map(t => t.id !== thoughtId ? t : recomputeScore({ ...t, hasReposted: true, reposts: t.reposts + 1 }))]);
    } else {
      setThoughts(prev => prev
        .filter(t => !(t.isRepost && t.originalAuthorId === original.authorId && t.authorId === currentUser.id))
        .map(t => t.id !== thoughtId ? t : recomputeScore({ ...t, hasReposted: false, reposts: Math.max(0, t.reposts - 1) }))
      );
    }
    if (user) svc.toggleRepost(original, user.id, currentUser.displayName, currentUser.username).catch(() => {});
  }, [user, thoughts, currentUser]);

  const reportThought = useCallback((thoughtId: string, reason: string, description?: string): ReportResult => {
    if (!checkReportRate()) return { ok: false, message: "You've reported a lot recently. Please wait before reporting again." };
    setThoughts(prev => prev.map(t => t.id !== thoughtId || t.hasReported ? t : recomputeScore({ ...t, hasReported: true, reportCount: t.reportCount + 1 })));
    if (user) svc.reportThought(thoughtId, user.id, reason, description).catch(() => {});
    return { ok: true, message: "Thanks — our moderation team will review this." };
  }, [user, checkReportRate]);

  const votePoll = useCallback((thoughtId: string, optionIndex: number) => {
    let pollSnapshot: Poll | undefined;
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId || !t.poll || t.poll.userVote !== undefined) return t;
        pollSnapshot = t.poll;
        const newOpts = t.poll.options.map((o, i) => ({ ...o, votes: i === optionIndex ? o.votes + 1 : o.votes }));
        return recomputeScore({ ...t, poll: { ...t.poll, options: newOpts, totalVotes: t.poll.totalVotes + 1, userVote: optionIndex } });
      });
      return next;
    });
    if (user && pollSnapshot) svc.votePoll(thoughtId, user.id, optionIndex, pollSnapshot).catch(() => {});
  }, [user]);

  // ─── Comments ──────────────────────────────────────────────────────────────

  const addComment = useCallback((comment: Omit<Comment, "id"|"createdAt"|"appreciations"|"hasAppreciated"|"reportCount"|"hasReported">) => {
    const optimisticId = "copt_" + Date.now().toString();
    const optimistic: Comment = { ...comment, id: optimisticId, createdAt: new Date().toISOString(), appreciations: 0, hasAppreciated: false, reportCount: 0, hasReported: false };
    setComments(prev => ({ ...prev, [comment.thoughtId]: [...(prev[comment.thoughtId] || []), optimistic] }));
    setThoughts(prev => prev.map(t => t.id !== comment.thoughtId ? t : recomputeScore({ ...t, comments: t.comments + 1 })));

    if (!user) return;
    const thoughtAuthorId = thoughts.find(t => t.id === comment.thoughtId)?.authorId;
    svc.createComment({
      thoughtId: comment.thoughtId,
      authorId: user.id,
      content: comment.content,
      postingMode: comment.postingMode,
      alias: comment.alias,
      parentId: comment.parentId,
      depth: comment.depth,
      thoughtAuthorId,
      senderDisplayName: currentUser.displayName,
    }).then(created => {
      setComments(prev => ({
        ...prev,
        [comment.thoughtId]: (prev[comment.thoughtId] || []).map(c => c.id === optimisticId ? created : c),
      }));
    }).catch(() => {});
  }, [user]);

  const toggleCommentAppreciate = useCallback((thoughtId: string, commentId: string) => {
    let wasOn = false;
    setComments(prev => {
      const next = { ...prev, [thoughtId]: (prev[thoughtId] || []).map(c => {
        if (c.id !== commentId) return c;
        wasOn = c.hasAppreciated;
        return { ...c, hasAppreciated: !wasOn, appreciations: wasOn ? c.appreciations - 1 : c.appreciations + 1 };
      })};
      return next;
    });
    if (user) svc.toggleCommentAppreciation(commentId, user.id, wasOn).catch(() => {});
  }, [user]);

  const reportComment = useCallback((thoughtId: string, commentId: string, reason: string, description?: string): ReportResult => {
    if (!checkReportRate()) return { ok: false, message: "You've reported a lot recently. Please wait before reporting again." };
    setComments(prev => ({
      ...prev,
      [thoughtId]: (prev[thoughtId] || []).map(c => c.id !== commentId || c.hasReported ? c : { ...c, hasReported: true, reportCount: c.reportCount + 1 }),
    }));
    if (user) svc.reportComment(commentId, user.id, reason, description).catch(() => {});
    return { ok: true, message: "Thanks — our moderation team will review this." };
  }, [user, checkReportRate]);

  // ─── Notifications ─────────────────────────────────────────────────────────

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (user) svc.markAllNotificationsRead(user.id).catch(() => {});
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      thoughts, comments, notifications, currentUser, unreadCount, feedLoading,
      moodEmoji, setMoodEmoji, bannerColor, setBannerColor,
      translateLang, setTranslateLang, fleetingThoughts, addFleetingThought,
      followedUsers, followingIds, toggleFollowUser,
      blockedUsers, blockUser, unblockUser, isBlocked,
      mutedUsers, muteUser, unmuteUser, isMuted,
      canChangeUsername,
      addThought, editThought, deleteThought,
      toggleAppreciate, toggleDisagree, toggleSave, toggleRepost, reportThought,
      votePoll, addComment, toggleCommentAppreciate, reportComment,
      postNightThought,
      markAllRead,
      refreshFeed, loadMoreFeed, hasMoreFeed,
      refreshComments, refreshNotifications,
      savedThoughts, refreshSaved,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

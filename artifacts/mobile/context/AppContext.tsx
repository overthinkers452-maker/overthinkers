import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculateQualityScore } from "@/utils/format";

export type PostingMode = "Public" | "Pseudonymous" | "Anonymous";
export type FeedType = "For You" | "Following" | "Trending" | "Latest";

export interface PollOption { text: string; votes: number; }
export type PollDuration = "24h" | "48h" | "7d" | "manual";
export interface Poll {
  options: PollOption[];
  duration: PollDuration;
  /** null when duration is "manual" (open until the author deletes the thought) */
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
  // Repost attribution
  isRepost?: boolean;
  originalAuthorName?: string;
  originalAuthorId?: string;
  originalPostingMode?: PostingMode;
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
  type: "appreciation" | "comment" | "repost" | "follow" | "badge" | "reply";
  actorName: string;
  thoughtContent?: string;
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
  /** ISO timestamp of the last username change — used to enforce the once-per-2-weeks limit */
  usernameChangedAt?: string;
}

export interface ScheduledThought {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  /** ISO timestamp when this will auto-publish to the 1 AM Feed */
  publishAt: string;
  createdAt: string;
}

export type ReportResult = { ok: boolean; message: string };

export interface ProfileUpdate {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUri?: string | null;
  bannerUri?: string | null;
}

export interface TranslateLang { code: string; label: string; roman?: boolean; }

export interface BlockedUser { id: string; name: string; }

interface AppContextType {
  thoughts: Thought[];
  comments: Record<string, Comment[]>;
  notifications: Notification[];
  currentUser: AppUser;
  unreadCount: number;
  moodEmoji: string;
  setMoodEmoji: (emoji: string) => void;
  bannerColor: string;
  setBannerColor: (color: string) => void;
  translateLang: TranslateLang | null;
  setTranslateLang: (lang: TranslateLang | null) => void;
  fleetingThoughts: FleetingThought[];
  addFleetingThought: (content: string) => void;
  followedUsers: Set<string>;
  toggleFollowUser: (userId: string) => void;
  blockedUsers: BlockedUser[];
  blockUser: (userId: string, name: string) => void;
  unblockUser: (userId: string) => void;
  isBlocked: (userId: string) => boolean;
  updateProfile: (update: ProfileUpdate) => ReportResult;
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
  scheduledThoughts: ScheduledThought[];
  scheduleNightThought: (content: string) => ScheduledThought;
  editScheduledThought: (id: string, content: string) => void;
  deleteScheduledThought: (id: string) => void;
  markAllRead: () => void;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

function seedWithScores(thoughts: Thought[]): Thought[] {
  return thoughts.map(t => ({
    ...t,
    qualityScore: calculateQualityScore({
      appreciations: t.appreciations,
      comments: t.comments,
      reposts: t.reposts,
      saves: t.saves,
      pollTotalVotes: t.poll?.totalVotes,
      reportCount: t.reportCount,
      createdAt: t.createdAt,
    }),
  }));
}

const SEED_THOUGHTS: Thought[] = seedWithScores([
  {
    id: "1", content: "The most dangerous phrase in any organisation is 'we've always done it this way.' It's not tradition, it's arrested development masquerading as culture.",
    authorId: "u2", authorName: "Aryan Kapoor", authorUsername: "aryankapoor", postingMode: "Public",
    category: "Philosophy", appreciations: 847, disagreements: 124, reposts: 203, saves: 412, comments: 67,
    reportCount: 0, qualityScore: 0, createdAt: new Date(Date.now() - 2*3600000).toISOString(),
    isEdited: false, hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
    type: "standard", feedReason: "Trending in Philosophy",
  },
  {
    id: "2", content: "We judge ourselves by our intentions. We judge others by their actions. This asymmetry is the root of almost every human conflict.",
    authorId: "anon", authorName: "Anonymous", authorUsername: "", postingMode: "Anonymous",
    category: "Psychology", appreciations: 1203, disagreements: 89, reposts: 445, saves: 876, comments: 142,
    reportCount: 0, qualityScore: 0, createdAt: new Date(Date.now() - 5*3600000).toISOString(),
    isEdited: false, hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
    type: "standard", feedReason: "Highly discussed today",
  },
  {
    id: "3", content: "Which era of the internet was actually the best?",
    authorId: "u3", authorName: "Priya S.", authorUsername: "priya_s", postingMode: "Pseudonymous", alias: "Priya S.",
    category: "Technology", appreciations: 423, disagreements: 56, reposts: 98, saves: 201, comments: 89,
    reportCount: 0, qualityScore: 0, createdAt: new Date(Date.now() - 8*3600000).toISOString(),
    isEdited: false, hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
    type: "poll", feedReason: "Popular among Technology readers",
    poll: {
      options: [
        { text: "Web 1.0 (1995–2004)", votes: 234 },
        { text: "Web 2.0 (2005–2012)", votes: 567 },
        { text: "Early smartphone era (2013–2017)", votes: 312 },
        { text: "We haven't peaked yet", votes: 189 },
      ],
      duration: "48h",
      expiresAt: new Date(Date.now() + 16*3600000).toISOString(),
      totalVotes: 1302,
    },
  },
  {
    id: "4", content: "Productivity culture has made rest feel like a moral failure. Doing nothing is not laziness — it's maintenance. We don't shame cars for needing fuel.",
    authorId: "u4", authorName: "Vikram N.", authorUsername: "vikramnair", postingMode: "Public",
    category: "Culture", appreciations: 2341, disagreements: 312, reposts: 891, saves: 1204, comments: 234,
    reportCount: 0, qualityScore: 0, createdAt: new Date(Date.now() - 12*3600000).toISOString(),
    isEdited: false, hasAppreciated: true, hasDisagreed: false, hasSaved: true, hasReposted: false, hasReported: false,
    type: "standard", feedReason: "Because you follow vikramnair",
  },
  {
    id: "5", content: "AI will not replace human creativity. It will replace human mediocrity. The question is: which category do you fall into?",
    authorId: "anon2", authorName: "Anonymous", authorUsername: "", postingMode: "Anonymous",
    category: "Technology", appreciations: 678, disagreements: 445, reposts: 234, saves: 567, comments: 198,
    reportCount: 0, qualityScore: 0, createdAt: new Date(Date.now() - 18*3600000).toISOString(),
    isEdited: false, hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
    type: "standard", feedReason: "Trending in Technology",
  },
  {
    id: "6", content: "The loneliness epidemic isn't about being alone. It's about being surrounded by people who don't actually see you.",
    authorId: "u5", authorName: "Meera T.", authorUsername: "meera_t", postingMode: "Pseudonymous", alias: "Meera T.",
    category: "Mental Health", appreciations: 3102, disagreements: 67, reposts: 1204, saves: 2341, comments: 445,
    reportCount: 0, qualityScore: 0, createdAt: new Date(Date.now() - 24*3600000).toISOString(),
    isEdited: false, hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
    type: "standard", feedReason: "New from someone you follow",
  },
  {
    id: "7", content: "We rest so that we can keep working. We eat so that we can keep working. We sleep so that we can keep working. At what point did we forget that working was supposed to serve living?",
    authorId: "anon3", authorName: "Anonymous", authorUsername: "", postingMode: "Anonymous",
    category: "Society", appreciations: 3500, disagreements: 123, reposts: 1200, saves: 892, comments: 445,
    reportCount: 0, qualityScore: 0, createdAt: new Date(Date.now() - 20*3600000).toISOString(),
    isEdited: false, hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
    type: "standard", feedReason: "Trending in Society",
  },
  {
    id: "8", content: "Loneliness is not the absence of people. It's the presence of people who don't understand you.",
    authorId: "anon4", authorName: "Anonymous", authorUsername: "", postingMode: "Anonymous",
    category: "Psychology", appreciations: 2300, disagreements: 12, reposts: 678, saves: 891, comments: 234,
    reportCount: 0, qualityScore: 0, createdAt: new Date(Date.now() - 3*3600000).toISOString(),
    isEdited: false, hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
    type: "standard", feedReason: "Highly discussed today",
  },
  {
    id: "9", content: "We built search engines to find information but never built the tools to evaluate it. Information abundance without epistemic infrastructure is just noise at scale.",
    authorId: "si1", authorName: "SilentAlgorithm", authorUsername: "silentalgorithm", postingMode: "Public",
    category: "Technology", appreciations: 678, disagreements: 45, reposts: 234, saves: 156, comments: 89,
    reportCount: 0, qualityScore: 0, createdAt: new Date(Date.now() - 4*3600000).toISOString(),
    isEdited: false, hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
    type: "standard", feedReason: "Trending in Technology",
  },
]);

const SEED_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "appreciation", actorName: "QuantumSage", thoughtContent: "There's a peculiar comfort...", createdAt: new Date(Date.now() - 3600000).toISOString(), read: false },
  { id: "n2", type: "comment", actorName: "DeepDiver_88", thoughtContent: "The saddest thing about...", createdAt: new Date(Date.now() - 7200000).toISOString(), read: false },
  { id: "n3", type: "follow", actorName: "CosmicDrift_07", createdAt: new Date(Date.now() - 7200000).toISOString(), read: false },
  { id: "n4", type: "badge", actorName: "overthinkers", createdAt: new Date(Date.now() - 18000000).toISOString(), read: false },
  { id: "n5", type: "repost", actorName: "Anonymous", thoughtContent: "Loneliness is not the absence...", createdAt: new Date(Date.now() - 28800000).toISOString(), read: true },
  { id: "n6", type: "appreciation", actorName: "BlankCanvas_21", thoughtContent: "The most dangerous phrase...", createdAt: new Date(Date.now() - 36000000).toISOString(), read: true },
];

function normalizeSeedComments(raw: Record<string, Omit<Comment, "reportCount" | "hasReported">[]>): Record<string, Comment[]> {
  const out: Record<string, Comment[]> = {};
  for (const k of Object.keys(raw)) {
    out[k] = raw[k].map(c => ({ ...c, reportCount: 0, hasReported: false }));
  }
  return out;
}

const SEED_COMMENTS: Record<string, Comment[]> = normalizeSeedComments({
  "1": [
    { id: "c1", thoughtId: "1", content: "This cuts deep. Every stagnant team I've ever worked on had this phrase as its unofficial motto.", authorId: "u6", authorName: "Rahul D.", postingMode: "Public", appreciations: 234, createdAt: new Date(Date.now() - 3600000).toISOString(), depth: 0, hasAppreciated: false },
    { id: "c2", thoughtId: "1", content: "Counter: sometimes 'we've always done it this way' means 'we spent years figuring this out.' Context matters.", authorId: "anon3", authorName: "Anonymous", postingMode: "Anonymous", appreciations: 178, createdAt: new Date(Date.now() - 5400000).toISOString(), depth: 0, hasAppreciated: false },
    { id: "c3", thoughtId: "1", content: "That's a fair nuance. The difference is whether there's reflection behind it.", authorId: "u2", authorName: "Aryan Kapoor", postingMode: "Public", appreciations: 89, createdAt: new Date(Date.now() - 2700000).toISOString(), parentId: "c2", depth: 1, hasAppreciated: false },
  ],
  "2": [
    { id: "c4", thoughtId: "2", content: "This is why empathy requires imagination. You have to mentally simulate someone else's situation before you can judge.", authorId: "u7", authorName: "Divya R.", postingMode: "Public", appreciations: 345, createdAt: new Date(Date.now() - 10800000).toISOString(), depth: 0, hasAppreciated: false },
    { id: "c5", thoughtId: "2", content: "The gap between knowing this and actually living it is enormous though.", authorId: "anon5", authorName: "Anonymous", postingMode: "Anonymous", appreciations: 112, createdAt: new Date(Date.now() - 7200000).toISOString(), parentId: "c4", depth: 1, hasAppreciated: false },
  ],
  "8": [
    { id: "c6", thoughtId: "8", content: "I felt this at my own birthday party once. Surrounded by people who cared but didn't understand.", authorId: "anon6", authorName: "Anonymous", postingMode: "Anonymous", appreciations: 567, createdAt: new Date(Date.now() - 3600000).toISOString(), depth: 0, hasAppreciated: false },
    { id: "c7", thoughtId: "8", content: "This is the only kind of loneliness no one talks about.", authorId: "u8", authorName: "NightOwl_23", postingMode: "Public", appreciations: 201, createdAt: new Date(Date.now() - 1800000).toISOString(), parentId: "c6", depth: 1, hasAppreciated: false },
  ],
});

const defaultUser: AppUser = {
  id: "me", username: "QuietMind_516", displayName: "QuietMind_516",
  bio: "Thinking in public, one thought at a time.",
  reputation: 6, badge: "Newcomer",
  followersCount: 0, followingCount: 3, thoughtsCount: 0,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

const KEYS = {
  THOUGHTS: "@overthinkers/thoughts/v3",
  COMMENTS: "@overthinkers/comments/v3",
  NOTIFICATIONS: "@overthinkers/notifications/v3",
  MOOD: "@overthinkers/moodEmoji",
  BANNER: "@overthinkers/bannerColor",
  LANG: "@overthinkers/translateLang",
  FLEETING: "@overthinkers/fleeting",
  FOLLOWED: "@overthinkers/followedUsers",
  USER: "@overthinkers/currentUser/v1",
  SCHEDULED: "@overthinkers/scheduledNight/v1",
  REPORTLOG: "@overthinkers/reportLog/v1",
  BLOCKED: "@overthinkers/blockedUsers/v1",
};

const USERNAME_COOLDOWN_MS = 14 * 24 * 3600000; // once per 2 weeks
const REPORT_RATE_WINDOW_MS = 3600000; // 1 hour
const REPORT_RATE_MAX = 5; // max reports per hour
const COMMENT_AUTOHIDE_THRESHOLD = 3; // community auto-hide

function recomputeScore(t: Thought): Thought {
  return { ...t, qualityScore: calculateQualityScore({ appreciations: t.appreciations, comments: t.comments, reposts: t.reposts, saves: t.saves, pollTotalVotes: t.poll?.totalVotes, reportCount: t.reportCount, createdAt: t.createdAt }) };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [thoughts, setThoughts] = useState<Thought[]>(SEED_THOUGHTS);
  const [comments, setComments] = useState<Record<string, Comment[]>>(SEED_COMMENTS);
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS);
  const [currentUser, setCurrentUser] = useState<AppUser>(defaultUser);
  const [moodEmoji, setMoodEmojiState] = useState("💭");
  const [bannerColor, setBannerColorState] = useState("#5B5BD6");
  const [translateLang, setTranslateLangState] = useState<TranslateLang | null>(null);
  const [fleetingThoughts, setFleetingThoughts] = useState<FleetingThought[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set(["u4", "u5"]));
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [scheduledThoughts, setScheduledThoughts] = useState<ScheduledThought[]>([]);
  const scheduledRef = useRef<ScheduledThought[]>([]);
  useEffect(() => { scheduledRef.current = scheduledThoughts; }, [scheduledThoughts]);
  const reportLog = useRef<number[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, c, n, mood, banner, lang, fl, followed, user, sched, rlog, blocked] = await Promise.all([
          AsyncStorage.getItem(KEYS.THOUGHTS),
          AsyncStorage.getItem(KEYS.COMMENTS),
          AsyncStorage.getItem(KEYS.NOTIFICATIONS),
          AsyncStorage.getItem(KEYS.MOOD),
          AsyncStorage.getItem(KEYS.BANNER),
          AsyncStorage.getItem(KEYS.LANG),
          AsyncStorage.getItem(KEYS.FLEETING),
          AsyncStorage.getItem(KEYS.FOLLOWED),
          AsyncStorage.getItem(KEYS.USER),
          AsyncStorage.getItem(KEYS.SCHEDULED),
          AsyncStorage.getItem(KEYS.REPORTLOG),
          AsyncStorage.getItem(KEYS.BLOCKED),
        ]);
        if (t) setThoughts(JSON.parse(t));
        if (c) setComments(JSON.parse(c));
        if (n) setNotifications(JSON.parse(n));
        if (mood) setMoodEmojiState(mood);
        if (banner) setBannerColorState(banner);
        if (lang) setTranslateLangState(JSON.parse(lang));
        if (fl) {
          const parsed: FleetingThought[] = JSON.parse(fl);
          const now = Date.now();
          setFleetingThoughts(parsed.filter(f => new Date(f.expiresAt).getTime() > now));
        }
        if (followed) setFollowedUsers(new Set(JSON.parse(followed)));
        if (user) setCurrentUser({ ...defaultUser, ...JSON.parse(user) });
        if (sched) setScheduledThoughts(JSON.parse(sched));
        if (rlog) reportLog.current = JSON.parse(rlog);
        if (blocked) { const arr = JSON.parse(blocked); if (Array.isArray(arr)) setBlockedUsers(arr); }
      } catch {}
    };
    load();
  }, []);

  const saveThoughts = useCallback(async (t: Thought[]) => {
    try { await AsyncStorage.setItem(KEYS.THOUGHTS, JSON.stringify(t)); } catch {}
  }, []);
  const saveComments = useCallback(async (c: Record<string, Comment[]>) => {
    try { await AsyncStorage.setItem(KEYS.COMMENTS, JSON.stringify(c)); } catch {}
  }, []);

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

  const toggleFollowUser = useCallback((userId: string) => {
    setFollowedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      AsyncStorage.setItem(KEYS.FOLLOWED, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const blockUser = useCallback((userId: string, name: string) => {
    setBlockedUsers(prev => {
      if (prev.some(b => b.id === userId)) return prev;
      const next = [...prev, { id: userId, name }];
      AsyncStorage.setItem(KEYS.BLOCKED, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setFollowedUsers(prev => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      AsyncStorage.setItem(KEYS.FOLLOWED, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const unblockUser = useCallback((userId: string) => {
    setBlockedUsers(prev => {
      const next = prev.filter(b => b.id !== userId);
      AsyncStorage.setItem(KEYS.BLOCKED, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const isBlocked = useCallback((userId: string) => blockedUsers.some(b => b.id === userId), [blockedUsers]);

  // ─── Profile editing ─────────────────────────────────────────────────────────

  const canChangeUsername = useCallback((): { allowed: boolean; nextChangeAt?: string } => {
    if (!currentUser.usernameChangedAt) return { allowed: true };
    const last = new Date(currentUser.usernameChangedAt).getTime();
    const elapsed = Date.now() - last;
    if (elapsed >= USERNAME_COOLDOWN_MS) return { allowed: true };
    return { allowed: false, nextChangeAt: new Date(last + USERNAME_COOLDOWN_MS).toISOString() };
  }, [currentUser.usernameChangedAt]);

  const updateProfile = useCallback((update: ProfileUpdate): ReportResult => {
    const usernameChanging =
      update.username !== undefined && update.username.trim() !== "" && update.username.trim() !== currentUser.username;

    if (usernameChanging) {
      const gate = canChangeUsername();
      if (!gate.allowed) {
        const when = gate.nextChangeAt ? new Date(gate.nextChangeAt).toLocaleDateString() : "later";
        return { ok: false, message: `You can only change your username once every 2 weeks. Try again after ${when}.` };
      }
      const u = update.username!.trim();
      if (!/^[A-Za-z0-9_]{3,20}$/.test(u)) {
        return { ok: false, message: "Username must be 3–20 characters: letters, numbers or underscores." };
      }
    }

    setCurrentUser(prev => {
      const next: AppUser = { ...prev };
      if (update.displayName !== undefined) next.displayName = update.displayName.trim() || prev.displayName;
      if (update.bio !== undefined) next.bio = update.bio;
      if (update.avatarUri !== undefined) next.avatarUri = update.avatarUri ?? undefined;
      if (update.bannerUri !== undefined) next.bannerUri = update.bannerUri ?? undefined;
      if (usernameChanging) {
        next.username = update.username!.trim();
        next.usernameChangedAt = new Date().toISOString();
      }
      AsyncStorage.setItem(KEYS.USER, JSON.stringify(next)).catch(() => {});
      return next;
    });
    return { ok: true, message: "Profile updated." };
  }, [currentUser.username, canChangeUsername]);

  // ─── Reporting (rate-limited + auto-hide) ─────────────────────────────────────

  const checkReportRate = useCallback((): boolean => {
    const now = Date.now();
    reportLog.current = reportLog.current.filter(ts => now - ts < REPORT_RATE_WINDOW_MS);
    if (reportLog.current.length >= REPORT_RATE_MAX) return false;
    reportLog.current = [...reportLog.current, now];
    AsyncStorage.setItem(KEYS.REPORTLOG, JSON.stringify(reportLog.current)).catch(() => {});
    return true;
  }, []);

  // ─── Scheduled 1 AM Feed thoughts ─────────────────────────────────────────────

  const saveScheduled = useCallback((list: ScheduledThought[]) => {
    AsyncStorage.setItem(KEYS.SCHEDULED, JSON.stringify(list)).catch(() => {});
  }, []);

  /** Returns the next 1:00 AM in local time. If it's already past 1 AM today, schedules tomorrow. */
  const nextOneAM = useCallback((): Date => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(1, 0, 0, 0);
    if (now.getTime() >= target.getTime()) target.setDate(target.getDate() + 1);
    return target;
  }, []);

  const scheduleNightThought = useCallback((content: string): ScheduledThought => {
    const item: ScheduledThought = {
      id: "sch_" + Date.now().toString() + Math.random().toString(36).substr(2, 4),
      content: content.trim(),
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      publishAt: nextOneAM().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setScheduledThoughts(prev => { const next = [item, ...prev]; saveScheduled(next); return next; });
    return item;
  }, [currentUser, nextOneAM, saveScheduled]);

  const editScheduledThought = useCallback((id: string, content: string) => {
    setScheduledThoughts(prev => {
      const next = prev.map(s => s.id !== id ? s : { ...s, content: content.trim() });
      saveScheduled(next); return next;
    });
  }, [saveScheduled]);

  const deleteScheduledThought = useCallback((id: string) => {
    setScheduledThoughts(prev => { const next = prev.filter(s => s.id !== id); saveScheduled(next); return next; });
  }, [saveScheduled]);

  // ─── Thought CRUD ────────────────────────────────────────────────────────────

  const addThought = useCallback((thought: Omit<Thought, "id"|"createdAt"|"qualityScore"|"appreciations"|"disagreements"|"reposts"|"saves"|"comments"|"reportCount"|"hasAppreciated"|"hasDisagreed"|"hasSaved"|"hasReposted"|"hasReported"|"isEdited"|"editedAt"|"isRepost"|"originalAuthorName"|"originalAuthorId">) => {
    const newThought: Thought = { ...thought, id: Date.now().toString() + Math.random().toString(36).substr(2, 5), createdAt: new Date().toISOString(), qualityScore: 0, appreciations: 0, disagreements: 0, reposts: 0, saves: 0, comments: 0, reportCount: 0, hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false, isEdited: false };
    setThoughts(prev => { const next = [newThought, ...prev]; saveThoughts(next); return next; });
  }, [saveThoughts]);

  const editThought = useCallback((thoughtId: string, newContent: string): boolean => {
    let ok = false;
    setThoughts(prev => {
      const t = prev.find(x => x.id === thoughtId);
      if (!t) return prev;
      if (Date.now() - new Date(t.createdAt).getTime() > 30 * 60000) return prev;
      ok = true;
      const next = prev.map(x => x.id !== thoughtId ? x : { ...x, content: newContent, isEdited: true, editedAt: new Date().toISOString() });
      saveThoughts(next);
      return next;
    });
    return ok;
  }, [saveThoughts]);

  const deleteThought = useCallback((thoughtId: string) => {
    setThoughts(prev => { const next = prev.filter(t => t.id !== thoughtId); saveThoughts(next); return next; });
  }, [saveThoughts]);

  // ─── Engagement ──────────────────────────────────────────────────────────────

  const toggleAppreciate = useCallback((thoughtId: string) => {
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId) return t;
        const wasOn = t.hasAppreciated;
        return recomputeScore({ ...t, hasAppreciated: !wasOn, hasDisagreed: wasOn ? t.hasDisagreed : false, appreciations: wasOn ? t.appreciations - 1 : t.appreciations + 1, disagreements: !wasOn && t.hasDisagreed ? t.disagreements - 1 : t.disagreements });
      });
      saveThoughts(next); return next;
    });
  }, [saveThoughts]);

  const toggleDisagree = useCallback((thoughtId: string) => {
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId) return t;
        const wasOn = t.hasDisagreed;
        return recomputeScore({ ...t, hasDisagreed: !wasOn, hasAppreciated: wasOn ? t.hasAppreciated : false, disagreements: wasOn ? t.disagreements - 1 : t.disagreements + 1, appreciations: !wasOn && t.hasAppreciated ? t.appreciations - 1 : t.appreciations });
      });
      saveThoughts(next); return next;
    });
  }, [saveThoughts]);

  const toggleSave = useCallback((thoughtId: string) => {
    setThoughts(prev => {
      const next = prev.map(t => t.id !== thoughtId ? t : recomputeScore({ ...t, hasSaved: !t.hasSaved, saves: t.hasSaved ? t.saves - 1 : t.saves + 1 }));
      saveThoughts(next); return next;
    });
  }, [saveThoughts]);

  /** Section 19 — Repost creates a real entry in the feed attributed to current user */
  const toggleRepost = useCallback((thoughtId: string) => {
    setThoughts(prev => {
      const original = prev.find(t => t.id === thoughtId);
      if (!original) return prev;

      if (!original.hasReposted) {
        // Mark original as reposted
        const withMark = prev.map(t => t.id !== thoughtId ? t : recomputeScore({ ...t, hasReposted: true, reposts: t.reposts + 1 }));
        // Create a repost entry attributed to currentUser
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
        const next = [repostEntry, ...withMark];
        saveThoughts(next);
        return next;
      } else {
        // Un-repost: remove repost entry and decrement count
        const next = prev
          .filter(t => t.id !== `rp_${thoughtId}_${Date.now()}`) // best-effort removal
          .map(t => t.id !== thoughtId ? t : recomputeScore({ ...t, hasReposted: false, reposts: Math.max(0, t.reposts - 1) }));
        // Also remove any repost entries by current user of this original
        const cleaned = next.filter(t => !(t.isRepost && t.originalAuthorId === original.authorId && t.authorId === currentUser.id && t.content === original.content));
        saveThoughts(cleaned);
        return cleaned;
      }
    });
  }, [saveThoughts, currentUser]);

  const reportThought = useCallback((thoughtId: string, _reason: string, _description?: string): ReportResult => {
    if (!checkReportRate()) {
      return { ok: false, message: "You've reported a lot recently. Please wait a little while before reporting again." };
    }
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId || t.hasReported) return t;
        return recomputeScore({ ...t, hasReported: true, reportCount: t.reportCount + 1 });
      });
      saveThoughts(next); return next;
    });
    return { ok: true, message: "Thanks — our moderation team will review this. It's now hidden from your feed." };
  }, [saveThoughts, checkReportRate]);

  const reportComment = useCallback((thoughtId: string, commentId: string, _reason: string, _description?: string): ReportResult => {
    if (!checkReportRate()) {
      return { ok: false, message: "You've reported a lot recently. Please wait a little while before reporting again." };
    }
    setComments(prev => {
      const list = prev[thoughtId] || [];
      const next = { ...prev, [thoughtId]: list.map(c => c.id !== commentId || c.hasReported ? c : { ...c, hasReported: true, reportCount: c.reportCount + 1 }) };
      saveComments(next); return next;
    });
    return { ok: true, message: "Thanks — our moderation team will review this. It's now hidden from your view." };
  }, [saveComments, checkReportRate]);

  const votePoll = useCallback((thoughtId: string, optionIndex: number) => {
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId || !t.poll || t.poll.userVote !== undefined) return t;
        const newOpts = t.poll.options.map((o, i) => ({ ...o, votes: i === optionIndex ? o.votes + 1 : o.votes }));
        return recomputeScore({ ...t, poll: { ...t.poll, options: newOpts, totalVotes: t.poll.totalVotes + 1, userVote: optionIndex } });
      });
      saveThoughts(next); return next;
    });
  }, [saveThoughts]);

  // ─── Comments ────────────────────────────────────────────────────────────────

  const addComment = useCallback((comment: Omit<Comment, "id"|"createdAt"|"appreciations"|"hasAppreciated"|"reportCount"|"hasReported">) => {
    const newComment: Comment = { ...comment, id: Date.now().toString() + Math.random().toString(36).substr(2, 5), createdAt: new Date().toISOString(), appreciations: 0, hasAppreciated: false, reportCount: 0, hasReported: false };
    setComments(prev => { const next = { ...prev, [comment.thoughtId]: [...(prev[comment.thoughtId] || []), newComment] }; saveComments(next); return next; });
    setThoughts(prev => { const next = prev.map(t => t.id !== comment.thoughtId ? t : recomputeScore({ ...t, comments: t.comments + 1 })); saveThoughts(next); return next; });
  }, [saveComments, saveThoughts]);

  const toggleCommentAppreciate = useCallback((thoughtId: string, commentId: string) => {
    setComments(prev => {
      const next = { ...prev, [thoughtId]: (prev[thoughtId] || []).map(c => c.id !== commentId ? c : { ...c, hasAppreciated: !c.hasAppreciated, appreciations: c.hasAppreciated ? c.appreciations - 1 : c.appreciations + 1 }) };
      saveComments(next); return next;
    });
  }, [saveComments]);

  const markAllRead = useCallback(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))), []);
  const unreadCount = notifications.filter(n => !n.read).length;

  // ─── Publish tick: move due scheduled thoughts into the live 1 AM Feed ─────────
  useEffect(() => {
    const publishDue = () => {
      const now = Date.now();
      const prev = scheduledRef.current;
      const due = prev.filter(s => new Date(s.publishAt).getTime() <= now);
      if (due.length === 0) return;
      setThoughts(tPrev => {
        const seen = new Set(tPrev.map(t => t.id));
        const published: Thought[] = due
          .filter(s => (seen.has(s.id) ? false : (seen.add(s.id), true)))
          .map(s => recomputeScore({
            id: s.id, content: `#overthink ${s.content}`,
            authorId: s.authorId, authorName: s.authorName, authorUsername: s.authorUsername,
            postingMode: "Pseudonymous", alias: s.authorUsername,
            category: "Night", appreciations: 0, disagreements: 0, reposts: 0, saves: 0, comments: 0,
            reportCount: 0, qualityScore: 0, createdAt: s.publishAt, isEdited: false,
            hasAppreciated: false, hasDisagreed: false, hasSaved: false, hasReposted: false, hasReported: false,
            type: "standard", feedReason: "Posted to 1 AM Feed",
          }));
        if (published.length === 0) return tPrev;
        const next = [...published, ...tPrev];
        saveThoughts(next);
        return next;
      });
      setScheduledThoughts(sPrev => {
        const remaining = sPrev.filter(s => new Date(s.publishAt).getTime() > now);
        if (remaining.length === sPrev.length) return sPrev;
        scheduledRef.current = remaining;
        saveScheduled(remaining);
        return remaining;
      });
    };
    publishDue();
    const id = setInterval(publishDue, 30_000);
    return () => clearInterval(id);
  }, [saveThoughts, saveScheduled]);

  return (
    <AppContext.Provider value={{
      thoughts, comments, notifications, currentUser, unreadCount,
      moodEmoji, setMoodEmoji, bannerColor, setBannerColor,
      translateLang, setTranslateLang, fleetingThoughts, addFleetingThought,
      followedUsers, toggleFollowUser,
      blockedUsers, blockUser, unblockUser, isBlocked,
      updateProfile, canChangeUsername,
      addThought, editThought, deleteThought,
      toggleAppreciate, toggleDisagree, toggleSave, toggleRepost, reportThought,
      votePoll, addComment, toggleCommentAppreciate, reportComment,
      scheduledThoughts, scheduleNightThought, editScheduledThought, deleteScheduledThought,
      markAllRead,
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

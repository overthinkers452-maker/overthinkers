import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculateQualityScore } from "@/utils/format";

export type PostingMode = "Public" | "Pseudonymous" | "Anonymous";
export type FeedType = "For You" | "Following" | "Trending" | "Latest";

export interface PollOption {
  text: string;
  votes: number;
}

export interface Poll {
  options: PollOption[];
  duration: "24h" | "48h" | "7d";
  expiresAt: string;
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
}

export interface Comment {
  id: string;
  thoughtId: string;
  content: string;
  authorId: string;
  authorName: string;
  postingMode: PostingMode;
  alias?: string;
  appreciations: number;
  createdAt: string;
  parentId?: string;
  depth: number;
  hasAppreciated: boolean;
}

export interface Notification {
  id: string;
  type: "appreciation" | "comment" | "repost" | "follow" | "badge" | "reply";
  actorName: string;
  thoughtContent?: string;
  createdAt: string;
  read: boolean;
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
}

interface AppContextType {
  thoughts: Thought[];
  comments: Record<string, Comment[]>;
  notifications: Notification[];
  currentUser: AppUser;
  unreadCount: number;
  addThought: (thought: Omit<Thought, "id" | "createdAt" | "qualityScore" | "appreciations" | "disagreements" | "reposts" | "saves" | "comments" | "reportCount" | "hasAppreciated" | "hasDisagreed" | "hasSaved" | "hasReposted" | "hasReported" | "isEdited" | "editedAt">) => void;
  editThought: (thoughtId: string, newContent: string) => boolean;
  deleteThought: (thoughtId: string) => void;
  toggleAppreciate: (thoughtId: string) => void;
  toggleDisagree: (thoughtId: string) => void;
  toggleSave: (thoughtId: string) => void;
  toggleRepost: (thoughtId: string) => void;
  reportThought: (thoughtId: string) => void;
  votePoll: (thoughtId: string, optionIndex: number) => void;
  addComment: (comment: Omit<Comment, "id" | "createdAt" | "appreciations" | "hasAppreciated">) => void;
  toggleCommentAppreciate: (thoughtId: string, commentId: string) => void;
  markAllRead: () => void;
}

// ─── Seed Data ──────────────────────────────────────────────────────────────

const SEED_THOUGHTS: Thought[] = [
  {
    id: "1",
    content: "The most dangerous phrase in any organisation is 'we've always done it this way.' It's not tradition, it's arrested development masquerading as culture.",
    authorId: "u2",
    authorName: "Aryan Kapoor",
    authorUsername: "aryankapoor",
    postingMode: "Public",
    category: "Philosophy",
    appreciations: 847,
    disagreements: 124,
    reposts: 203,
    saves: 412,
    comments: 67,
    reportCount: 0,
    qualityScore: 0,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isEdited: false,
    hasAppreciated: false,
    hasDisagreed: false,
    hasSaved: false,
    hasReposted: false,
    hasReported: false,
    type: "standard",
    feedReason: "Trending in Philosophy",
  },
  {
    id: "2",
    content: "We judge ourselves by our intentions. We judge others by their actions. This asymmetry is the root of almost every human conflict.",
    authorId: "anon",
    authorName: "Anonymous",
    authorUsername: "",
    postingMode: "Anonymous",
    category: "Psychology",
    appreciations: 1203,
    disagreements: 89,
    reposts: 445,
    saves: 876,
    comments: 142,
    reportCount: 0,
    qualityScore: 0,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isEdited: false,
    hasAppreciated: false,
    hasDisagreed: false,
    hasSaved: false,
    hasReposted: false,
    hasReported: false,
    type: "standard",
    feedReason: "Highly discussed today",
  },
  {
    id: "3",
    content: "Which era of the internet was actually the best?",
    authorId: "u3",
    authorName: "Priya S.",
    authorUsername: "priya_s",
    postingMode: "Pseudonymous",
    alias: "Priya S.",
    category: "Technology",
    appreciations: 423,
    disagreements: 56,
    reposts: 98,
    saves: 201,
    comments: 89,
    reportCount: 0,
    qualityScore: 0,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    isEdited: false,
    hasAppreciated: false,
    hasDisagreed: false,
    hasSaved: false,
    hasReposted: false,
    hasReported: false,
    type: "poll",
    feedReason: "Popular among Technology readers",
    poll: {
      options: [
        { text: "Web 1.0 (1995–2004)", votes: 234 },
        { text: "Web 2.0 (2005–2012)", votes: 567 },
        { text: "Early smartphone era (2013–2017)", votes: 312 },
        { text: "We haven't peaked yet", votes: 189 },
      ],
      duration: "48h",
      expiresAt: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(),
      totalVotes: 1302,
    },
  },
  {
    id: "4",
    content: "Productivity culture has made rest feel like a moral failure. Doing nothing is not laziness — it's maintenance. We don't shame cars for needing fuel.",
    authorId: "u4",
    authorName: "Vikram N.",
    authorUsername: "vikramnair",
    postingMode: "Public",
    category: "Culture",
    appreciations: 2341,
    disagreements: 312,
    reposts: 891,
    saves: 1204,
    comments: 234,
    reportCount: 0,
    qualityScore: 0,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    isEdited: false,
    hasAppreciated: true,
    hasDisagreed: false,
    hasSaved: true,
    hasReposted: false,
    hasReported: false,
    type: "standard",
    feedReason: "Because you follow vikramnair",
  },
  {
    id: "5",
    content: "AI will not replace human creativity. It will replace human mediocrity. The question is: which category do you fall into?",
    authorId: "anon2",
    authorName: "Anonymous",
    authorUsername: "",
    postingMode: "Anonymous",
    category: "Technology",
    appreciations: 678,
    disagreements: 445,
    reposts: 234,
    saves: 567,
    comments: 198,
    reportCount: 0,
    qualityScore: 0,
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    isEdited: false,
    hasAppreciated: false,
    hasDisagreed: false,
    hasSaved: false,
    hasReposted: false,
    hasReported: false,
    type: "standard",
    feedReason: "Trending in Technology",
  },
  {
    id: "6",
    content: "The loneliness epidemic isn't about being alone. It's about being surrounded by people who don't actually see you.",
    authorId: "u5",
    authorName: "Meera T.",
    authorUsername: "meera_t",
    postingMode: "Pseudonymous",
    alias: "Meera T.",
    category: "Mental Health",
    appreciations: 3102,
    disagreements: 67,
    reposts: 1204,
    saves: 2341,
    comments: 445,
    reportCount: 0,
    qualityScore: 0,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isEdited: false,
    hasAppreciated: false,
    hasDisagreed: false,
    hasSaved: false,
    hasReposted: false,
    hasReported: false,
    type: "standard",
    feedReason: "New from someone you follow",
  },
  {
    id: "7",
    content: "We rest so that we can keep working. We eat so that we can keep working. We sleep so that we can keep working. At what point did we forget that working was supposed to serve living, not the other way around?",
    authorId: "anon3",
    authorName: "Anonymous",
    authorUsername: "",
    postingMode: "Anonymous",
    category: "Society",
    appreciations: 3500,
    disagreements: 123,
    reposts: 1200,
    saves: 892,
    comments: 445,
    reportCount: 0,
    qualityScore: 0,
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    isEdited: false,
    hasAppreciated: false,
    hasDisagreed: false,
    hasSaved: false,
    hasReposted: false,
    hasReported: false,
    type: "standard",
    feedReason: "Trending in Society",
  },
  {
    id: "8",
    content: "Loneliness is not the absence of people. It's the presence of people who don't understand you. Some of the loneliest moments happen in crowded rooms.",
    authorId: "anon4",
    authorName: "Anonymous",
    authorUsername: "",
    postingMode: "Anonymous",
    category: "Psychology",
    appreciations: 2300,
    disagreements: 12,
    reposts: 678,
    saves: 891,
    comments: 234,
    reportCount: 0,
    qualityScore: 0,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isEdited: false,
    hasAppreciated: false,
    hasDisagreed: false,
    hasSaved: false,
    hasReposted: false,
    hasReported: false,
    type: "standard",
    feedReason: "Highly discussed today",
  },
  {
    id: "9",
    content: "We built search engines to find information but never built the tools to evaluate it. Information abundance without epistemic infrastructure is just noise at scale.",
    authorId: "si1",
    authorName: "SilentAlgorithm",
    authorUsername: "silentalgorithm",
    postingMode: "Public",
    category: "Technology",
    appreciations: 678,
    disagreements: 45,
    reposts: 234,
    saves: 156,
    comments: 89,
    reportCount: 0,
    qualityScore: 0,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    isEdited: false,
    hasAppreciated: false,
    hasDisagreed: false,
    hasSaved: false,
    hasReposted: false,
    hasReported: false,
    type: "standard",
    feedReason: "Trending in Technology",
  },
];

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

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "appreciation",
    actorName: "QuantumSage",
    thoughtContent: "There's a peculiar comfort...",
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "n2",
    type: "comment",
    actorName: "DeepDiver_88",
    thoughtContent: "The saddest thing about...",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "n3",
    type: "follow",
    actorName: "CosmicDrift_07",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "n4",
    type: "badge",
    actorName: "overthinkers",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "n5",
    type: "repost",
    actorName: "Anonymous",
    thoughtContent: "Loneliness is not the absence...",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: "n6",
    type: "appreciation",
    actorName: "BlankCanvas_21",
    thoughtContent: "The most dangerous phrase...",
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

const SEED_COMMENTS: Record<string, Comment[]> = {
  "1": [
    {
      id: "c1",
      thoughtId: "1",
      content: "This cuts deep. Every stagnant team I've ever worked on had this phrase as its unofficial motto.",
      authorId: "u6",
      authorName: "Rahul D.",
      postingMode: "Public",
      appreciations: 234,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      depth: 0,
      hasAppreciated: false,
    },
    {
      id: "c2",
      thoughtId: "1",
      content: "Counter: sometimes 'we've always done it this way' means 'we spent years figuring this out and paid a lot of tuition for this knowledge.' Context matters.",
      authorId: "anon3",
      authorName: "Anonymous",
      postingMode: "Anonymous",
      appreciations: 178,
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      depth: 0,
      hasAppreciated: false,
    },
    {
      id: "c3",
      thoughtId: "1",
      content: "That's a fair nuance. The difference is whether there's reflection behind it.",
      authorId: "u2",
      authorName: "Aryan Kapoor",
      postingMode: "Public",
      appreciations: 89,
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      parentId: "c2",
      depth: 1,
      hasAppreciated: false,
    },
  ],
  "2": [
    {
      id: "c4",
      thoughtId: "2",
      content: "This is why empathy requires imagination. You have to mentally simulate someone else's situation before you can judge their actions.",
      authorId: "u7",
      authorName: "Divya R.",
      postingMode: "Public",
      appreciations: 345,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      depth: 0,
      hasAppreciated: false,
    },
    {
      id: "c5",
      thoughtId: "2",
      content: "The gap between knowing this and actually living it is enormous though.",
      authorId: "anon5",
      authorName: "Anonymous",
      postingMode: "Anonymous",
      appreciations: 112,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      parentId: "c4",
      depth: 1,
      hasAppreciated: false,
    },
  ],
  "8": [
    {
      id: "c6",
      thoughtId: "8",
      content: "I felt this at my own birthday party once. Surrounded by people who cared but didn't understand. The worst kind of alone.",
      authorId: "anon6",
      authorName: "Anonymous",
      postingMode: "Anonymous",
      appreciations: 567,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      depth: 0,
      hasAppreciated: false,
    },
    {
      id: "c7",
      thoughtId: "8",
      content: "This is the only kind of loneliness no one talks about.",
      authorId: "u8",
      authorName: "NightOwl_23",
      postingMode: "Public",
      appreciations: 201,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      parentId: "c6",
      depth: 1,
      hasAppreciated: false,
    },
  ],
};

const defaultUser: AppUser = {
  id: "me",
  username: "QuietMind_516",
  displayName: "QuietMind_516",
  bio: "Thinking in public, one thought at a time.",
  reputation: 6,
  badge: "Newcomer",
  followersCount: 0,
  followingCount: 3,
  thoughtsCount: 0,
};

// ─── Context ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  THOUGHTS: "@overthinkers/thoughts/v2",
  COMMENTS: "@overthinkers/comments/v2",
  NOTIFICATIONS: "@overthinkers/notifications/v2",
};

function recomputeScore(t: Thought): Thought {
  return {
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
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [thoughts, setThoughts] = useState<Thought[]>(() => seedWithScores(SEED_THOUGHTS));
  const [comments, setComments] = useState<Record<string, Comment[]>>(SEED_COMMENTS);
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS);
  const [currentUser] = useState<AppUser>(defaultUser);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, c, n] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.THOUGHTS),
          AsyncStorage.getItem(STORAGE_KEYS.COMMENTS),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
        ]);
        if (t) setThoughts(JSON.parse(t));
        if (c) setComments(JSON.parse(c));
        if (n) setNotifications(JSON.parse(n));
      } catch {}
    };
    load();
  }, []);

  const saveThoughts = useCallback(async (t: Thought[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.THOUGHTS, JSON.stringify(t)); } catch {}
  }, []);

  const saveComments = useCallback(async (c: Record<string, Comment[]>) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(c)); } catch {}
  }, []);

  // ─── Thought CRUD ──────────────────────────────────────────────────────────

  const addThought = useCallback((thought: Omit<Thought, "id" | "createdAt" | "qualityScore" | "appreciations" | "disagreements" | "reposts" | "saves" | "comments" | "reportCount" | "hasAppreciated" | "hasDisagreed" | "hasSaved" | "hasReposted" | "hasReported" | "isEdited" | "editedAt">) => {
    const newThought: Thought = {
      ...thought,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      qualityScore: 0,
      appreciations: 0,
      disagreements: 0,
      reposts: 0,
      saves: 0,
      comments: 0,
      reportCount: 0,
      hasAppreciated: false,
      hasDisagreed: false,
      hasSaved: false,
      hasReposted: false,
      hasReported: false,
      isEdited: false,
      editedAt: undefined,
      feedReason: undefined,
    };
    setThoughts(prev => {
      const next = [newThought, ...prev];
      saveThoughts(next);
      return next;
    });
  }, [saveThoughts]);

  /**
   * Section 67 — Thought editing with 30-minute window.
   * Returns true if the edit succeeded, false if the window has expired.
   */
  const editThought = useCallback((thoughtId: string, newContent: string): boolean => {
    let succeeded = false;
    setThoughts(prev => {
      const thought = prev.find(t => t.id === thoughtId);
      if (!thought) return prev;
      const ageMs = Date.now() - new Date(thought.createdAt).getTime();
      if (ageMs > 30 * 60 * 1000) return prev; // outside 30-min window
      succeeded = true;
      const next = prev.map(t =>
        t.id !== thoughtId ? t : { ...t, content: newContent, isEdited: true, editedAt: new Date().toISOString() }
      );
      saveThoughts(next);
      return next;
    });
    return succeeded;
  }, [saveThoughts]);

  const deleteThought = useCallback((thoughtId: string) => {
    setThoughts(prev => {
      const next = prev.filter(t => t.id !== thoughtId);
      saveThoughts(next);
      return next;
    });
  }, [saveThoughts]);

  // ─── Engagement Toggles ────────────────────────────────────────────────────

  const toggleAppreciate = useCallback((thoughtId: string) => {
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId) return t;
        const wasOn = t.hasAppreciated;
        const updated: Thought = {
          ...t,
          hasAppreciated: !wasOn,
          hasDisagreed: wasOn ? t.hasDisagreed : false,
          appreciations: wasOn ? t.appreciations - 1 : t.appreciations + 1,
          disagreements: !wasOn && t.hasDisagreed ? t.disagreements - 1 : t.disagreements,
        };
        return recomputeScore(updated);
      });
      saveThoughts(next);
      return next;
    });
  }, [saveThoughts]);

  const toggleDisagree = useCallback((thoughtId: string) => {
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId) return t;
        const wasOn = t.hasDisagreed;
        const updated: Thought = {
          ...t,
          hasDisagreed: !wasOn,
          hasAppreciated: wasOn ? t.hasAppreciated : false,
          disagreements: wasOn ? t.disagreements - 1 : t.disagreements + 1,
          appreciations: !wasOn && t.hasAppreciated ? t.appreciations - 1 : t.appreciations,
        };
        return recomputeScore(updated);
      });
      saveThoughts(next);
      return next;
    });
  }, [saveThoughts]);

  const toggleSave = useCallback((thoughtId: string) => {
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId) return t;
        const updated: Thought = {
          ...t,
          hasSaved: !t.hasSaved,
          saves: t.hasSaved ? t.saves - 1 : t.saves + 1,
        };
        return recomputeScore(updated);
      });
      saveThoughts(next);
      return next;
    });
  }, [saveThoughts]);

  const toggleRepost = useCallback((thoughtId: string) => {
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId) return t;
        const updated: Thought = {
          ...t,
          hasReposted: !t.hasReposted,
          reposts: t.hasReposted ? t.reposts - 1 : t.reposts + 1,
        };
        return recomputeScore(updated);
      });
      saveThoughts(next);
      return next;
    });
  }, [saveThoughts]);

  /**
   * Section 37 — Report a thought.
   * Increments reportCount and recomputes Quality Score (reports carry -10 penalty).
   * Auto-hide threshold of 5 reports is handled by the Quality Score dropping below zero.
   */
  const reportThought = useCallback((thoughtId: string) => {
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId || t.hasReported) return t;
        const updated: Thought = {
          ...t,
          hasReported: true,
          reportCount: t.reportCount + 1,
        };
        return recomputeScore(updated);
      });
      saveThoughts(next);
      return next;
    });
  }, [saveThoughts]);

  const votePoll = useCallback((thoughtId: string, optionIndex: number) => {
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== thoughtId || !t.poll || t.poll.userVote !== undefined) return t;
        const newOptions = t.poll.options.map((opt, i) => ({
          ...opt,
          votes: i === optionIndex ? opt.votes + 1 : opt.votes,
        }));
        const updatedPoll = {
          ...t.poll,
          options: newOptions,
          totalVotes: t.poll.totalVotes + 1,
          userVote: optionIndex,
        };
        return recomputeScore({ ...t, poll: updatedPoll });
      });
      saveThoughts(next);
      return next;
    });
  }, [saveThoughts]);

  // ─── Comments ──────────────────────────────────────────────────────────────

  const addComment = useCallback((comment: Omit<Comment, "id" | "createdAt" | "appreciations" | "hasAppreciated">) => {
    const newComment: Comment = {
      ...comment,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      appreciations: 0,
      hasAppreciated: false,
    };
    setComments(prev => {
      const next = {
        ...prev,
        [comment.thoughtId]: [...(prev[comment.thoughtId] || []), newComment],
      };
      saveComments(next);
      return next;
    });
    setThoughts(prev => {
      const next = prev.map(t => {
        if (t.id !== comment.thoughtId) return t;
        const updated = { ...t, comments: t.comments + 1 };
        return recomputeScore(updated);
      });
      saveThoughts(next);
      return next;
    });
  }, [saveComments, saveThoughts]);

  /** Section 20 — Comment appreciation toggle. */
  const toggleCommentAppreciate = useCallback((thoughtId: string, commentId: string) => {
    setComments(prev => {
      const threadComments = prev[thoughtId] || [];
      const next = {
        ...prev,
        [thoughtId]: threadComments.map(c => {
          if (c.id !== commentId) return c;
          return {
            ...c,
            hasAppreciated: !c.hasAppreciated,
            appreciations: c.hasAppreciated ? c.appreciations - 1 : c.appreciations + 1,
          };
        }),
      };
      saveComments(next);
      return next;
    });
  }, [saveComments]);

  // ─── Notifications ─────────────────────────────────────────────────────────

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      thoughts, comments, notifications, currentUser, unreadCount,
      addThought, editThought, deleteThought,
      toggleAppreciate, toggleDisagree, toggleSave, toggleRepost, reportThought,
      votePoll, addComment, toggleCommentAppreciate, markAllRead,
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

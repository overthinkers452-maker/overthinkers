import { create } from "zustand";

const THOUGHT_COOLDOWN_MS = 30_000;
const COMMENT_COOLDOWN_MS = 5_000;

interface RateLimitState {
  lastThoughtAt: number | null;
  lastCommentAt: number | null;
  recordThought: () => void;
  recordComment: () => void;
  canPostThought: () => boolean;
  canPostComment: () => boolean;
  thoughtCooldownLeft: () => number;
  commentCooldownLeft: () => number;
}

export const useRateLimitStore = create<RateLimitState>((set, get) => ({
  lastThoughtAt: null,
  lastCommentAt: null,
  recordThought: () => set({ lastThoughtAt: Date.now() }),
  recordComment: () => set({ lastCommentAt: Date.now() }),
  canPostThought: () => {
    const { lastThoughtAt } = get();
    if (!lastThoughtAt) return true;
    return Date.now() - lastThoughtAt >= THOUGHT_COOLDOWN_MS;
  },
  canPostComment: () => {
    const { lastCommentAt } = get();
    if (!lastCommentAt) return true;
    return Date.now() - lastCommentAt >= COMMENT_COOLDOWN_MS;
  },
  thoughtCooldownLeft: () => {
    const { lastThoughtAt } = get();
    if (!lastThoughtAt) return 0;
    return Math.max(0, THOUGHT_COOLDOWN_MS - (Date.now() - lastThoughtAt));
  },
  commentCooldownLeft: () => {
    const { lastCommentAt } = get();
    if (!lastCommentAt) return 0;
    return Math.max(0, COMMENT_COOLDOWN_MS - (Date.now() - lastCommentAt));
  },
}));

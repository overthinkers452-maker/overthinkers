import type { Thought } from "@/context/AppContext";

/**
 * Removes thoughts that should be hidden from a user's feed:
 *  - authored by a blocked user
 *  - containing any of the user's blocked words/phrases (case-insensitive)
 * Own thoughts are never hidden by these rules.
 */
export function applyFeedFilters<T extends Thought>(
  items: T[],
  opts: { blockedWords: string[]; isBlocked: (userId: string) => boolean; currentUserId: string }
): T[] {
  const words = opts.blockedWords.map((w) => w.toLowerCase()).filter(Boolean);
  return items.filter((t) => {
    if (t.authorId === opts.currentUserId) return true;
    if (opts.isBlocked(t.authorId)) return false;
    if (words.length > 0) {
      const content = t.content.toLowerCase();
      if (words.some((w) => content.includes(w))) return false;
    }
    return true;
  });
}

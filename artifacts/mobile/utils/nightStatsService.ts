/**
 * Night Window Phase 2 — Streaks, Mood, Badges, Engagement Stats
 *
 * Provides client-side APIs for fetching/upserting night activity,
 * streaks, and badge data. Complements the DB functions defined in
 * night_window_phase2.sql.
 */
import { supabase } from "@/lib/supabase";
import { isNightOpenIST, toIST } from "./nightWindow";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NightActivity {
  id: string;
  userId: string;
  sessionDate: string; // ISO date string
  moodEmoji: string | null;
  thoughtsPosted: number;
  appreciationsReceived: number;
  appreciationsGiven: number;
  isActive: boolean;
  createdAt: string;
}

export interface NightStreak {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export interface NightBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
}

export type BadgeId = "night_owl" | "night_thinker" | "moon_child" | "nocturnal_sage";

export const NIGHT_BADGE_META: Record<BadgeId, { label: string; emoji: string; color: string; min: number }> = {
  night_owl:      { label: "Night Owl",      emoji: "🦉", color: "#A78BFA", min: 1 },
  night_thinker:  { label: "Night Thinker",  emoji: "🌙", color: "#818CF8", min: 5 },
  moon_child:     { label: "Moon Child",     emoji: "🌕", color: "#C4B5FD", min: 10 },
  nocturnal_sage: { label: "Nocturnal Sage", emoji: "⭐", color: "#F9A8D4", min: 20 },
};

export const NIGHT_MOODS = ["🌙", "💭", "🌊", "🌟", "🌌", "🕯️", "✨", "🌠", "🔮", "🎭"];

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapActivity(row: any): NightActivity {
  return {
    id: row.id,
    userId: row.user_id,
    sessionDate: row.session_date,
    moodEmoji: row.mood_emoji,
    thoughtsPosted: row.thoughts_posted,
    appreciationsReceived: row.appreciations_received,
    appreciationsGiven: row.appreciations_given,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapStreak(row: any): NightStreak {
  return {
    id: row.id,
    userId: row.user_id,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActiveDate: row.last_active_date,
  };
}

function mapBadge(row: any): NightBadge {
  return {
    id: row.id,
    userId: row.user_id,
    badgeId: row.badge_id,
    earnedAt: row.earned_at,
  };
}

// ─── Night Activity ───────────────────────────────────────────────────────────

/** Fetch today's night activity for the user */
export async function fetchTodayActivity(userId: string): Promise<NightActivity | null> {
  const istDate = istTodayDate();
  const { data } = await supabase
    .from("night_activity")
    .select("*")
    .eq("user_id", userId)
    .eq("session_date", istDate)
    .maybeSingle();
  return data ? mapActivity(data) : null;
}

/** Fetch recent night activity history (last N days) */
export async function fetchNightActivityHistory(userId: string, days = 30): Promise<NightActivity[]> {
  const { data } = await supabase
    .from("night_activity")
    .select("*")
    .eq("user_id", userId)
    .order("session_date", { ascending: false })
    .limit(days);
  return (data ?? []).map(mapActivity);
}

/** Upsert mood for the current session */
export async function updateNightMood(userId: string, emoji: string): Promise<void> {
  const istDate = istTodayDate();
  await supabase.from("night_activity").upsert({
    user_id: userId,
    session_date: istDate,
    mood_emoji: emoji,
    is_active: true,
  }, {
    onConflict: "user_id, session_date",
  });
}

/** Record an appreciation given (not a thought) during night */
export async function recordNightAppreciationGiven(userId: string): Promise<void> {
  const istDate = istTodayDate();
  try {
    await supabase.rpc("increment_night_appreciation_given", { p_user_id: userId, p_date: istDate });
  } catch {
    // Fallback: direct upsert
    const { data } = await supabase.from("night_activity")
      .select("appreciations_given")
      .eq("user_id", userId)
      .eq("session_date", istDate)
      .maybeSingle();
    const current = data?.appreciations_given ?? 0;
    await supabase.from("night_activity").upsert({
      user_id: userId,
      session_date: istDate,
      appreciations_given: current + 1,
      is_active: true,
    }, { onConflict: "user_id, session_date" });
  }
}

// ─── Night Streaks ────────────────────────────────────────────────────────────

/** Fetch the user's night streak data */
export async function fetchNightStreak(userId: string): Promise<NightStreak | null> {
  const { data } = await supabase
    .from("night_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? mapStreak(data) : null;
}

/** Call the DB function to update streak after posting a night thought */
export async function updateNightStreak(userId: string): Promise<void> {
  await supabase.rpc("update_night_streak", { p_user_id: userId });
}

// ─── Night Badges ─────────────────────────────────────────────────────────────

/** Fetch all badges earned by the user */
export async function fetchNightBadges(userId: string): Promise<NightBadge[]> {
  const { data } = await supabase
    .from("night_badges")
    .select("*")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });
  return (data ?? []).map(mapBadge);
}

/** Call the DB function to award badges based on post count */
export async function checkAndAwardBadges(userId: string): Promise<BadgeId[]> {
  const { data } = await supabase.rpc("award_night_badges", { p_user_id: userId });
  return (data as BadgeId[]) ?? [];
}

/** Get the highest badge from earned badge list */
export function getHighestBadge(badges: NightBadge[]): NightBadge | null {
  const order: BadgeId[] = ["nocturnal_sage", "moon_child", "night_thinker", "night_owl"];
  for (const id of order) {
    const found = badges.find(b => b.badgeId === id);
    if (found) return found;
  }
  return null;
}

// ─── Deep Thoughts / Prioritization ───────────────────────────────────────────

/**
 * Sort night thoughts by "depth" — prioritizes:
 * 1. Anonymous thoughts (highlighted)
 * 2. Higher quality_score thoughts
 * 3. More recent thoughts (within same quality tier)
 */
export function prioritizeNightThoughts<T extends { postingMode: string; qualityScore?: number; createdAt: string }>(
  thoughts: T[]
): T[] {
  return [...thoughts].sort((a, b) => {
    // Anonymous posts get top priority
    const aAnonymous = a.postingMode === "Anonymous" ? 1 : 0;
    const bAnonymous = b.postingMode === "Anonymous" ? 1 : 0;
    if (aAnonymous !== bAnonymous) return bAnonymous - aAnonymous;

    // Then by quality score (higher = deeper)
    const aScore = a.qualityScore ?? 0;
    const bScore = b.qualityScore ?? 0;
    if (aScore !== bScore) return bScore - aScore;

    // Finally by recency
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ─── Night Mood Statistics ────────────────────────────────────────────────────

export interface NightMoodStats {
  totalSessions: number;
  totalThoughts: number;
  totalAppreciationsGiven: number;
  totalAppreciationsReceived: number;
  moodDistribution: Record<string, number>;
  mostFrequentMood: string | null;
  averageThoughtsPerSession: number;
}

/** Aggregate mood stats from activity history */
export function computeNightMoodStats(activities: NightActivity[]): NightMoodStats {
  const moodCounts: Record<string, number> = {};
  let totalThoughts = 0;
  let totalAppreciationsGiven = 0;
  let totalAppreciationsReceived = 0;

  for (const a of activities) {
    totalThoughts += a.thoughtsPosted;
    totalAppreciationsGiven += a.appreciationsGiven;
    totalAppreciationsReceived += a.appreciationsReceived;
    if (a.moodEmoji) {
      moodCounts[a.moodEmoji] = (moodCounts[a.moodEmoji] || 0) + 1;
    }
  }

  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);

  return {
    totalSessions: activities.length,
    totalThoughts,
    totalAppreciationsGiven,
    totalAppreciationsReceived,
    moodDistribution: moodCounts,
    mostFrequentMood: sortedMoods.length > 0 ? sortedMoods[0][0] : null,
    averageThoughtsPerSession: activities.length > 0
      ? Math.round((totalThoughts / activities.length) * 10) / 10
      : 0,
  };
}

// ─── Analytics / Engagement Tracking ──────────────────────────────────────────

export interface NightEngagement {
  date: string;
  thoughtsPosted: number;
  appreciationsReceived: number;
  appreciationsGiven: number;
  mood: string | null;
}

/** Fetch nightly engagement for charting over the last N days */
export async function fetchNightEngagement(userId: string, days = 7): Promise<NightEngagement[]> {
  const activities = await fetchNightActivityHistory(userId, days);
  return activities.map(a => ({
    date: a.sessionDate,
    thoughtsPosted: a.thoughtsPosted,
    appreciationsReceived: a.appreciationsReceived,
    appreciationsGiven: a.appreciationsGiven,
    mood: a.moodEmoji,
  }));
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Get today's IST date as YYYY-MM-DD string */
function istTodayDate(): string {
  const now = new Date();
  const ist = toIST(now);
  return ist.toISOString().slice(0, 10);
}
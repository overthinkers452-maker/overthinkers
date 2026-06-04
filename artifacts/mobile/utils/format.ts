export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  return `${w}w`;
}

export function timeUntil(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return "closed";
  const h = Math.floor(diff / (1000 * 60 * 60));
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

/**
 * Section 30 — Quality Score formula
 * Score = (Appreciations × 2 + Comments × 3 + Reposts × 5 + Saves × 4 + PollParticipation × 2)
 *         ÷ (HoursSincePosted + 2)^1.5
 * Negative signals: Reports × -10
 */
export function calculateQualityScore(params: {
  appreciations: number;
  comments: number;
  reposts: number;
  saves: number;
  pollTotalVotes?: number;
  reportCount?: number;
  createdAt: string;
}): number {
  const hoursOld =
    (Date.now() - new Date(params.createdAt).getTime()) / (1000 * 60 * 60);
  const positive =
    params.appreciations * 2 +
    params.comments * 3 +
    params.reposts * 5 +
    params.saves * 4 +
    (params.pollTotalVotes ?? 0) * 2;
  const negative = (params.reportCount ?? 0) * 10;
  const decay = Math.pow(hoursOld + 2, 1.5);
  const raw = Math.max(0, (positive - negative) / decay);
  return Math.round(raw * 10) / 10;
}

/** Returns true if the given ISO timestamp is within the 30-minute edit window. */
export function withinEditWindow(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 30 * 60 * 1000;
}

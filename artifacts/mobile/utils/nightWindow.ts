/**
 * 4 AM feed window: open 10 PM – 4 AM Asia/Kolkata (IST, UTC+5:30).
 * All checks use IST regardless of the user's device timezone.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30 in milliseconds

/** Returns the IST representation of a date. */
function toIST(d: Date = new Date()): Date {
  // localOffset is how many ms the device is behind UTC (positive = behind)
  const localOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() + IST_OFFSET_MS + localOffsetMs);
}

/** True when the 4 AM feed window is open (10 PM – 4 AM IST). */
export function isNightOpenIST(d: Date = new Date()): boolean {
  const h = toIST(d).getUTCHours();
  return h >= 22 || h < 4;
}

/** Minutes until the feed opens. Only valid when the feed is closed. */
export function minutesUntilOpenIST(d: Date = new Date()): number {
  const ist = toIST(d);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  const nowMins = h * 60 + m;
  const openMins = 22 * 60;
  return nowMins < openMins ? openMins - nowMins : 0;
}

/** Minutes until the feed closes. Only valid when the feed is open. */
export function minutesUntilCloseIST(d: Date = new Date()): number {
  const ist = toIST(d);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  const nowMins = h * 60 + m;
  const closeMins = 4 * 60;
  return h >= 22
    ? (24 * 60 - nowMins) + closeMins
    : Math.max(0, closeMins - nowMins);
}

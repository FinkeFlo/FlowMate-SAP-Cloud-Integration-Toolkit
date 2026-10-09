/**
 * Date, time and duration formatting for the FlowMate UI (design system,
 * "Writing"): ISO-ordered dates, 24 h times and a space between a number and
 * its unit. Everything is local time, so a day separator and the times listed
 * under it always agree.
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local calendar day in ISO order, e.g. `2026-10-09`. */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local time of day, 24 h, e.g. `07:04:09`. */
export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Local date and time, e.g. `2026-10-09 07:04:09`. */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/** A duration with its unit, e.g. `850 ms`, `1.2 s`, `3 min 4 s`. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  // Round first, then pick the unit, so 59 999 ms reads "1 min 0 s", not "60.0 s".
  const tenths = Math.round(ms / 100);
  if (tenths < 600) return `${(tenths / 10).toFixed(1)} s`;
  const totalSecs = Math.round(ms / 1000);
  return `${Math.floor(totalSecs / 60)} min ${totalSecs % 60} s`;
}

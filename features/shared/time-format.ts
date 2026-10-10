/**
 * Date, time and duration formatting for the FlowMate UI (design system,
 * "Writing"): ISO-ordered dates, 24 h times and a space between a number and
 * its unit. Everything is local time, so a day separator and the times listed
 * under it always agree.
 */

const pad = (n: number): string => String(n).padStart(2, '0');
const isValid = (date: Date): boolean => !Number.isNaN(date.getTime());

/** Shown instead of a date, time or duration that cannot be read. */
export const NO_VALUE = '-';

/** Local calendar day in ISO order, e.g. `2026-10-09`. */
export function formatDate(date: Date): string {
  if (!isValid(date)) return NO_VALUE;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local time of day, 24 h, e.g. `07:04:09`. */
export function formatTime(date: Date): string {
  if (!isValid(date)) return NO_VALUE;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Local date and time, e.g. `2026-10-09 07:04:09`. */
export function formatDateTime(date: Date): string {
  if (!isValid(date)) return NO_VALUE;
  return `${formatDate(date)} ${formatTime(date)}`;
}

/** A duration with its unit, e.g. `850 ms`, `1.2 s`, `3 min 4 s`, `2 h 5 min`. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return NO_VALUE;
  // Round first, then pick the unit, so 59 999 ms reads "1 min 0 s", not "60.0 s".
  if (Math.round(ms) < 1000) return `${Math.round(ms)} ms`;
  const tenths = Math.round(ms / 100);
  if (tenths < 600) return `${(tenths / 10).toFixed(1)} s`;
  const totalSecs = Math.round(ms / 1000);
  if (totalSecs < 3600) return `${Math.floor(totalSecs / 60)} min ${totalSecs % 60} s`;
  const totalMins = Math.round(ms / 60_000);
  return `${Math.floor(totalMins / 60)} h ${totalMins % 60} min`;
}

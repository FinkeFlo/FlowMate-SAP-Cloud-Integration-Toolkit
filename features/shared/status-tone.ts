/**
 * Status tones: color means state (FlowMate design system). Maps SAP message
 * processing statuses to the theme's status colors. Every status shown in a
 * tone also carries its word or an icon, never the color alone.
 */

export type StatusTone = 'success' | 'error' | 'warning' | 'info' | 'neutral';

const MPL_STATUS_TONE: Record<string, StatusTone> = {
  COMPLETED: 'success',
  FAILED: 'error',
  RETRY: 'warning',
  ESCALATED: 'warning',
  PROCESSING: 'info',
  CANCELLED: 'neutral',
  DISCARDED: 'neutral',
  ABANDONED: 'neutral',
};

/** Tone for an MPL status value; unknown values are neutral. */
export function mplStatusTone(status: string): StatusTone {
  return MPL_STATUS_TONE[status] ?? 'neutral';
}

/** Status disc (dot with a glyph): fill plus a glyph color that reads on it. */
export const TONE_DISC_CLASS: Record<StatusTone, string> = {
  success: 'bg-success text-success-content',
  error: 'bg-error text-error-content',
  warning: 'bg-warning text-warning-content',
  info: 'bg-info text-info-content',
  neutral: 'bg-muted text-base-100',
};

/** daisyUI badge color for a tone; combine with `badge-soft` for the tinted look. */
export const TONE_BADGE_CLASS: Record<StatusTone, string> = {
  success: 'badge-success',
  error: 'badge-error',
  warning: 'badge-warning',
  info: 'badge-info',
  neutral: 'badge-ghost',
};

/** Status word in its tone, readable on base-100 and base-200. */
export const TONE_TEXT_CLASS: Record<StatusTone, string> = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
  neutral: 'text-muted',
};

import type { PerformanceTier } from './inline-trace-types';

/**
 * Colors of executed steps on the BPMN diagram.
 *
 * Hardcoded hex values (not `var(--color-*)`): they are applied directly to SVG
 * elements on the SAP host page, *outside* our Shadow Root, where daisyUI's CSS
 * custom properties don't exist — `var(--color-success)` would be invalid there
 * and the SVG `fill` would fall back to black. Keep these in sync with the
 * `flowmate` theme in assets/flowmate-theme.css.
 */
export const STEP_COLORS = {
  /** `error`: the step failed. */
  failed: '#c8322b',
  /** `success`: executed, average duration (or no duration data). */
  average: '#17783f',
  /** `info`: the fastest step and steps below average. */
  fast: '#1d64c8',
  /** `warning`: the slowest step and steps above average. */
  slow: '#a35a00',
  /** `primary`: the step currently shown in the step popup. */
  selected: '#0a5a65',
} as const;

/**
 * Color for an executed step. Only a failed step is painted in the error
 * color; duration tiers never are — a slow step is not a failed one.
 */
export function resolveStepColor(error: string | null, tier?: PerformanceTier): string {
  if (error) return STEP_COLORS.failed;

  switch (tier) {
    case 'min':
    case 'below-avg':
      return STEP_COLORS.fast;
    case 'max':
    case 'above-avg':
      return STEP_COLORS.slow;
    default:
      return STEP_COLORS.average;
  }
}

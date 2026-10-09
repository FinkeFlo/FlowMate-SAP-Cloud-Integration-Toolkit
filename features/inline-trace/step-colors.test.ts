import { describe, expect, it } from 'vitest';
import { resolveStepColor, STEP_COLORS } from './step-colors';

describe('resolveStepColor', () => {
  it('paints a failed step in the error color, whatever its duration', () => {
    expect(resolveStepColor('Exception in step', 'min')).toBe(STEP_COLORS.failed);
    expect(resolveStepColor('Exception in step')).toBe(STEP_COLORS.failed);
  });

  it('never uses the error color for a duration tier', () => {
    expect(resolveStepColor(null, 'max')).toBe(STEP_COLORS.slow);
    expect(resolveStepColor(null, 'max')).not.toBe(STEP_COLORS.failed);
  });

  it('maps duration tiers to fast, average and slow', () => {
    expect(resolveStepColor(null, 'min')).toBe(STEP_COLORS.fast);
    expect(resolveStepColor(null, 'below-avg')).toBe(STEP_COLORS.fast);
    expect(resolveStepColor(null, 'avg')).toBe(STEP_COLORS.average);
    expect(resolveStepColor(null, 'above-avg')).toBe(STEP_COLORS.slow);
  });

  it('treats a step without duration data as average', () => {
    expect(resolveStepColor(null)).toBe(STEP_COLORS.average);
  });
});

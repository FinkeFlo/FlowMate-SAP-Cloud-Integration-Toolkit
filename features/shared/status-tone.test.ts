import { describe, expect, it } from 'vitest';
import { mplStatusTone } from './status-tone';

describe('mplStatusTone', () => {
  it('maps completed and failed messages to success and error', () => {
    expect(mplStatusTone('COMPLETED')).toBe('success');
    expect(mplStatusTone('FAILED')).toBe('error');
  });

  it('shows retry and escalated as warning, processing as info', () => {
    expect(mplStatusTone('RETRY')).toBe('warning');
    expect(mplStatusTone('ESCALATED')).toBe('warning');
    expect(mplStatusTone('PROCESSING')).toBe('info');
  });

  it('keeps ended-without-result statuses neutral', () => {
    expect(mplStatusTone('CANCELLED')).toBe('neutral');
    expect(mplStatusTone('DISCARDED')).toBe('neutral');
    expect(mplStatusTone('ABANDONED')).toBe('neutral');
  });

  it('treats unknown values as neutral instead of guessing a color', () => {
    expect(mplStatusTone('SOMETHING_NEW')).toBe('neutral');
    expect(mplStatusTone('')).toBe('neutral');
  });
});

import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatDuration, formatTime, NO_VALUE } from './time-format';

describe('formatDate / formatTime', () => {
  it('runs in Europe/Berlin (vitest.config.ts), so local and UTC days differ after midnight', () => {
    expect(new Date(2026, 9, 9, 12, 0).getTimezoneOffset()).toBe(-120);
  });

  it('pads to ISO order and a 24 h clock', () => {
    const date = new Date(2026, 0, 5, 7, 4, 9);
    expect(formatDate(date)).toBe('2026-01-05');
    expect(formatTime(date)).toBe('07:04:09');
    expect(formatTime(new Date(2026, 0, 5, 19, 30, 0))).toBe('19:30:00');
    expect(formatDateTime(date)).toBe('2026-01-05 07:04:09');
  });

  it('uses the local day, so a day separator matches the times under it', () => {
    // Regression: the message log grouped by the UTC day (toISOString), which
    // put a message at 00:30 local time under the previous day's separator.
    const justAfterMidnight = new Date(2026, 9, 9, 0, 30, 0);
    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe('2026-10-08');
    expect(formatDate(justAfterMidnight)).toBe('2026-10-09');
    expect(formatTime(justAfterMidnight)).toBe('00:30:00');
  });

  it('shows a dash for a date that cannot be read', () => {
    const invalid = new Date('not a date');
    expect(formatDate(invalid)).toBe(NO_VALUE);
    expect(formatTime(invalid)).toBe(NO_VALUE);
    expect(formatDateTime(invalid)).toBe(NO_VALUE);
  });
});

describe('formatDuration', () => {
  it('puts a space between the number and its unit', () => {
    expect(formatDuration(850)).toBe('850 ms');
    expect(formatDuration(1234)).toBe('1.2 s');
    expect(formatDuration(184_000)).toBe('3 min 4 s');
    expect(formatDuration(7_500_000)).toBe('2 h 5 min');
  });

  it('switches units at one second, one minute and one hour', () => {
    expect(formatDuration(0)).toBe('0 ms');
    expect(formatDuration(999)).toBe('999 ms');
    expect(formatDuration(1000)).toBe('1.0 s');
    expect(formatDuration(59_940)).toBe('59.9 s');
    expect(formatDuration(59_999)).toBe('1 min 0 s');
    expect(formatDuration(60_000)).toBe('1 min 0 s');
    expect(formatDuration(3_599_400)).toBe('59 min 59 s');
    expect(formatDuration(3_599_600)).toBe('1 h 0 min');
    expect(formatDuration(259_200_000)).toBe('72 h 0 min');
  });

  it('rounds fractional milliseconds and rejects values that are not numbers', () => {
    expect(formatDuration(123.456)).toBe('123 ms');
    expect(formatDuration(999.6)).toBe('1.0 s');
    expect(formatDuration(Number.NaN)).toBe(NO_VALUE);
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe(NO_VALUE);
  });
});

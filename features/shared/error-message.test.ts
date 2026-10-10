import { describe, expect, it } from 'vitest';
import { errorMessage } from './error-message';

describe('errorMessage', () => {
  it('returns the message of an Error without its "Error:" prefix', () => {
    expect(errorMessage(new Error('Request timed out'))).toBe('Request timed out');
    expect(errorMessage(new TypeError('Failed to fetch'))).toBe('Failed to fetch');
  });

  it('falls back to the error name when the message is empty', () => {
    expect(errorMessage(new TypeError(''))).toBe('TypeError');
  });

  it('stringifies values that are not errors', () => {
    expect(errorMessage('HTTP 403')).toBe('HTTP 403');
    expect(errorMessage(404)).toBe('404');
  });
});

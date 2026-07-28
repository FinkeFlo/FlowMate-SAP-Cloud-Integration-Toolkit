/**
 * I18n Helper
 * Wrapper around browser.i18n for easier usage
 */
import { browser } from 'wxt/browser';

/**
 * Get translated message
 */
export function t(key: string, substitutions?: string | string[]): string {
  // getMessage expects a predefined key type from WXT, but we use dynamic keys
  return browser.i18n.getMessage(key as Parameters<typeof browser.i18n.getMessage>[0], substitutions);
}

/**
 * Get translated message with a single substitution.
 * Convenience wrapper used by validators for type/part placeholders.
 */
export function tSub(key: string, substitution: string): string {
  return t(key, [substitution]);
}

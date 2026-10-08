/**
 * SAP Cloud Integration host validation — the single trust-boundary check for
 * every URL that reaches `fetch`, `tabs.create` or `window.open`.
 *
 * Pure module (no browser/i18n imports) so it can be used from the background
 * service worker, the content script, storage code and unit tests alike.
 */

/**
 * Integration Suite UI hosts: `<subaccount>.integrationsuite(-trial).cfapps.<region>.hana.ondemand.com`.
 * Anchored on both ends — substring checks like `includes('integrationsuite')` are bypassable.
 */
export const CPI_UI_HOSTNAME_RE = /^[a-z0-9-]+\.integrationsuite(-trial)?\.cfapps\.[a-z0-9-]+\.hana\.ondemand\.com$/i;

/** True when `hostname` (no scheme, no path) is an Integration Suite UI host. */
export function isCpiUiHostname(hostname: string): boolean {
  return CPI_UI_HOSTNAME_RE.test(hostname);
}

/**
 * Parses `url` and returns its `https://host` origin when it is an Integration
 * Suite UI URL; `null` for anything else (http, credentials in the URL, other
 * hosts, unparsable input). Fail closed: callers must skip/reject on `null`.
 */
export function toCpiOrigin(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.port) return null; // real tenants are always on 443; `:443` is normalised away by the parser
  if (parsed.username || parsed.password) return null;
  if (!isCpiUiHostname(parsed.hostname)) return null;
  return parsed.origin;
}

/** True when `url` is an `https` URL on an Integration Suite UI host. */
export function isCpiUrl(url: string): boolean {
  return toCpiOrigin(url) !== null;
}

/**
 * SAP Cloud Integration host validation — the single trust-boundary check for
 * every URL that reaches `fetch`, `tabs.create` or `window.open`.
 *
 * Pure module (no browser/i18n imports) so it can be used from the background
 * service worker, the content script, storage code, the manifest config and
 * unit tests alike. The verified host shapes and their sources are documented
 * in `docs/sap-cpi-hosts.md`; change this file and that table together.
 */

/**
 * SAP BTP Cloud Foundry domain suffixes under which Integration Suite UI hosts
 * live. `hana.ondemand.com` covers every verified region. The China regions
 * (cn20, cn40) use `platform.sapcloud.cn`, but no Integration Suite host on that
 * domain has been verified yet, so it is deliberately not listed (see
 * docs/sap-cpi-hosts.md); add it here when a user reports such a tenant.
 * `config/sap-cpi-urls.ts` derives the manifest match patterns from this list.
 */
export const CPI_UI_DOMAIN_SUFFIXES = ['hana.ondemand.com'] as const;

/**
 * Integration Suite UI hosts:
 * `<subaccount>.integrationsuite[-trial|-cpiNNN].cfapps.<region>[-NNN].<domain>`.
 * - `-trial`: BTP trial accounts (us10, ap21).
 * - `-cpiNNN`: SAP-operated Integration Suite tenants on some landscapes
 *   (e.g. `integrationsuite-cpi033` on `eu10-005`).
 * - `<region>[-NNN]`: region code plus optional extension-landscape suffix
 *   (`eu10-005`, `us21-001`); deliberately `[a-z0-9-]+` so a new landscape does
 *   not silently disable the extension.
 * Anchored on both ends — substring checks like `includes('integrationsuite')`
 * are bypassable. Standalone Cloud Integration (`it-cpiNNN`), runtime hosts
 * (`it-cpiNNN-rt`) and Neo (`-tmn.hci.`) are intentionally rejected.
 */
export const CPI_UI_HOSTNAME_RE = new RegExp(
  `^[a-z0-9-]+\\.integrationsuite(-trial|-cpi[0-9]+)?\\.cfapps\\.[a-z0-9-]+\\.(${CPI_UI_DOMAIN_SUFFIXES.map((d) => d.replace(/\./g, '\\.')).join('|')})$`,
  'i',
);

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

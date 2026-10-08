/**
 * SAP Integration Suite URL patterns for the manifest (`host_permissions` and
 * the content-script `matches`).
 *
 * Why the manifest is broader than the runtime check: Chrome and Firefox match
 * patterns allow a wildcard only as the leading `*.` of the host (it then
 * matches any subdomain depth), so `https://*.integrationsuite.cfapps.*.<domain>/*`
 * is not expressible. The patterns therefore cover one whole BTP domain suffix
 * each; the strict host regex in `features/shared/cpi-url.ts`
 * (`isCpiUiHostname`) is what actually decides whether the content script
 * mounts and whether a URL may be fetched or opened. Both are derived from
 * `CPI_UI_DOMAIN_SUFFIXES`, so a new domain is added in exactly one place.
 * `https:` only — SAP BTP never serves these tenants over plain http.
 *
 * Verified hosts and sources: docs/sap-cpi-hosts.md.
 */
import { CPI_UI_DOMAIN_SUFFIXES } from '../features/shared/cpi-url';

export const SAP_CPI_URL_PATTERNS = CPI_UI_DOMAIN_SUFFIXES.map((domain) => `https://*.${domain}/*`);

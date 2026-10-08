import { isCpiUiHostname } from '@/features/shared/cpi-url';

/**
 * Determine whether a host URL is an Integration Suite tenant (shared anchored
 * host check from features/shared/cpi-url.ts). Neo/Classic tenants need the
 * '/itspaces' prefix.
 *
 * Note: features/shared/navigation.ts (getCpiBaseUrl) applies the same check to
 * window.location (content script only); this function accepts any URL string
 * (works from popup context).
 */
export function isIntegrationSuite(hostUrl: string): boolean {
  const hostname = extractHostname(hostUrl);
  return hostname !== null && isCpiUiHostname(hostname);
}

/**
 * Build a full URL from a tenant host and a link path.
 */
export function buildTenantUrl(hostUrl: string, linkPath: string): string {
  const cleanHost = hostUrl.replace(/\/+$/, '');
  const prefix = isIntegrationSuite(cleanHost) ? '' : '/itspaces';
  const cleanPath = linkPath.startsWith('/') ? linkPath : `/${linkPath}`;
  return `${cleanHost}${prefix}${cleanPath}`;
}

/**
 * Extract the host portion (protocol + hostname) from a full URL.
 * Returns `null` when the input is not a parsable URL (fail closed — callers skip the link).
 */
export function extractHost(fullUrl: string): string | null {
  try {
    const url = new URL(fullUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * Safely extract the hostname from a URL string.
 * Returns `null` when parsing fails (fail closed).
 */
export function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

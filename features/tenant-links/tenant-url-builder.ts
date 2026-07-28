/**
 * Determine whether a host URL is an Integration Suite tenant.
 * Integration Suite URLs contain 'integrationsuite' (or 'integrationsuite-trial').
 * Neo/Classic tenants need the '/itspaces' prefix.
 *
 * Note: Similar logic exists in features/shared/navigation.ts (getCpiBaseUrl).
 * That function uses window.location (content script only).
 * This function accepts any URL string (works from popup context).
 */
export function isIntegrationSuite(hostUrl: string): boolean {
  return /\.integrationsuite(-trial)?\./.test(hostUrl);
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
 */
export function extractHost(fullUrl: string): string {
  try {
    const url = new URL(fullUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return fullUrl;
  }
}

/**
 * Safely extract the hostname from a URL string.
 * Returns the raw input if parsing fails.
 */
export function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

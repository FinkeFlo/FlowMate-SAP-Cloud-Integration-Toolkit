/**
 * Shared fetch client for SAP CPI API calls from content scripts.
 *
 * Centralizes credential handling, CSRF token fetching, timeouts,
 * and common headers so that feature modules don't duplicate this logic.
 */

import { getCpiBaseUrl } from './navigation';
import { SAP_CSRF_ENDPOINT } from './constants';

/** Default timeout for API requests (milliseconds). */
const DEFAULT_TIMEOUT_MS = 15_000;

/** Options for {@link fetchCpi}. */
export interface FetchCpiOptions {
  /** HTTP method. Defaults to 'GET'. */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Additional headers to merge with defaults. */
  headers?: Record<string, string>;
  /** Request body (for POST/PUT). */
  body?: BodyInit;
  /** Timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT_MS}. */
  timeoutMs?: number;
}

/**
 * Fetches a SAP CPI API endpoint with session credentials and standard headers.
 *
 * Features:
 * - Sends `credentials: 'include'` so the browser's SAP session cookies are used
 * - Adds `X-Requested-With: XMLHttpRequest` for CSRF pre-flight
 * - Applies a configurable timeout via AbortController
 * - Throws on non-OK responses with the HTTP status
 *
 * @param url Fully-qualified URL or path relative to the CPI base URL.
 * @param options Additional fetch options.
 * @returns The raw {@link Response} object (caller handles .json() / .text()).
 */
export async function fetchCpi(url: string, options: FetchCpiOptions = {}): Promise<Response> {
  const { method = 'GET', headers = {}, body, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        ...headers,
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches a CSRF token from the SAP CPI user API.
 *
 * The token is required for all write operations (POST/PUT/DELETE).
 *
 * @param baseUrl Optional CPI base URL override. Defaults to {@link getCpiBaseUrl}.
 * @returns The CSRF token string.
 * @throws If the token cannot be obtained.
 */
export async function fetchCsrfToken(baseUrl?: string): Promise<string> {
  const base = baseUrl ?? getCpiBaseUrl();
  const response = await fetchCpi(`${base}${SAP_CSRF_ENDPOINT}`, {
    headers: { 'X-CSRF-Token': 'Fetch' },
  });

  const token = response.headers.get('X-CSRF-Token');
  if (!token) {
    throw new Error('CSRF token header missing from response');
  }
  return token;
}

/**
 * Convenience wrapper: fetches a URL and parses the response as JSON.
 *
 * @param url Fully-qualified URL.
 * @param options Additional fetch options.
 * @returns Parsed JSON body typed as `T`.
 */
export async function fetchCpiJson<T>(url: string, options: FetchCpiOptions = {}): Promise<T> {
  const response = await fetchCpi(url, options);
  return response.json() as Promise<T>;
}

/**
 * Convenience wrapper: fetches a URL and returns the response as text.
 *
 * @param url Fully-qualified URL.
 * @param options Additional fetch options.
 * @returns Response body as a string.
 */
export async function fetchCpiText(url: string, options: FetchCpiOptions = {}): Promise<string> {
  const response = await fetchCpi(url, options);
  return response.text();
}

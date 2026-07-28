/**
 * Fetches per-iFlow daily MPL counts from SAP CPI's resource usage endpoint.
 * Powers the "Top Loggers" view in LogThrottlePanel.
 */

import { devLog } from '@/features/shared/dev-logger';
import { getCpiBaseUrl } from '@/features/shared/navigation';
import { fetchCpiJson } from '@/features/shared/fetch-client';
import { SAP_API_RESOURCE_USAGE } from '@/features/shared/constants';

const LOG_TAG = 'UsageApi';

/** SAP's timezone identifier used by the monitoring UI. */
const TZ = 'Europe/Berlin';

/** Raw response shape from `/api/v1/resourceusage`. */
interface RawUsageResponse {
  type: string;
  'total-available'?: number;
  'resource-usage': Array<{
    context: string;
    value: number;
    timestamp: string;
  }>;
}

/** Parsed usage entry — one row per iFlow. */
export interface UsageEntry {
  /** iFlow symbolic name (matches `artifactSymbolicName` in setMplLogLevel). */
  symbolicName: string;
  /** Message count for the day. */
  count: number;
  /** Day key (YYYY-MM-DD). */
  day: string;
}

/**
 * Returns the start of today in Berlin time as an ISO string suitable for the
 * `from` query parameter. SAP aggregates by Berlin day.
 */
function startOfTodayBerlinIso(now: Date): string {
  // Berlin offset varies (CET/CEST). The endpoint accepts UTC ISO with
  // `timezoneid=Europe/Berlin`, so we send 00:00 of "today" in UTC for simplicity.
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  return utcMidnight.toISOString();
}

/**
 * Parses a raw resource-usage response into sorted UsageEntry rows.
 *
 * - Strips the `mpl:` prefix from `context` to get the symbolic name.
 * - If the response contains multiple days for the same iFlow, sums their counts.
 * - Sorts by count descending.
 * - Drops entries with count <= 0.
 */
export function parseUsage(raw: RawUsageResponse): UsageEntry[] {
  const aggregated = new Map<string, { count: number; day: string }>();

  for (const entry of raw['resource-usage'] ?? []) {
    if (!entry.context.startsWith('mpl:')) continue;
    const symbolicName = entry.context.slice(4);
    if (!symbolicName) continue;

    const day = entry.timestamp.slice(0, 10);
    const existing = aggregated.get(symbolicName);
    if (existing) {
      existing.count += entry.value;
    } else {
      aggregated.set(symbolicName, { count: entry.value, day });
    }
  }

  const rows: UsageEntry[] = [];
  for (const [symbolicName, { count, day }] of aggregated) {
    if (count > 0) rows.push({ symbolicName, count, day });
  }

  rows.sort((a, b) => b.count - a.count);
  return rows;
}

/**
 * Fetches today's MPL counts per iFlow (Berlin time).
 *
 * @returns Sorted list of iFlows by count, descending.
 */
export async function fetchTopLoggers(now: Date = new Date()): Promise<UsageEntry[]> {
  const baseUrl = getCpiBaseUrl();
  const from = startOfTodayBerlinIso(now);
  const to = now.toISOString();

  const url =
    `${baseUrl}${SAP_API_RESOURCE_USAGE}` +
    `?type=mpl-status-all&time=daily` +
    `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` +
    `&timezoneid=${encodeURIComponent(TZ)}`;

  devLog.debug(LOG_TAG, 'Fetching top loggers', { from, to });
  const raw = await fetchCpiJson<RawUsageResponse>(url);
  devLog.response('throttle-usage', JSON.stringify(raw), 'json');

  const rows = parseUsage(raw);
  devLog.info(LOG_TAG, `Loaded ${rows.length} iFlows with activity today`);
  return rows;
}

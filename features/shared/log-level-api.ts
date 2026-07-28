/**
 * Shared API for setting the MPL log level of a deployed iFlow.
 * Used by both trace-mode (INFO/TRACE) and log-throttle (ERROR).
 */

import { devLog } from './dev-logger';
import { getCpiBaseUrl } from './navigation';
import { fetchCpi, fetchCpiText, fetchCsrfToken } from './fetch-client';
import {
  SAP_CMD_SET_LOG_LEVEL,
  SAP_CMD_LIST_ARTIFACTS,
  SAP_CMD_ARTIFACT_DETAIL,
  SAP_RUNTIME_LOCATION_ID,
} from './constants';

const LOG_TAG = 'LogLevelApi';

export type MplLogLevel = 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE';

/**
 * Sets the MPL log level for a deployed iFlow.
 *
 * @param iflowId The symbolic name of the iFlow (matches `artifactSymbolicName`).
 * @param level The target log level.
 */
export async function setMplLogLevel(iflowId: string, level: MplLogLevel): Promise<void> {
  const baseUrl = getCpiBaseUrl();
  const csrfToken = await fetchCsrfToken(baseUrl);

  const setUrl = `${baseUrl}${SAP_CMD_SET_LOG_LEVEL}`;
  await fetchCpi(setUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      artifactSymbolicName: iflowId,
      mplLogLevel: level,
      nodeType: 'IFLMAP',
      runtimeLocationId: SAP_RUNTIME_LOCATION_ID,
    }),
  });

  devLog.info(LOG_TAG, `Log level set to ${level}`, { iflowId });
}

/**
 * Fetches the current MPL log level for a set of deployed iFlows.
 *
 * Strategy: one LIST call to build `symbolicName → artifactId`, then parallel
 * DETAIL calls to read each artifact's `<logConfiguration><logLevel>`.
 *
 * @returns Map keyed by symbolicName. A name maps to its level string if the
 *          fetch succeeded, or `null` if the artifact wasn't found / the detail
 *          fetch failed. Callers that want to ignore unknowns can filter for
 *          truthy values.
 */
export async function fetchLogLevels(symbolicNames: string[]): Promise<Map<string, MplLogLevel | null>> {
  const result = new Map<string, MplLogLevel | null>();
  if (symbolicNames.length === 0) return result;

  const baseUrl = getCpiBaseUrl();

  // 1. List all artifacts to get the symbolicName → id mapping
  const listUrl = `${baseUrl}${SAP_CMD_LIST_ARTIFACTS}?runtimeLocationId=${encodeURIComponent(SAP_RUNTIME_LOCATION_ID)}`;
  const listXml = await fetchCpiText(listUrl);
  const listDoc = new DOMParser().parseFromString(listXml, 'text/xml');
  const idBySymbolicName = new Map<string, string>();
  for (const artifact of Array.from(listDoc.getElementsByTagName('artifactInformations'))) {
    const symbolicName = artifact.querySelector('symbolicName')?.textContent;
    const id = artifact.querySelector('id')?.textContent;
    if (symbolicName && id) idBySymbolicName.set(symbolicName, id);
  }

  // 2. Fetch detail in parallel for each requested name
  const tasks = symbolicNames.map(async (name) => {
    const artifactId = idBySymbolicName.get(name);
    if (!artifactId) {
      result.set(name, null);
      return;
    }
    try {
      const detailUrl = `${baseUrl}${SAP_CMD_ARTIFACT_DETAIL}?artifactId=${encodeURIComponent(artifactId)}&runtimeLocationId=${encodeURIComponent(SAP_RUNTIME_LOCATION_ID)}`;
      const detailXml = await fetchCpiText(detailUrl);
      const detailDoc = new DOMParser().parseFromString(detailXml, 'text/xml');
      const level = detailDoc.querySelector('logConfiguration > logLevel')?.textContent;
      result.set(name, isValidLevel(level) ? level : null);
    } catch (err) {
      devLog.warn(LOG_TAG, 'Failed to fetch logLevel for', { symbolicName: name, error: String(err) });
      result.set(name, null);
    }
  });

  await Promise.all(tasks);
  devLog.info(LOG_TAG, `Fetched log levels for ${result.size} iFlows`);
  return result;
}

function isValidLevel(s: string | null | undefined): s is MplLogLevel {
  return s === 'ERROR' || s === 'INFO' || s === 'DEBUG' || s === 'TRACE';
}

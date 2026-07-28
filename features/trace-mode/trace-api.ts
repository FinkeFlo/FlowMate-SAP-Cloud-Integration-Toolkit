import { devLog } from '@/features/shared/dev-logger';
import { getCpiBaseUrl } from '@/features/shared/navigation';
import { fetchCpiText } from '@/features/shared/fetch-client';
import { setMplLogLevel } from '@/features/shared/log-level-api';
import {
  SAP_CMD_LIST_ARTIFACTS,
  SAP_CMD_ARTIFACT_DETAIL,
  SAP_RUNTIME_LOCATION_ID,
} from '@/features/shared/constants';

const LOG_TAG = 'TraceApi';

export function extractIFlowId(): string | null {
  const match = window.location.pathname.match(/\/integrationflows\/([^/]+)/);
  return match ? match[1] : null;
}

async function getArtifactId(iflowId: string): Promise<string> {
  const baseUrl = getCpiBaseUrl();
  const url = `${baseUrl}${SAP_CMD_LIST_ARTIFACTS}?runtimeLocationId=${encodeURIComponent(SAP_RUNTIME_LOCATION_ID)}`;

  const xml = await fetchCpiText(url);
  devLog.response('trace-list-command', xml, 'xml');

  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const artifacts = doc.getElementsByTagName('artifactInformations');

  for (const artifact of Array.from(artifacts)) {
    const symbolicName = artifact.querySelector('symbolicName')?.textContent;
    if (symbolicName === iflowId) {
      const id = artifact.querySelector('id')?.textContent;
      if (!id) throw new Error(`Artifact found but has no <id> element`);
      devLog.debug(LOG_TAG, 'Artifact found in list', { symbolicName, id });
      return id;
    }
  }

  throw new Error(`Artifact with symbolicName "${iflowId}" not found in list response`);
}

async function getTraceStateFromDetail(artifactId: string): Promise<boolean> {
  const baseUrl = getCpiBaseUrl();
  const url = `${baseUrl}${SAP_CMD_ARTIFACT_DETAIL}?artifactId=${encodeURIComponent(artifactId)}&runtimeLocationId=${encodeURIComponent(SAP_RUNTIME_LOCATION_ID)}`;

  const xml = await fetchCpiText(url);
  devLog.response('trace-detail-command', xml, 'xml');

  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const traceActive = doc.querySelector('logConfiguration > traceActive')?.textContent;
  const logLevel = doc.querySelector('logConfiguration > logLevel')?.textContent;

  devLog.debug(LOG_TAG, 'Detail trace state', { traceActive, logLevel });

  return traceActive === 'true';
}

export async function fetchTraceState(iflowId: string): Promise<boolean> {
  const artifactId = await getArtifactId(iflowId);
  return getTraceStateFromDetail(artifactId);
}

export async function setTraceLevel(iflowId: string, level: 'INFO' | 'TRACE'): Promise<void> {
  return setMplLogLevel(iflowId, level);
}

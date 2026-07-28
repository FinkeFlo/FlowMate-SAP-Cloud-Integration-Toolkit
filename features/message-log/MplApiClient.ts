/**
 * API client for SAP CPI Message Processing Logs.
 * Fetches MPL entries and run details via OData endpoints.
 */

import { devLog } from '@/features/shared/dev-logger';
import { fetchCpiJson, fetchCpiText } from '@/features/shared/fetch-client';
import { SAP_ODATA_MPL, SAP_ODATA_STORE_ENTRIES } from '@/features/shared/constants';
import type {
  MessageProcessingLog,
  MessageProcessingLogDetail,
  MessageStoreEntry,
  MessageStoreProperty,
  MplDetailODataResponse,
  MplODataResponse,
  MplRun,
  MplRunsODataResponse,
  MessageStoreEntriesODataResponse,
  MessageStorePropertiesODataResponse,
} from './mpl-types';

const LOG_TAG = 'MplApi';

export async function fetchMessages(
  baseUrl: string,
  iflowId: string,
  top: number = 10,
): Promise<MessageProcessingLog[]> {
  // Note: Do NOT pre-encode iflowId here. URLSearchParams.toString() will
  // percent-encode all parameter values automatically. Calling
  // encodeURIComponent() first would cause double-encoding.
  const params = new URLSearchParams({
    $filter: `IntegrationFlowName eq '${iflowId}' and Status ne 'DISCARDED'`,
    $top: String(top),
    $format: 'json',
    $orderby: 'LogEnd desc',
    $select: 'Status,LogEnd,LogStart,MessageGuid,LogLevel,AlternateWebLink',
  });

  const url = `${baseUrl}${SAP_ODATA_MPL}?${params}`;
  devLog.debug(LOG_TAG, 'Fetching messages', { iflowId, url });

  const json = await fetchCpiJson<MplODataResponse>(url);
  devLog.debug(LOG_TAG, `Fetched ${json.d.results.length} messages`, { iflowId });
  return json.d.results;
}

export async function fetchRuns(
  baseUrl: string,
  messageGuid: string,
): Promise<MplRun[]> {
  const url = `${baseUrl}${SAP_ODATA_MPL}('${encodeURIComponent(messageGuid)}')/Runs?$format=json`;
  devLog.debug(LOG_TAG, 'Fetching runs', { messageGuid });

  const json = await fetchCpiJson<MplRunsODataResponse>(url);
  devLog.debug(LOG_TAG, `Fetched ${json.d.results.length} runs`, { messageGuid });
  return json.d.results;
}

export async function fetchMessageDetail(
  baseUrl: string,
  guid: string,
): Promise<MessageProcessingLogDetail> {
  const url = `${baseUrl}${SAP_ODATA_MPL}('${encodeURIComponent(guid)}')?$expand=CustomHeaderProperties&$format=json`;
  devLog.debug(LOG_TAG, 'Fetching message detail', { guid });

  const json = await fetchCpiJson<MplDetailODataResponse>(url);
  devLog.debug(LOG_TAG, 'Fetched message detail', { guid });
  return json.d;
}

export async function fetchMessageStoreEntries(
  baseUrl: string,
  guid: string,
): Promise<MessageStoreEntry[]> {
  const url = `${baseUrl}${SAP_ODATA_MPL}('${encodeURIComponent(guid)}')/MessageStoreEntries?$format=json`;
  devLog.debug(LOG_TAG, 'Fetching message store entries', { guid });

  const json = await fetchCpiJson<MessageStoreEntriesODataResponse>(url);
  devLog.debug(LOG_TAG, `Fetched ${json.d.results.length} store entries`, { guid });
  return json.d.results;
}

export async function fetchMessageStoreEntryValue(
  baseUrl: string,
  entryId: string,
): Promise<string> {
  const url = `${baseUrl}${SAP_ODATA_STORE_ENTRIES}('${encodeURIComponent(entryId)}')/$value`;
  devLog.debug(LOG_TAG, 'Fetching store entry value', { entryId });

  const text = await fetchCpiText(url);
  devLog.debug(LOG_TAG, 'Fetched store entry value', { entryId, length: text.length });
  return text;
}

export async function fetchMessageStoreEntryProperties(
  baseUrl: string,
  entryId: string,
): Promise<MessageStoreProperty[]> {
  const url = `${baseUrl}${SAP_ODATA_STORE_ENTRIES}('${encodeURIComponent(entryId)}')/Properties?$format=json`;
  devLog.debug(LOG_TAG, 'Fetching store entry properties', { entryId });

  const json = await fetchCpiJson<MessageStorePropertiesODataResponse>(url);
  devLog.debug(LOG_TAG, `Fetched ${json.d.results.length} store entry properties`, { entryId });
  return json.d.results;
}

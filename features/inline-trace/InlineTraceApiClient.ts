/**
 * API client for SAP CPI Inline Trace data.
 * Fetches RunSteps, TraceMessages, body/properties via OData endpoints.
 */

import { devLog } from '@/features/shared/dev-logger';
import { fetchCpiJson, fetchCpiText } from '@/features/shared/fetch-client';
import {
  SAP_ODATA_RUN_STEPS,
  SAP_ODATA_RUN_STEP_DETAIL,
  SAP_ODATA_TRACE_MESSAGES,
} from '@/features/shared/constants';
import type {
  RunStep,
  RunStepsODataResponse,
  TraceMessage,
  TraceMessagesODataResponse,
  TraceProperty,
  TracePropertiesODataResponse,
  RunStepDetail,
  RunStepDetailODataResponse,
} from './inline-trace-types';

const LOG_TAG = 'InlineTraceApi';

/**
 * Fetch all RunSteps for a given RunId.
 */
export async function fetchRunSteps(
  baseUrl: string,
  runId: string,
  top: number = 500,
): Promise<RunStep[]> {
  const url = `${baseUrl}${SAP_ODATA_RUN_STEPS}('${encodeURIComponent(runId)}')/RunSteps?$format=json&$top=${top}`;
  devLog.debug(LOG_TAG, 'Fetching run steps', { runId, url });

  const json = await fetchCpiJson<RunStepsODataResponse>(url);
  devLog.debug(LOG_TAG, `Fetched ${json.d.results.length} run steps`, { runId });
  return json.d.results;
}

/**
 * Fetch TraceMessages for a specific RunStep (identified by RunId + ChildCount).
 * Returns TraceIds needed for body/property fetches.
 */
export async function fetchTraceMessages(
  baseUrl: string,
  runId: string,
  childCount: number,
): Promise<TraceMessage[]> {
  const url = `${baseUrl}${SAP_ODATA_RUN_STEP_DETAIL}(RunId='${encodeURIComponent(runId)}',ChildCount=${childCount})/TraceMessages?$format=json`;
  devLog.debug(LOG_TAG, 'Fetching trace messages', { runId, childCount });

  const json = await fetchCpiJson<TraceMessagesODataResponse>(url);
  devLog.debug(LOG_TAG, `Fetched ${json.d.results.length} trace messages`, { runId, childCount });
  return json.d.results;
}

/**
 * Fetch the trace message body (payload) as text.
 */
export async function fetchTraceBody(
  baseUrl: string,
  traceId: number,
): Promise<string> {
  const url = `${baseUrl}${SAP_ODATA_TRACE_MESSAGES}(${traceId})/$value`;
  devLog.debug(LOG_TAG, 'Fetching trace body', { traceId });

  const text = await fetchCpiText(url);
  devLog.debug(LOG_TAG, 'Fetched trace body', { traceId, length: text.length });
  return text;
}

/**
 * Fetch Exchange Properties for a trace message.
 */
export async function fetchTraceExchangeProperties(
  baseUrl: string,
  traceId: number,
): Promise<TraceProperty[]> {
  const url = `${baseUrl}${SAP_ODATA_TRACE_MESSAGES}(${traceId})/ExchangeProperties?$format=json`;
  devLog.debug(LOG_TAG, 'Fetching trace exchange properties', { traceId });

  const json = await fetchCpiJson<TracePropertiesODataResponse>(url);
  devLog.debug(LOG_TAG, `Fetched ${json.d.results.length} exchange properties`, { traceId });
  return json.d.results;
}

/**
 * Fetch Message Headers for a trace message.
 */
export async function fetchTraceHeaders(
  baseUrl: string,
  traceId: number,
): Promise<TraceProperty[]> {
  const url = `${baseUrl}${SAP_ODATA_TRACE_MESSAGES}(${traceId})/Properties?$format=json`;
  devLog.debug(LOG_TAG, 'Fetching trace headers', { traceId });

  const json = await fetchCpiJson<TracePropertiesODataResponse>(url);
  devLog.debug(LOG_TAG, `Fetched ${json.d.results.length} headers`, { traceId });
  return json.d.results;
}

/**
 * Fetch a single RunStep detail with expanded RunStepProperties.
 */
export async function fetchRunStepDetail(
  baseUrl: string,
  runId: string,
  childCount: number,
): Promise<RunStepDetail> {
  const url = `${baseUrl}${SAP_ODATA_RUN_STEP_DETAIL}(RunId='${encodeURIComponent(runId)}',ChildCount=${childCount})?$expand=RunStepProperties&$format=json`;
  devLog.debug(LOG_TAG, 'Fetching run step detail', { runId, childCount });

  const json = await fetchCpiJson<RunStepDetailODataResponse>(url);
  devLog.debug(LOG_TAG, 'Fetched run step detail', { runId, childCount });
  return json.d;
}

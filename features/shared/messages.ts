/**
 * Typed Message Protocol for Content <-> Background communication.
 *
 * All communication between content scripts and the background service worker
 * flows through this typed protocol. Use {@link sendTypedMessage} from content
 * scripts for type-safe request/response handling.
 */

import { browser } from 'wxt/browser';
import type { DayData } from './api-client';

// ---------------------------------------------------------------------------
// Message type constants
// ---------------------------------------------------------------------------

export const MSG_FETCH_DATE_RANGE = 'FETCH_DATE_RANGE' as const;
export const MSG_FETCH_SPECIFIC_DATE = 'FETCH_SPECIFIC_DATE' as const;
export const MSG_OPEN_TENANT_TABS = 'OPEN_TENANT_TABS' as const;
export const MSG_CANCEL_EXPORT = 'CANCEL_EXPORT' as const;

// ---------------------------------------------------------------------------
// Response envelope
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// Message interfaces
// ---------------------------------------------------------------------------

export interface FetchDateRangeMessage {
  type: typeof MSG_FETCH_DATE_RANGE;
  data: {
    baseUrl: string;
    startDate: string;
    endDate: string;
  };
}

export interface FetchSpecificDateMessage {
  type: typeof MSG_FETCH_SPECIFIC_DATE;
  data: {
    baseUrl: string;
    date: string;
  };
}

export interface OpenTenantTabsMessage {
  type: typeof MSG_OPEN_TENANT_TABS;
  urls: string[];
}

export interface CancelExportMessage {
  type: typeof MSG_CANCEL_EXPORT;
}

export type ExtensionMessage =
  | FetchDateRangeMessage
  | FetchSpecificDateMessage
  | OpenTenantTabsMessage
  | CancelExportMessage;

// ---------------------------------------------------------------------------
// Response type mapping: message type -> response data type
// ---------------------------------------------------------------------------

/**
 * Maps each message type constant to the data type returned in the
 * {@link ApiResponse} envelope. This enables type-safe sendMessage calls.
 */
export interface MessageResponseMap {
  [MSG_FETCH_DATE_RANGE]: string[];
  [MSG_FETCH_SPECIFIC_DATE]: DayData;
  [MSG_OPEN_TENANT_TABS]: void;
  [MSG_CANCEL_EXPORT]: void;
}

// ---------------------------------------------------------------------------
// Typed sendMessage helper
// ---------------------------------------------------------------------------

/**
 * Sends a typed message to the background service worker and returns the
 * unwrapped response data.
 *
 * @param message The message to send (must be a valid {@link ExtensionMessage}).
 * @returns The response data, typed according to {@link MessageResponseMap}.
 * @throws If the background responds with `success: false`.
 *
 * @example
 * ```ts
 * const dates = await sendTypedMessage({
 *   type: MSG_FETCH_DATE_RANGE,
 *   data: { baseUrl, startDate, endDate },
 * });
 * // `dates` is typed as `string[]`
 * ```
 */
export async function sendTypedMessage<M extends ExtensionMessage>(
  message: M,
): Promise<MessageResponseMap[M['type']]> {
  const response: ApiResponse<MessageResponseMap[M['type']]> =
    await browser.runtime.sendMessage(message);

  if (!response.success) {
    throw new Error(response.error || `Message ${message.type} failed`);
  }

  return response.data as MessageResponseMap[M['type']];
}

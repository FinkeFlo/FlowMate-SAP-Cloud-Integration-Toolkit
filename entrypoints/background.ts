import {
  MSG_FETCH_DATE_RANGE,
  MSG_FETCH_SPECIFIC_DATE,
  MSG_OPEN_TENANT_TABS,
  MSG_CANCEL_EXPORT,
  type ApiResponse,
  type ExtensionMessage,
} from '@/features/shared/messages';
import type { DayData } from '@/features/shared/api-client';

const FETCH_TIMEOUT_MS = 30_000;

/** Shape of the date-range API response from SAP CPI Metering. */
interface DateRangeApiResponse {
  dateRangeDetails: Array<{ source_dt: string }>;
}

export default defineBackground(() => {
  console.log('FlowMate Background Service Started', { id: browser.runtime.id });

  browser.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    switch (message.type) {
      case MSG_FETCH_DATE_RANGE:
        handleFetchDateRange(message.data, sendResponse);
        return true;

      case MSG_FETCH_SPECIFIC_DATE:
        handleFetchSpecificDate(message.data, sendResponse);
        return true;

      case MSG_OPEN_TENANT_TABS:
        handleOpenTenantTabs(message.urls, sendResponse);
        return true;

      case MSG_CANCEL_EXPORT:
        sendResponse({ success: true });
        return false;

      default:
        console.warn('Unknown message type:', (message as Record<string, unknown>).type);
        return false;
    }
  });
});

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function handleFetchDateRange(
  data: { baseUrl: string; startDate: string; endDate: string },
  sendResponse: (response: ApiResponse<string[]>) => void,
) {
  try {
    const params = new URLSearchParams({
      startDate: data.startDate,
      endDate: data.endDate,
      runtimeLocationId: 'cloudintegration',
    });
    const url = `${data.baseUrl}/rest/api/v1/metering/usage/date-range?${params}`;

    const response = await fetchWithTimeout(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json: DateRangeApiResponse = await response.json();
    const dates: string[] = (json.dateRangeDetails || []).map(d => d.source_dt);

    sendResponse({ success: true, data: dates });
  } catch (error) {
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleFetchSpecificDate(
  data: { baseUrl: string; date: string },
  sendResponse: (response: ApiResponse<DayData>) => void,
) {
  try {
    const params = new URLSearchParams({
      date: data.date,
      download: 'false',
      runtimeLocationId: 'cloudintegration',
    });
    const url = `${data.baseUrl}/rest/api/v1/metering/usage/specific-date?${params}`;

    const response = await fetchWithTimeout(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json: DayData[] = await response.json();
    // API returns array -- guard against empty arrays (Bug #3)
    const dayData = Array.isArray(json) && json.length > 0 ? json[0] : null;

    if (!dayData) {
      throw new Error(`No data returned for ${data.date}`);
    }

    sendResponse({ success: true, data: dayData });
  } catch (error) {
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleOpenTenantTabs(urls: string[], sendResponse: (response: ApiResponse<void>) => void) {
  try {
    const tabs = await Promise.all(
      urls.map(url => browser.tabs.create({ url, active: false })),
    );

    // Poll until all tabs are complete (max 15s)
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const states = await Promise.all(
        tabs
          .filter(t => t.id !== undefined)
          .map(t => browser.tabs.get(t.id!)),
      );
      if (states.every(t => t.status === 'complete')) break;
      await new Promise(r => setTimeout(r, 500));
    }

    // Close all tabs
    await Promise.all(
      tabs.filter(t => t.id !== undefined).map(t => browser.tabs.remove(t.id!)),
    );

    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: String(error) });
  }
}

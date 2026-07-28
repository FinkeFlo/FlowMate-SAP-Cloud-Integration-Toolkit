/**
 * SAP CPI API Client
 * Routes all API calls through the background script via messaging.
 */

import {
  MSG_FETCH_DATE_RANGE,
  MSG_FETCH_SPECIFIC_DATE,
  sendTypedMessage,
} from './messages';

export interface MessageDetail {
  iFlowId: string;
  totalMsg: number;
  chargeableMsg: number;
  sap2sapMsg: number;
  recordCount: number;
  mplCount: number;
  iFlowName: string;
  loop: boolean;
  enrich: boolean;
  sap2sap: boolean;
  splitter: boolean;
  retryEnabled: boolean;
  originalContent: boolean;
  artifactId?: string;
}

export interface DayData {
  source_dt: string;
  message_details: {
    artifactDetails: MessageDetail[];
  };
}

export interface FetchAllResult {
  data: DayData[];
  failedDates: string[];
}

export class CPIApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || window.location.origin;
  }

  async getDateRange(startDate: string, endDate: string): Promise<string[]> {
    return sendTypedMessage({
      type: MSG_FETCH_DATE_RANGE,
      data: { baseUrl: this.baseUrl, startDate, endDate },
    });
  }

  async getSpecificDate(date: string): Promise<DayData> {
    const data = await sendTypedMessage({
      type: MSG_FETCH_SPECIFIC_DATE,
      data: { baseUrl: this.baseUrl, date },
    });

    if (!data) {
      throw new Error(`No data returned for ${date}`);
    }

    return data;
  }

  async fetchAllData(
    startDate: string,
    endDate: string,
    onProgress?: (current: number, total: number) => void,
    signal?: AbortSignal,
  ): Promise<FetchAllResult> {
    const availableDates = await this.getDateRange(startDate, endDate);
    const total = availableDates.length;

    const dayData: DayData[] = [];
    const failedDates: string[] = [];

    for (let i = 0; i < availableDates.length; i++) {
      if (signal?.aborted) {
        break;
      }

      const date = availableDates[i]!;
      try {
        const data = await this.getSpecificDate(date);
        dayData.push(data);
      } catch (error) {
        console.error(`Failed to fetch ${date}:`, error);
        failedDates.push(date);
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    return { data: dayData, failedDates };
  }
}

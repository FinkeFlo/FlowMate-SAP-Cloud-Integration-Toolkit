/**
 * CSV Exporter for SAP CPI Message Usage Data
 */

import type { DayData, MessageDetail } from '@/features/shared/api-client';
import { showToast } from '@/features/shared/toast';

interface AggregatedData {
  tenantId: string;
  source_dt: string;
  iFlowId: string;
  totalMsg: number;
  chargeableMsg: number;
  sap2sapMsg: number;
  recordCount: number;
  mplCount: number;
  loop: boolean;
  enrich: boolean;
  sap2sap: boolean;
  splitter: boolean;
  iFlowName: string;
  retryEnabled: boolean;
  originalContent: boolean;
}

export class CSVExporter {
  private aggregateData(tenantId: string, dayData: DayData[]): AggregatedData[] {
    const summed: Map<string, AggregatedData> = new Map();

    for (const day of dayData) {
      const artifacts = day.message_details?.artifactDetails || [];

      for (const artifact of artifacts) {
        const key = `${tenantId}|${day.source_dt}|${artifact.iFlowId}`;

        if (!summed.has(key)) {
          summed.set(key, {
            tenantId,
            source_dt: day.source_dt,
            iFlowId: artifact.iFlowId,
            totalMsg: artifact.totalMsg,
            chargeableMsg: artifact.chargeableMsg,
            sap2sapMsg: artifact.sap2sapMsg,
            recordCount: artifact.recordCount,
            mplCount: artifact.mplCount,
            loop: artifact.loop,
            enrich: artifact.enrich,
            sap2sap: artifact.sap2sap,
            splitter: artifact.splitter,
            iFlowName: artifact.iFlowName,
            retryEnabled: artifact.retryEnabled,
            originalContent: artifact.originalContent
          });
        } else {
          const existing = summed.get(key)!;
          existing.totalMsg += artifact.totalMsg;
          existing.chargeableMsg += artifact.chargeableMsg;
          existing.sap2sapMsg += artifact.sap2sapMsg;
          existing.recordCount += artifact.recordCount;
          existing.mplCount += artifact.mplCount;
        }
      }
    }

    return Array.from(summed.values());
  }

  private escapeField(value: unknown): string {
    const str = String(value);
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  toCSV(dayData: DayData[], tenantId?: string): string {
    const id = tenantId || window.location.hostname;
    const aggregated = this.aggregateData(id, dayData);

    const header = [
      'tenantId', 'source_dt', 'iFlowId', 'totalMsg', 'chargeableMsg',
      'sap2sapMsg', 'recordCount', 'mplCount', 'loop', 'enrich',
      'sap2sap', 'splitter', 'iFlowName', 'retryEnabled', 'originalContent'
    ];

    const rows = aggregated.map(row => [
      row.tenantId,
      row.source_dt,
      row.iFlowId,
      row.totalMsg,
      row.chargeableMsg,
      row.sap2sapMsg,
      row.recordCount,
      row.mplCount,
      row.loop,
      row.enrich,
      row.sap2sap,
      row.splitter,
      row.iFlowName,
      row.retryEnabled,
      row.originalContent
    ].map(v => this.escapeField(v)));

    return [
      header.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
  }

  downloadCSV(csvContent: string, startDate: string, endDate: string, filePrefix?: string): void {
    const tenant = filePrefix || window.location.hostname.split('.')[0];

    const formattedStart = startDate.split('T')[0];
    const formattedEnd = endDate.split('T')[0];

    const filename = `${tenant}_${formattedStart}_${formattedEnd}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Downloaded: ${filename}`, 'success');
  }

  export(dayData: DayData[], startDate: string, endDate: string, filePrefix?: string, tenantId?: string): void {
    const csvContent = this.toCSV(dayData, tenantId);
    this.downloadCSV(csvContent, startDate, endDate, filePrefix);
  }
}

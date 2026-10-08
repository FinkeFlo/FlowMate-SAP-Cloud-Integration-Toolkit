import { describe, expect, it, vi } from 'vitest';
import type { DayData, MessageDetail } from '@/features/shared/api-client';

vi.mock('@/features/shared/toast', () => ({ showToast: vi.fn() }));
vi.mock('@/features/shared/i18n', () => ({ t: (k: string) => k, tSub: (k: string, v: string) => `${k}:${v}` }));

import { CSVExporter } from './csv-exporter';

function artifact(overrides: Partial<MessageDetail> = {}): MessageDetail {
  return {
    iFlowId: 'OrderToCash',
    iFlowName: 'Order to Cash',
    totalMsg: 10,
    chargeableMsg: 8,
    sap2sapMsg: 2,
    recordCount: 1,
    mplCount: 10,
    loop: false,
    enrich: false,
    sap2sap: true,
    splitter: false,
    retryEnabled: true,
    originalContent: false,
    ...overrides,
  };
}

function day(source_dt: string, artifacts: MessageDetail[]): DayData {
  return { source_dt, message_details: { artifactDetails: artifacts } };
}

const TENANT = 'acme-dev';

describe('CSVExporter.toCSV', () => {
  it('writes a semicolon-separated header and one row per tenant/day/iFlow', () => {
    const csv = new CSVExporter().toCSV([day('2026-01-01', [artifact()])], TENANT);
    const [header, row, ...rest] = csv.split('\n');

    expect(header).toBe(
      'tenantId;source_dt;iFlowId;totalMsg;chargeableMsg;sap2sapMsg;recordCount;mplCount;loop;enrich;sap2sap;splitter;iFlowName;retryEnabled;originalContent',
    );
    expect(row).toBe('acme-dev;2026-01-01;OrderToCash;10;8;2;1;10;false;false;true;false;Order to Cash;true;false');
    expect(rest).toEqual([]);
  });

  it('sums numeric columns when the same iFlow appears twice on the same day', () => {
    const data = [day('2026-01-01', [artifact({ totalMsg: 3, chargeableMsg: 1 }), artifact({ totalMsg: 4, chargeableMsg: 2 })])];
    const row = new CSVExporter().toCSV(data, TENANT).split('\n')[1];

    expect(row?.split(';').slice(3, 5)).toEqual(['7', '3']);
  });

  it('keeps different days as separate rows', () => {
    const data = [day('2026-01-01', [artifact()]), day('2026-01-02', [artifact()])];
    const lines = new CSVExporter().toCSV(data, TENANT).split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[1]?.startsWith('acme-dev;2026-01-01;')).toBe(true);
    expect(lines[2]?.startsWith('acme-dev;2026-01-02;')).toBe(true);
  });

  it('quotes fields containing separators, quotes or line breaks', () => {
    const data = [day('2026-01-01', [artifact({ iFlowName: 'Order; "Cash"\nFlow' })])];
    const row = new CSVExporter().toCSV(data, TENANT).split('\n');

    // The embedded newline splits the raw string; re-join to inspect the quoted field.
    expect(row.slice(1).join('\n')).toContain('"Order; ""Cash""\nFlow"');
  });

  it('handles days without artifact details', () => {
    const data = [{ source_dt: '2026-01-01', message_details: { artifactDetails: [] } }];
    expect(new CSVExporter().toCSV(data, TENANT).split('\n')).toHaveLength(1);
  });
});

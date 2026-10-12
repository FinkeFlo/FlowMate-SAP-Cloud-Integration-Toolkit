import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchCpiJson = vi.fn();
vi.mock('@/features/shared/fetch-client', () => ({
  fetchCpiJson: (url: string) => fetchCpiJson(url),
  fetchCpiText: vi.fn(),
}));
vi.mock('@/features/shared/dev-logger', () => ({
  devLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { fetchMessageDetail, fetchMessages } from './MplApiClient';

const BASE = 'https://acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com';

beforeEach(() => {
  fetchCpiJson.mockReset();
  fetchCpiJson.mockResolvedValue({ d: { results: [] } });
});

describe('fetchMessages', () => {
  it('filters by the iFlow id', async () => {
    await fetchMessages(BASE, 'Acme_Order_Inbound', 25);
    const url = new URL(fetchCpiJson.mock.calls[0]![0] as string);
    expect(url.searchParams.get('$filter')).toBe("IntegrationFlowName eq 'Acme_Order_Inbound' and Status ne 'DISCARDED'");
    expect(url.searchParams.get('$top')).toBe('25');
  });

  it('keeps a quote in the iFlow id inside the string literal', async () => {
    // Regression: the id comes from the page URL, where `'` is not encoded,
    // and could end the literal and append its own filter conditions.
    await fetchMessages(BASE, "Acme' or Status eq 'FAILED");
    const url = new URL(fetchCpiJson.mock.calls[0]![0] as string);
    expect(url.searchParams.get('$filter')).toBe(
      "IntegrationFlowName eq 'Acme'' or Status eq ''FAILED' and Status ne 'DISCARDED'",
    );
  });
});

describe('fetchMessageDetail', () => {
  it('escapes the key literal of the entity', async () => {
    fetchCpiJson.mockResolvedValue({ d: {} });
    await fetchMessageDetail(BASE, "AGa1'b2");
    expect(fetchCpiJson.mock.calls[0]![0]).toBe(
      `${BASE}/odata/api/v1/MessageProcessingLogs('AGa1''b2')?$expand=CustomHeaderProperties&$format=json`,
    );
  });
});

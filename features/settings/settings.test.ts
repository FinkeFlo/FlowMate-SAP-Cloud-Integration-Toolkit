import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('wxt/browser', () => ({ browser: { storage: { local: storage } } }));

import { addTenant, sanitizeSettings, updateTenant, type Settings } from './settings';

const GOOD = 'https://acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com';

function stored(): Settings {
  return { customers: [{ id: 'c1', name: 'Acme Corp', tenants: [{ id: 't1', name: 'DEV', url: GOOD, enabled: true }] }] };
}

beforeEach(() => {
  storage.get.mockReset().mockResolvedValue({ 'cpi-settings': stored() });
  storage.set.mockReset().mockResolvedValue(undefined);
});

describe('sanitizeSettings', () => {
  it('keeps valid tenants and drops invalid ones (fail closed)', () => {
    const input: Settings = {
      customers: [
        {
          id: 'c1',
          name: 'Acme Corp',
          tenants: [
            { id: 't1', name: 'DEV', url: GOOD, enabled: true },
            { id: 't2', name: 'HTTP', url: 'http://acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com', enabled: true },
            { id: 't3', name: 'JS', url: 'javascript:alert(1)', enabled: true },
            { id: 't4', name: 'Other', url: 'https://example.com', enabled: true },
            { id: 't5', name: 'Null', url: null as unknown as string, enabled: true },
          ],
        },
      ],
    };
    const result = sanitizeSettings(input);
    expect(result.customers[0]?.tenants.map(t => t.id)).toEqual(['t1']);
  });

  it('tolerates missing arrays from older storage shapes', () => {
    expect(sanitizeSettings({ customers: undefined as unknown as Settings['customers'] })).toEqual({ customers: [] });
  });
});

describe('addTenant / updateTenant (storage-layer validation, audit S2)', () => {
  it('rejects a non-CPI URL on add and does not write', async () => {
    await expect(addTenant('c1', 'Evil', 'https://example.com')).rejects.toThrow(/Invalid tenant URL/);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('rejects an http URL on update and does not write', async () => {
    await expect(
      updateTenant('c1', 't1', { url: 'http://acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com' }),
    ).rejects.toThrow(/Invalid tenant URL/);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('accepts a valid URL and persists it', async () => {
    const tenant = await addTenant('c1', 'QAS', `${GOOD}/shell/design`);
    expect(tenant.url).toBe(`${GOOD}/shell/design`);
    expect(storage.set).toHaveBeenCalledTimes(1);
  });
});

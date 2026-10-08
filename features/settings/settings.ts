/**
 * Settings Management
 * Manages customer configurations with multiple tenants.
 *
 * All data is persisted in `browser.storage.local` under the
 * {@link STORAGE_KEY} key as a JSON-serializable {@link Settings} object.
 */
import { browser } from 'wxt/browser';
import { isCpiUrl } from '@/features/shared/cpi-url';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Tenant {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface Customer {
  id: string;
  name: string;
  tenants: Tenant[];
}

export interface Settings {
  customers: Customer[];
}

// ---------------------------------------------------------------------------
// Storage key & helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'cpi-settings';

/** Type-safe wrapper: the shape stored under {@link STORAGE_KEY}. */
interface StorageSchema {
  [STORAGE_KEY]?: Settings;
}

/** Default (empty) settings object. */
const DEFAULT_SETTINGS: Settings = { customers: [] };

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Get all settings from storage.
 */
export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get(STORAGE_KEY) as StorageSchema;
  return sanitizeSettings(result[STORAGE_KEY] ?? DEFAULT_SETTINGS);
}

/**
 * Storage is a trust boundary: drop tenants whose URL is not an https
 * Integration Suite URL (manual storage edits, future imports). Fail closed.
 */
export function sanitizeSettings(settings: Settings): Settings {
  let dropped = 0;
  const customers = (settings.customers ?? []).map(customer => {
    const tenants = (customer.tenants ?? []).filter(tenant => typeof tenant?.url === 'string' && isCpiUrl(tenant.url));
    dropped += (customer.tenants?.length ?? 0) - tenants.length;
    return { ...customer, tenants };
  });
  if (dropped > 0) {
    console.warn(`FlowMate: dropped ${dropped} tenant(s) with an invalid URL from settings`);
  }
  return { customers };
}

function assertCpiUrl(url: string): void {
  if (!isCpiUrl(url)) {
    throw new Error('Invalid tenant URL: must be an https Integration Suite URL');
  }
}

/**
 * Save settings to storage.
 */
export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: settings } satisfies StorageSchema);
}

/**
 * Add a new customer.
 */
export async function addCustomer(name: string): Promise<Customer> {
  const settings = await getSettings();
  const customer: Customer = {
    id: `customer-${Date.now()}`,
    name,
    tenants: [],
  };
  settings.customers.push(customer);
  await saveSettings(settings);
  return customer;
}

/**
 * Update a customer.
 */
export async function updateCustomer(customerId: string, updates: Partial<Customer>): Promise<void> {
  const settings = await getSettings();
  const customer = settings.customers.find(c => c.id === customerId);
  if (customer) {
    Object.assign(customer, updates);
    await saveSettings(settings);
  }
}

/**
 * Delete a customer.
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  const settings = await getSettings();
  settings.customers = settings.customers.filter(c => c.id !== customerId);
  await saveSettings(settings);
}

/**
 * Add a tenant to a customer.
 */
export async function addTenant(customerId: string, name: string, url: string): Promise<Tenant> {
  const settings = await getSettings();
  const customer = settings.customers.find(c => c.id === customerId);

  if (!customer) {
    throw new Error('Customer not found');
  }

  assertCpiUrl(url);

  const tenant: Tenant = {
    id: `tenant-${Date.now()}`,
    name,
    url,
    enabled: true,
  };

  customer.tenants.push(tenant);
  await saveSettings(settings);
  return tenant;
}

/**
 * Update a tenant.
 */
export async function updateTenant(
  customerId: string,
  tenantId: string,
  updates: Partial<Tenant>,
): Promise<void> {
  const settings = await getSettings();
  const customer = settings.customers.find(c => c.id === customerId);

  if (!customer) {
    throw new Error('Customer not found');
  }

  const tenant = customer.tenants.find(t => t.id === tenantId);
  if (tenant) {
    if (updates.url !== undefined) assertCpiUrl(updates.url);
    Object.assign(tenant, updates);
    await saveSettings(settings);
  }
}

/**
 * Delete a tenant.
 */
export async function deleteTenant(customerId: string, tenantId: string): Promise<void> {
  const settings = await getSettings();
  const customer = settings.customers.find(c => c.id === customerId);

  if (!customer) {
    throw new Error('Customer not found');
  }

  customer.tenants = customer.tenants.filter(t => t.id !== tenantId);
  await saveSettings(settings);
}


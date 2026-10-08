import { describe, expect, it } from 'vitest';
import { buildTenantUrl, extractHost, extractHostname, isIntegrationSuite } from './tenant-url-builder';

const IS_HOST = 'https://acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com';
const TRIAL_HOST = 'https://acme-trial.integrationsuite-trial.cfapps.us10.hana.ondemand.com';
const NEO_HOST = 'https://acme-tmn.hci.eu1.hana.ondemand.com';

describe('isIntegrationSuite', () => {
  it('detects Integration Suite and trial hosts', () => {
    expect(isIntegrationSuite(IS_HOST)).toBe(true);
    expect(isIntegrationSuite(TRIAL_HOST)).toBe(true);
  });

  it('does not match Neo/Classic hosts', () => {
    expect(isIntegrationSuite(NEO_HOST)).toBe(false);
  });
});

describe('buildTenantUrl', () => {
  it('appends the path directly for Integration Suite', () => {
    expect(buildTenantUrl(IS_HOST, '/shell/monitoring/Messages')).toBe(`${IS_HOST}/shell/monitoring/Messages`);
  });

  it('adds the /itspaces prefix for Neo tenants', () => {
    expect(buildTenantUrl(NEO_HOST, 'shell/monitoring')).toBe(`${NEO_HOST}/itspaces/shell/monitoring`);
  });

  it('normalises trailing slashes on the host and missing leading slash on the path', () => {
    expect(buildTenantUrl(`${IS_HOST}///`, 'shell/design')).toBe(`${IS_HOST}/shell/design`);
  });
});

describe('extractHost / extractHostname', () => {
  it('returns protocol + host for a full URL', () => {
    expect(extractHost(`${IS_HOST}/shell/design?x=1#frag`)).toBe(IS_HOST);
    expect(extractHostname(`${IS_HOST}/shell`)).toBe('acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com');
  });

  it('currently returns the raw input when parsing fails (fail-open, tracked as a security issue)', () => {
    // Documents present behaviour so a future fail-closed change updates this test deliberately.
    expect(extractHost('not a url')).toBe('not a url');
    expect(extractHostname('not a url')).toBe('not a url');
  });
});

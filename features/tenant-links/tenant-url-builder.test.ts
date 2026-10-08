import { describe, expect, it } from 'vitest';
import { buildTenantUrl, extractHost, extractHostname, isIntegrationSuite } from './tenant-url-builder';

const IS_HOST = 'https://acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com';
const TRIAL_HOST = 'https://acme-trial.integrationsuite-trial.cfapps.us10.hana.ondemand.com';
const NEO_HOST = 'https://acme-tmn.hci.eu1.hana.ondemand.com';
const CPI_NNN_HOST = 'https://acme-dev.integrationsuite-cpi033.cfapps.eu10-005.hana.ondemand.com';

describe('isIntegrationSuite', () => {
  it('detects Integration Suite and trial hosts', () => {
    expect(isIntegrationSuite(IS_HOST)).toBe(true);
    expect(isIntegrationSuite(TRIAL_HOST)).toBe(true);
  });

  it('detects integrationsuite-cpiNNN hosts (regression: these got the /itspaces prefix)', () => {
    expect(isIntegrationSuite(CPI_NNN_HOST)).toBe(true);
    expect(buildTenantUrl(CPI_NNN_HOST, '/shell/design')).toBe(`${CPI_NNN_HOST}/shell/design`);
  });

  it('does not match Neo/Classic, standalone CF Cloud Integration or unparsable hosts', () => {
    expect(isIntegrationSuite(NEO_HOST)).toBe(false);
    expect(isIntegrationSuite('https://acme-dev.it-cpi001.cfapps.eu10.hana.ondemand.com')).toBe(false);
    expect(isIntegrationSuite('acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com')).toBe(false);
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

  it('returns null when parsing fails (fail closed, audit S6)', () => {
    expect(extractHost('not a url')).toBeNull();
    expect(extractHostname('not a url')).toBeNull();
    expect(extractHost('')).toBeNull();
  });
});

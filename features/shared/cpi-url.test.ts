import { describe, expect, it } from 'vitest';
import { isCpiUiHostname, isCpiUrl, toCpiOrigin } from './cpi-url';

const UI = 'https://acme-dev.integrationsuite.cfapps.eu10-003.hana.ondemand.com';
const TRIAL = 'https://acme.integrationsuite-trial.cfapps.us10.hana.ondemand.com';

describe('isCpiUiHostname', () => {
  it('accepts Integration Suite and trial UI hosts', () => {
    expect(isCpiUiHostname('acme-dev.integrationsuite.cfapps.eu10-003.hana.ondemand.com')).toBe(true);
    expect(isCpiUiHostname('acme.integrationsuite-trial.cfapps.us10.hana.ondemand.com')).toBe(true);
    expect(isCpiUiHostname('ACME.IntegrationSuite.cfapps.EU10.hana.ondemand.com')).toBe(true);
  });

  it('rejects substring look-alikes and other SAP hosts', () => {
    expect(isCpiUiHostname('integrationsuite-x.hana.ondemand.com')).toBe(false);
    expect(isCpiUiHostname('foo.integrationsuite.hana.ondemand.com')).toBe(false);
    expect(isCpiUiHostname('acme.it-cpi999.cfapps.eu10.hana.ondemand.com')).toBe(false);
    expect(isCpiUiHostname('acme.integrationsuite.cfapps.eu10.hana.ondemand.com.attacker.example')).toBe(false);
    expect(isCpiUiHostname('attacker.example/acme.integrationsuite.cfapps.eu10.hana.ondemand.com')).toBe(false);
    expect(isCpiUiHostname('')).toBe(false);
  });
});

describe('toCpiOrigin', () => {
  it('returns the https origin for UI URLs with any path or query', () => {
    expect(toCpiOrigin(`${UI}/shell/monitoring/MessageUsage?x=1#frag`)).toBe(UI);
    expect(toCpiOrigin(TRIAL)).toBe(TRIAL);
    expect(toCpiOrigin(`${UI}:443/x`)).toBe(UI);
  });

  it('fails closed for http, credentials, other hosts and garbage', () => {
    expect(toCpiOrigin('http://acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com')).toBeNull();
    expect(toCpiOrigin('https://user:pw@acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com')).toBeNull();
    expect(toCpiOrigin('https://attacker.example/?u=acme.integrationsuite.cfapps.eu10.hana.ondemand.com')).toBeNull();
    expect(toCpiOrigin('javascript:alert(1)')).toBeNull();
    expect(toCpiOrigin('not a url')).toBeNull();
    expect(toCpiOrigin(`${UI}:8443/x`)).toBeNull();
    expect(toCpiOrigin(`${UI}./x`)).toBeNull();
    expect(toCpiOrigin(`${UI}@attacker.example/`)).toBeNull();
    expect(toCpiOrigin('https://attacker.example\\@acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com/')).toBeNull();
    expect(toCpiOrigin('')).toBeNull();
  });
});

describe('isCpiUrl', () => {
  it('mirrors toCpiOrigin', () => {
    expect(isCpiUrl(`${UI}/x`)).toBe(true);
    expect(isCpiUrl('https://example.com')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { SAP_CPI_URL_PATTERNS } from '@/config/sap-cpi-urls';
import { CPI_UI_DOMAIN_SUFFIXES, CPI_UI_HOSTNAME_RE, isCpiUiHostname, isCpiUrl, toCpiOrigin } from './cpi-url';

const UI = 'https://acme-dev.integrationsuite.cfapps.eu10-003.hana.ondemand.com';
const TRIAL = 'https://acme.integrationsuite-trial.cfapps.us10.hana.ondemand.com';

/** One row per verified host shape in docs/sap-cpi-hosts.md (dummy subaccounts only). */
const VERIFIED_UI_HOSTS = [
  // plain region codes across all providers (AWS, Azure, GCP, SAP Cloud Infrastructure)
  'acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com',
  'acme-dev.integrationsuite.cfapps.us20.hana.ondemand.com',
  'acme-dev.integrationsuite.cfapps.jp31.hana.ondemand.com',
  'acme-dev.integrationsuite.cfapps.ae01.hana.ondemand.com',
  'acme-dev.integrationsuite.cfapps.eu01.hana.ondemand.com',
  // extension landscapes <region>-NNN
  'acme-dev.integrationsuite.cfapps.eu10-003.hana.ondemand.com',
  'acme-dev.integrationsuite.cfapps.eu10-005.hana.ondemand.com',
  'acme-dev.integrationsuite.cfapps.us10-001.hana.ondemand.com',
  'acme-dev.integrationsuite.cfapps.us21-001.hana.ondemand.com',
  // SAP-operated integrationsuite-cpiNNN tenants
  'acme-dev.integrationsuite-cpi033.cfapps.eu10-005.hana.ondemand.com',
  'acme-dev.integrationsuite-cpi035.cfapps.eu20-001.hana.ondemand.com',
  // trial (us10, ap21)
  'acme.integrationsuite-trial.cfapps.us10.hana.ondemand.com',
  'acme.integrationsuite-trial.cfapps.ap21.hana.ondemand.com',
  // China regions on platform.sapcloud.cn
  'acme-dev.integrationsuite.cfapps.cn40.platform.sapcloud.cn',
  'acme-dev.integrationsuite.cfapps.cn20.platform.sapcloud.cn',
];

const REJECTED_HOSTS = [
  // standalone Cloud Integration (CF) UI/worker and runtime hosts
  'acme-dev.it-cpi001.cfapps.eu10.hana.ondemand.com',
  'acme-dev.it-cpi001-rt.cfapps.eu10-003.hana.ondemand.com',
  'acme.it-cpi999.cfapps.eu10.hana.ondemand.com',
  // Neo / Classic
  'acme-tmn.hci.eu1.hana.ondemand.com',
  'acme-iflmap.hcisbp.eu1.hana.ondemand.com',
  // other SAP apps on the same BTP domains
  'acme.ts.cfapps.eu10.hana.ondemand.com',
  'acme.launchpad.cfapps.eu10.hana.ondemand.com',
  'acme-dev-myapp.cfapps.eu10.hana.ondemand.com',
  'acme.authentication.eu10.hana.ondemand.com',
  'cockpit.eu10.hana.ondemand.com',
  'api.cf.eu10.hana.ondemand.com',
  'acme.cfapps.cn40.platform.sapcloud.cn',
  'cn40.platform.sapcloud.cn',
  // malformed variants of the real shape
  'integrationsuite-x.hana.ondemand.com',
  'foo.integrationsuite.hana.ondemand.com',
  'acme.integrationsuite-cpi.cfapps.eu10.hana.ondemand.com',
  'acme.integrationsuite-foo.cfapps.eu10.hana.ondemand.com',
  'acme.integrationsuite.cfapps.hana.ondemand.com',
  'acme.integrationsuite.cfapps.eu10.ondemand.com',
  'acme.integrationsuite.cfapps.eu10.sapcloud.cn',
  // look-alikes and suffix attacks
  'acme.integrationsuite.cfapps.eu10.hana.ondemand.com.attacker.example',
  'acme.integrationsuite.cfapps.eu10.hana-ondemand.com',
  'acme.integrationsuite.cfapps.eu10.hana.ondemand.com.cn',
  'attacker.example/acme.integrationsuite.cfapps.eu10.hana.ondemand.com',
  '',
];

describe('isCpiUiHostname', () => {
  it.each(VERIFIED_UI_HOSTS)('accepts verified UI host %s', (host) => {
    expect(isCpiUiHostname(host)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isCpiUiHostname('ACME.IntegrationSuite.cfapps.EU10.hana.ondemand.com')).toBe(true);
  });

  it.each(REJECTED_HOSTS)('rejects %s', (host) => {
    expect(isCpiUiHostname(host)).toBe(false);
  });
});

describe('manifest patterns agree with the runtime check', () => {
  it('has exactly one https pattern per domain suffix and no http', () => {
    expect([...SAP_CPI_URL_PATTERNS]).toEqual(CPI_UI_DOMAIN_SUFFIXES.map((d) => `https://*.${d}/*`));
    expect(SAP_CPI_URL_PATTERNS.some((p) => p.startsWith('*://') || p.startsWith('http://'))).toBe(false);
  });

  it('every verified host is covered by a manifest pattern', () => {
    for (const host of VERIFIED_UI_HOSTS) {
      expect(SAP_CPI_URL_PATTERNS.some((p) => host.endsWith(p.slice('https://*'.length, -'/*'.length)))).toBe(true);
    }
  });

  it('the regex only accepts the listed domain suffixes', () => {
    for (const d of CPI_UI_DOMAIN_SUFFIXES) {
      expect(CPI_UI_HOSTNAME_RE.source).toContain(d.replace(/\./g, '\\.'));
    }
    expect(isCpiUiHostname('acme.integrationsuite.cfapps.eu10.example.com')).toBe(false);
  });
});

describe('toCpiOrigin', () => {
  it('returns the https origin for UI URLs with any path or query', () => {
    expect(toCpiOrigin(`${UI}/shell/monitoring/MessageUsage?x=1#frag`)).toBe(UI);
    expect(toCpiOrigin(TRIAL)).toBe(TRIAL);
    expect(toCpiOrigin(`${UI}:443/x`)).toBe(UI);
    expect(toCpiOrigin('https://acme.integrationsuite.cfapps.cn40.platform.sapcloud.cn/shell/home'))
      .toBe('https://acme.integrationsuite.cfapps.cn40.platform.sapcloud.cn');
  });

  it('fails closed for http, credentials, other hosts and garbage', () => {
    expect(toCpiOrigin('http://acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com')).toBeNull();
    expect(toCpiOrigin('http://acme.integrationsuite.cfapps.cn40.platform.sapcloud.cn')).toBeNull();
    expect(toCpiOrigin('https://user:pw@acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com')).toBeNull();
    expect(toCpiOrigin('https://attacker.example/?u=acme.integrationsuite.cfapps.eu10.hana.ondemand.com')).toBeNull();
    expect(toCpiOrigin('https://acme-tmn.hci.eu1.hana.ondemand.com/itspaces')).toBeNull();
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

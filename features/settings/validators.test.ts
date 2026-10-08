import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/shared/i18n', () => ({
  t: (key: string) => key,
  tSub: (key: string, value: string) => `${key}:${value}`,
}));

import { validateCpiUrl, validateName } from './validators';

const VALID_URL = 'https://acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com';

describe('validateCpiUrl', () => {
  it('accepts a well-formed Integration Suite tenant URL', () => {
    expect(validateCpiUrl(VALID_URL)).toEqual({ valid: true });
    expect(validateCpiUrl(`${VALID_URL}/shell/design`)).toEqual({ valid: true });
  });

  it('rejects empty input', () => {
    expect(validateCpiUrl('')).toEqual({ valid: false, error: 'validationUrlRequired' });
    expect(validateCpiUrl('   ')).toEqual({ valid: false, error: 'validationUrlRequired' });
  });

  it('rejects non-https URLs', () => {
    const result = validateCpiUrl('http://acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com');
    expect(result).toEqual({ valid: false, error: 'validationUrlHttps' });
  });

  it('rejects hosts that only contain the SAP domain as a substring (suffix attack)', () => {
    const result = validateCpiUrl('https://acme.integrationsuite.cfapps.eu10.hana.ondemand.com.attacker.example');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('validationUrlMustContain:hana.ondemand.com');
  });

  it('rejects SAP hosts that are not Integration Suite UI hosts', () => {
    const result = validateCpiUrl('https://acme-dev.it-cpi018.cfapps.eu10.hana.ondemand.com');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('validationUrlMustContain:integrationsuite');
  });

  it('rejects unparsable input', () => {
    expect(validateCpiUrl('not a url')).toEqual({ valid: false, error: 'validationUrlInvalid' });
  });
});

describe('validateName', () => {
  it('accepts a normal name', () => {
    expect(validateName('Acme Corp')).toEqual({ valid: true });
  });

  it('rejects empty and too-short names with the type in the message', () => {
    expect(validateName('', 'Tenant')).toEqual({ valid: false, error: 'validationNameRequired:Tenant' });
    expect(validateName('A')).toEqual({ valid: false, error: 'validationNameTooShort:Customer' });
  });

  it('rejects names longer than 50 characters', () => {
    expect(validateName('x'.repeat(51))).toEqual({ valid: false, error: 'validationNameTooLong:Customer' });
  });
});

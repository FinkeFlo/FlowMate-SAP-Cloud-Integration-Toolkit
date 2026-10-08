/**
 * Validation utilities
 */

import { t, tSub } from '@/features/shared/i18n';
import { CPI_UI_DOMAIN_SUFFIXES, isCpiUiHostname } from '@/features/shared/cpi-url';

/**
 * Validate SAP CPI URL
 * Expected format: https://<sub>.integrationsuite[-trial|-cpiNNN].cfapps.<region>.<domain>
 * (see features/shared/cpi-url.ts and docs/sap-cpi-hosts.md)
 */
export function validateCpiUrl(url: string): { valid: boolean; error?: string } {
  if (!url || !url.trim()) {
    return { valid: false, error: t('validationUrlRequired') };
  }

  // Check if it's a valid URL
  try {
    const urlObj = new URL(url);
    
    // Must be https
    if (urlObj.protocol !== 'https:') {
      return { valid: false, error: t('validationUrlHttps') };
    }

    // Check hostname pattern
    const hostname = urlObj.hostname;

    // Must match exact required suffix/segments (anchored checks, not
    // substring checks — avoids bypasses like "evil-hana.ondemand.com.attacker.com").
    if (!CPI_UI_DOMAIN_SUFFIXES.some((domain) => hostname.endsWith(`.${domain}`))) {
      return { valid: false, error: tSub('validationUrlMustContain', CPI_UI_DOMAIN_SUFFIXES.join(' | ')) };
    }

    if (!/(^|\.)integrationsuite(-trial|-cpi[0-9]+)?\./.test(hostname)) {
      return { valid: false, error: tSub('validationUrlMustContain', 'integrationsuite') };
    }

    if (!/(^|\.)cfapps\./.test(hostname)) {
      return { valid: false, error: tSub('validationUrlMustContain', 'cfapps') };
    }

    // Full anchored host check (shared with the background trust boundary).
    if (!isCpiUiHostname(hostname) || urlObj.username || urlObj.password) {
      return { 
        valid: false, 
        error: t('validationUrlFormat')
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: t('validationUrlInvalid') };
  }
}

/**
 * Validate customer/tenant name
 */
export function validateName(name: string, type: 'Customer' | 'Tenant' = 'Customer'): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: tSub('validationNameRequired', type) };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: tSub('validationNameTooShort', type) };
  }

  if (name.length > 50) {
    return { valid: false, error: tSub('validationNameTooLong', type) };
  }

  return { valid: true };
}

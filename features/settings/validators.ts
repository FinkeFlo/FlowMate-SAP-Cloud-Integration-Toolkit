/**
 * Validation utilities
 */

import { t, tSub } from '@/features/shared/i18n';

/**
 * Validate SAP CPI URL
 * Expected format: https://*.integrationsuite.cfapps.*.hana.ondemand.com
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
    
    // Must contain required parts
    if (!hostname.includes('integrationsuite')) {
      return { valid: false, error: tSub('validationUrlMustContain', 'integrationsuite') };
    }

    if (!hostname.includes('cfapps')) {
      return { valid: false, error: tSub('validationUrlMustContain', 'cfapps') };
    }

    if (!hostname.includes('hana.ondemand.com')) {
      return { valid: false, error: tSub('validationUrlMustContain', 'hana.ondemand.com') };
    }

    // Check pattern with regex
    const pattern = /^https:\/\/[a-zA-Z0-9-]+\.integrationsuite\.cfapps\.[a-zA-Z0-9-]+\.hana\.ondemand\.com.*$/;
    if (!pattern.test(url)) {
      return { 
        valid: false, 
        error: t('validationUrlFormat')
      };
    }

    return { valid: true };
  } catch (e) {
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

/**
 * Navigation utilities for SAP CPI SPA
 */

import { isCpiUiHostname } from './cpi-url';

/**
 * Get the CPI base URL prefix.
 * Integration Suite URLs use root (''), Neo/Classic URLs need '/itspaces'.
 */
export function getCpiBaseUrl(): string {
  return isCpiUiHostname(window.location.hostname) ? '' : '/itspaces';
}

export function isMessageUsagePage(): boolean {
  const currentUrl = window.location.href;
  return currentUrl.includes('/monitoring/MessageUsage') ||
         currentUrl.includes('#MessageUsage');
}

export function isTopFlowsMonitoringPage(): boolean {
  return window.location.pathname.includes('/monitoring-storage/flow-usage');
}


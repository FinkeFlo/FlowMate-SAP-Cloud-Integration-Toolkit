import { useState, useEffect } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { extractHost } from './tenant-url-builder';

interface ActiveTenantState {
  host: string | null;
  loading: boolean;
}

export function useActiveTenant(): ActiveTenantState {
  const [state, setState] = useState<ActiveTenantState>({
    host: null,
    loading: true,
  });

  useEffect(() => {
    async function detect() {
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        // Broad match: accepts any hana.ondemand.com tab.
        // Covers all CPI tenant types (Integration Suite, Neo, trial).
        if (tab?.url && tab.url.includes('hana.ondemand.com')) {
          setState({ host: extractHost(tab.url), loading: false });
        } else {
          setState({ host: null, loading: false });
        }
      } catch {
        setState({ host: null, loading: false });
      }
    }
    detect();
  }, []);

  return state;
}

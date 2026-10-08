import { useState, useEffect } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { extractHost, extractHostname } from './tenant-url-builder';

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
        // Check the hostname suffix (not a substring of the full URL) to
        // avoid bypasses like "https://evil.com/hana.ondemand.com".
        const url = tab?.url ?? '';
        const hostname = extractHostname(url);
        const host = hostname?.endsWith('.hana.ondemand.com') ? extractHost(url) : null;
        if (host?.startsWith('https://')) {
          setState({ host, loading: false });
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

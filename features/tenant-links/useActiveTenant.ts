import { useState, useEffect } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { toCpiOrigin } from '@/features/shared/cpi-url';

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
        // Same anchored Integration Suite host check as the content script and
        // the background trust boundary (https only, no Neo/runtime hosts).
        setState({ host: toCpiOrigin(tab?.url ?? ''), loading: false });
      } catch {
        setState({ host: null, loading: false });
      }
    }
    detect();
  }, []);

  return state;
}

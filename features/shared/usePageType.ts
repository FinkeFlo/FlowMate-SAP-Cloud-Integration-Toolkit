import { useState, useEffect, useRef } from 'preact/hooks';
import { isMessageUsagePage, isTopFlowsMonitoringPage } from './navigation';

export type PageType = 'iflow-design' | 'package-artifacts' | 'message-usage' | 'top-flows-monitoring' | 'other';

function detectPageType(): PageType {
  const url = window.location.href;
  const pathname = window.location.pathname;

  if (pathname.includes('/integrationflows/')) return 'iflow-design';
  if (url.includes('/shell/design/contentpackage/') && url.includes('section=ARTIFACTS')) return 'package-artifacts';
  if (isMessageUsagePage()) return 'message-usage';
  if (isTopFlowsMonitoringPage()) return 'top-flows-monitoring';
  return 'other';
}

export function usePageType(): PageType {
  const [pageType, setPageType] = useState<PageType>(detectPageType);
  const lastUrlRef = useRef(location.href);

  useEffect(() => {
    function check() {
      const current = location.href;
      if (current !== lastUrlRef.current) {
        lastUrlRef.current = current;
        setPageType(detectPageType());
      }
    }

    window.addEventListener('hashchange', check);
    const interval = setInterval(check, 1000);

    return () => {
      window.removeEventListener('hashchange', check);
      clearInterval(interval);
    };
  }, []);

  return pageType;
}

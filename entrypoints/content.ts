import { SAP_CPI_URL_PATTERNS } from '@/config/sap-cpi-urls';
import { render, h } from 'preact';

export default defineContentScript({
  matches: SAP_CPI_URL_PATTERNS as unknown as string[],
  runAt: 'document_end',
  allFrames: true,
  main() {
    initFlowMate();
  },
});

function initFlowMate() {
  // Only initialize on top frame in SAP CPI
  if (window !== window.top || !window.location.hostname.includes('integrationsuite')) {
    return;
  }

  // Mount Preact app — all features render inside ContentApp
  const appRoot = document.createElement('div');
  appRoot.id = 'flowmate-root';
  document.body.appendChild(appRoot);

  import('@/features/ContentApp').then(({ ContentApp }) => {
    render(h(ContentApp, null), appRoot);
  });
}

import { SAP_CPI_URL_PATTERNS } from '@/config/sap-cpi-urls';
import { render, h } from 'preact';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import '@/assets/flowmate-theme.css';

export default defineContentScript({
  matches: SAP_CPI_URL_PATTERNS as unknown as string[],
  runAt: 'document_end',
  allFrames: true,
  // All CSS (Tailwind + daisyUI utilities + component .css files) is bundled
  // and injected into the isolated Shadow Root below, instead of being added
  // to the page globally via the manifest — this avoids leaking styles into
  // / colliding with SAP's own Fiori/UI5 styles.
  cssInjectionMode: 'ui',
  async main(ctx) {
    await initFlowMate(ctx);
  },
});

async function initFlowMate(ctx: ContentScriptContext) {
  // Only initialize on top frame in SAP CPI
  if (window !== window.top || !window.location.hostname.includes('integrationsuite')) {
    return;
  }

  const { ContentApp } = await import('@/features/ContentApp');

  // Mount the Preact app inside a Shadow Root so our styles are fully
  // isolated from — and can't be broken by — the SAP host page.
  const ui = await createShadowRootUi(ctx, {
    name: 'flowmate-root',
    position: 'inline',
    anchor: 'body',
    onMount: (uiContainer) => {
      // daisyUI applies its theme CSS variables via `:root`, which does not
      // match anything inside a Shadow Root (there is no document root in a
      // shadow tree). Setting `data-theme` explicitly on the container makes
      // the "flowmate" theme active for everything rendered inside it.
      uiContainer.setAttribute('data-theme', 'flowmate');
      render(h(ContentApp, null), uiContainer);
    },
  });

  ui.mount();
}

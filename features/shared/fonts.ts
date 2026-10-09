/**
 * Brand typefaces (Onest for text, JetBrains Mono for machine data), bundled
 * as variable woff2 in public/fonts under the SIL Open Font License 1.1.
 *
 * Registered with the FontFace API on the extension's own pages (popup,
 * options). The content-script overlay does not call this: @font-face does not
 * apply inside a Shadow Root and the font files are not web-accessible, so the
 * overlay uses SAP's "72" from the `--font-sans` stack instead.
 */

import { browser } from 'wxt/browser';
import { devLog } from '@/features/shared/dev-logger';

const LOG_TAG = 'Fonts';

const BRAND_FONTS = [
  { family: 'Onest', path: '/fonts/Onest-Variable.woff2', weight: '100 900' },
  { family: 'JetBrains Mono', path: '/fonts/JetBrainsMono-Variable.woff2', weight: '100 800' },
] as const;

export function registerBrandFonts(): void {
  if (typeof FontFace === 'undefined' || !document.fonts) return;

  for (const font of BRAND_FONTS) {
    const face = new FontFace(font.family, `url("${browser.runtime.getURL(font.path)}") format("woff2")`, {
      weight: font.weight,
      style: 'normal',
      display: 'swap',
    });
    document.fonts.add(face);
    face.load().catch((error: unknown) => {
      devLog.warn(LOG_TAG, `Could not load ${font.family}, falling back to the system stack`, { error: String(error) });
    });
  }
}

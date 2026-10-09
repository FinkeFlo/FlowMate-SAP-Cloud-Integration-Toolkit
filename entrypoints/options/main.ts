import '@/assets/flowmate-theme.css';
import { render, h } from 'preact';
import { SettingsApp } from '@/features/settings/components/SettingsApp';
import { registerBrandFonts } from '@/features/shared/fonts';
import { t } from '@/features/shared/i18n';

registerBrandFonts();
// The <title> in index.html is the English fallback; the tab shows the UI language.
document.title = `FlowMate – ${t('settingsTitle')}`;
render(h(SettingsApp, null), document.getElementById('app')!);

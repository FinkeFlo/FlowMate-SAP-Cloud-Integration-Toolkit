import '@/assets/flowmate-theme.css';
import { render, h } from 'preact';
import { PopupApp } from '@/features/popup/PopupApp';
import { registerBrandFonts } from '@/features/shared/fonts';

registerBrandFonts();
render(h(PopupApp, null), document.getElementById('app')!);

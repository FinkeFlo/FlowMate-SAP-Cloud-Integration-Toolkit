import '@/assets/flowmate-theme.css';
import { render, h } from 'preact';
import { PopupApp } from '@/features/popup/PopupApp';

render(h(PopupApp, null), document.getElementById('app')!);

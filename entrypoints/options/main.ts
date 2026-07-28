import '@/assets/flowmate-theme.css';
import { render, h } from 'preact';
import { SettingsApp } from '@/features/settings/components/SettingsApp';

render(h(SettingsApp, null), document.getElementById('app')!);

import { browser } from 'wxt/browser';
import { Settings } from 'lucide-preact';
import { TenantLinksPanel } from '@/features/tenant-links';
import './PopupApp.css';

export function PopupApp() {
  function handleOpenSettings() {
    browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
  }

  return (
    <div class="popup-container">
      <div class="popup-header-bar">
        <h2 class="popup-header">FlowMate</h2>
        <button type="button" class="popup-settings-btn" onClick={handleOpenSettings} title="Open Settings">
          <Settings size={16} />
        </button>
      </div>
      <TenantLinksPanel />
      <div class="popup-footer">
        <p class="popup-version">Version {browser.runtime.getManifest().version}</p>
      </div>
    </div>
  );
}

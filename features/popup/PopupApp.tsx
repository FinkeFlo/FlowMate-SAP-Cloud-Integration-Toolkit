import { browser } from 'wxt/browser';
import { Settings } from 'lucide-preact';
import { TenantLinksPanel } from '@/features/tenant-links';
import { t } from '@/features/shared/i18n';

export function PopupApp() {
  function handleOpenSettings() {
    browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
  }

  return (
    <div class="max-h-[520px] min-w-[420px] overflow-y-auto p-3">
      <div class="mb-3 flex items-center justify-between border-b border-base-300 pb-2">
        <h2 class="m-0 text-lg font-semibold text-primary">{t('extName')}</h2>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          onClick={handleOpenSettings}
          title="Open Settings"
        >
          <Settings size={16} />
        </button>
      </div>
      <TenantLinksPanel />
      <div class="mt-3 border-t border-base-300 pt-2">
        <p class="m-0 text-center text-xs text-base-content/50">
          Version {browser.runtime.getManifest().version}
        </p>
      </div>
    </div>
  );
}

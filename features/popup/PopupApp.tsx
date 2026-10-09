import { browser } from 'wxt/browser';
import { Settings } from 'lucide-preact';
import { TenantLinksPanel } from '@/features/tenant-links';
import { t } from '@/features/shared/i18n';
import { FlowMateLogo } from '@/features/shared/FlowMateLogo';

export function PopupApp() {
  function handleOpenSettings() {
    browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
  }

  return (
    <div class="max-h-[520px] min-w-[420px] overflow-y-auto px-3.5 py-3">
      <div class="mb-3 flex items-center gap-2.5 border-b border-base-300 pb-3">
        <FlowMateLogo size={28} />
        <h2 class="m-0 text-lg font-extrabold tracking-tight">{t('extName')}</h2>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square ml-auto"
          onClick={handleOpenSettings}
          title={t('openSettings')}
          aria-label={t('openSettings')}
        >
          <Settings size={16} />
        </button>
      </div>
      <TenantLinksPanel />
      <div class="mt-3 border-t border-base-300 pt-2">
        <p class="m-0 text-center text-xs text-muted">
          Version {browser.runtime.getManifest().version}
        </p>
      </div>
    </div>
  );
}

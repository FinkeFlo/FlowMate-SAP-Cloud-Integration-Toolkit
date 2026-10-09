import { useActiveTenant } from '../useActiveTenant';
import { extractHostname } from '../tenant-url-builder';
import { SortableQuickLinks } from './SortableQuickLinks';
import { LoaderCircle, Info } from 'lucide-preact';
import { t } from '@/features/shared/i18n';

export function TenantLinksPanel() {
  const { host, loading } = useActiveTenant();

  if (loading) {
    return (
      <div class="flex items-center gap-2 p-4 text-sm text-muted">
        <span class="animate-spin"><LoaderCircle size={16} /></span>
        <span>{t('quickLinksDetecting')}</span>
      </div>
    );
  }

  if (!host) {
    return (
      <div class="flex items-center gap-2.5 rounded-field bg-base-200 px-3 py-2.5 text-sm">
        <Info size={16} class="shrink-0 text-muted" />
        <span>{t('quickLinksNoTenant')}</span>
      </div>
    );
  }

  return (
    <div>
      <SortableQuickLinks host={host} />
      <p class="mt-3 truncate font-mono text-[11px] text-muted">{extractHostname(host) ?? host}</p>
    </div>
  );
}

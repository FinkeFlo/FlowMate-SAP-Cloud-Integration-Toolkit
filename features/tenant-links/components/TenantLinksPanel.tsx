import { useActiveTenant } from '../useActiveTenant';
import { extractHostname } from '../tenant-url-builder';
import { SortableQuickLinks } from './SortableQuickLinks';
import { LoaderCircle, Info } from 'lucide-preact';

export function TenantLinksPanel() {
  const { host, loading } = useActiveTenant();

  if (loading) {
    return (
      <div class="flex items-center gap-2 p-4 text-sm text-base-content/60">
        <span class="animate-spin"><LoaderCircle size={16} /></span>
        <span>Detecting tenant...</span>
      </div>
    );
  }

  if (!host) {
    return (
      <div class="flex items-center gap-2 rounded-field bg-base-200 px-4 py-3 text-sm text-base-content/60">
        <Info size={16} />
        <span>Open a SAP CPI page to see tenant links.</span>
      </div>
    );
  }

  return (
    <div>
      <SortableQuickLinks host={host} />
      <p class="mt-1.5 truncate text-[11px] text-base-content/50">{extractHostname(host)}</p>
    </div>
  );
}

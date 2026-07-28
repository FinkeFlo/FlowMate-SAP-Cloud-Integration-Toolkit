import { useActiveTenant } from '../useActiveTenant';
import { extractHostname } from '../tenant-url-builder';
import { SortableQuickLinks } from './SortableQuickLinks';
import { LoaderCircle, Info } from 'lucide-preact';
import './TenantLinksPanel.css';

export function TenantLinksPanel() {
  const { host, loading } = useActiveTenant();

  if (loading) {
    return (
      <div class="tl-status tl-status--loading">
        <LoaderCircle size={16} />
        <span>Detecting tenant...</span>
      </div>
    );
  }

  if (!host) {
    return (
      <div class="tl-status tl-status--info">
        <Info size={16} />
        <span>Open a SAP CPI page to see tenant links.</span>
      </div>
    );
  }

  return (
    <div class="tl-panel">
      <SortableQuickLinks host={host} />
      <p class="tl-host-info">{extractHostname(host)}</p>
    </div>
  );
}

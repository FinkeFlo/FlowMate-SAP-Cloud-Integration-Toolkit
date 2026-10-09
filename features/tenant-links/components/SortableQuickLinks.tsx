import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import Sortable from 'sortablejs';
import { Pencil, Check, ChevronUp, ChevronDown, X, Layers } from 'lucide-preact';
import { ALL_LINKS } from '../tenant-link-definitions';
import type { TenantLink } from '../tenant-link-definitions';
import { getQuickLinksPreference, saveQuickLinksPreference } from '../quick-links-storage';
import { buildTenantUrl } from '../tenant-url-builder';
import { t } from '@/features/shared/i18n';

interface SortableQuickLinksProps {
  host: string;
}

// Maps each link's semantic color to a daisyUI button color variant.
const COLOR_TO_BTN_CLASS: Record<NonNullable<TenantLink['color']>, string> = {
  green: 'btn-success',
  red: 'btn-error',
  gray: 'btn-neutral',
  blue: 'btn-primary',
};

// The four default quick links carry an icon next to their tint, so the
// status-like ones are not told apart by color alone.
const LINK_ICON: Record<string, typeof Check> = {
  'processed-messages': Check,
  'failed-messages': X,
  'integration-content': Layers,
  design: Pencil,
};export function SortableQuickLinks({ host }: SortableQuickLinksProps) {
  const [quickIds, setQuickIds] = useState<string[]>([]);
  const [restIds, setRestIds] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [restExpanded, setRestExpanded] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLDivElement>(null);

  const linkMap = new Map(ALL_LINKS.map(l => [l.id, l]));

  useEffect(() => {
    getQuickLinksPreference().then(pref => {
      setQuickIds(pref.quickLinkIds);
      setRestIds(pref.restLinkIds);
      setLoaded(true);
    });
  }, []);

  const handleDragEnd = useCallback((evt: Sortable.SortableEvent) => {
    if (!quickRef.current || !restRef.current) return;

    // Read new order from DOM before reverting
    const newQuickIds = Array.from(quickRef.current.children).map(
      el => el.getAttribute('data-link-id')!,
    );
    const newRestIds = Array.from(restRef.current.children).map(
      el => el.getAttribute('data-link-id')!,
    );

    // Revert SortableJS DOM mutation so Preact can reconcile cleanly
    const { from, to, item, oldIndex } = evt;
    if (to !== from) {
      to.removeChild(item);
      from.insertBefore(item, from.children[oldIndex!] || null);
    } else if (oldIndex !== evt.newIndex) {
      // Same container reorder — revert to original position
      from.removeChild(item);
      from.insertBefore(item, from.children[oldIndex!] || null);
    }

    setQuickIds(newQuickIds);
    setRestIds(newRestIds);
    saveQuickLinksPreference({ quickLinkIds: newQuickIds, restLinkIds: newRestIds });
  }, []);

  useEffect(() => {
    if (!editMode || !quickRef.current || !restRef.current) return;

    const opts: Sortable.Options = {
      group: 'links',
      animation: 150,
      dataIdAttr: 'data-link-id',
      ghostClass: 'opacity-40',
      chosenClass: 'shadow-float',
      onEnd: handleDragEnd,
    };

    const quickS = new Sortable(quickRef.current, opts);
    const restS = new Sortable(restRef.current, opts);

    return () => {
      quickS.destroy();
      restS.destroy();
    };
  }, [editMode, handleDragEnd]);

  if (!loaded) return null;

  const quickLinks = quickIds.map(id => linkMap.get(id)).filter(Boolean) as TenantLink[];
  const restLinks = restIds.map(id => linkMap.get(id)).filter(Boolean) as TenantLink[];

  const editingZoneClass = 'rounded-box border-2 border-dashed border-primary/30 p-1';

  return (
    <>
      <div class="mb-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="m-0 text-[11px] font-bold uppercase tracking-[0.07em] text-muted">
            {t('quickLinksTitle')}
          </h3>
          <button
            type="button"
            class={`btn btn-xs ${editMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setEditMode(prev => {
                if (!prev) setRestExpanded(true); // expand "More" when entering edit mode
                return !prev;
              });
            }}
            title={editMode ? t('quickLinksDoneEditing') : t('quickLinksEditLayout')}
          >
            {editMode ? <Check size={12} /> : <Pencil size={12} />}
            {editMode ? t('done') : t('edit')}
          </button>
        </div>

        <div
          ref={quickRef}
          class={`grid grid-cols-2 gap-2 ${editMode ? editingZoneClass : ''}`}
        >
          {quickLinks.map(link => {
            const Icon = LINK_ICON[link.id];
            return (
              <div key={link.id} data-link-id={link.id} class={editMode ? 'cursor-grab' : ''}>
                <a
                  href={buildTenantUrl(host, link.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class={`btn btn-soft h-10 w-full justify-start gap-2 px-3.5 font-semibold ${COLOR_TO_BTN_CLASS[link.color || 'gray']} ${editMode ? 'pointer-events-none' : ''}`}
                >
                  {Icon && <Icon size={16} class="shrink-0" />}
                  <span class="truncate">{link.label}</span>
                </a>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <button
          type="button"
          class="btn btn-secondary btn-sm mt-3 w-full justify-between"
          onClick={() => { if (!editMode) setRestExpanded(prev => !prev); }}
        >
          <span>{t('quickLinksMore')}</span>
          {restExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {restExpanded && (
          <div
            ref={restRef}
            class={`mt-1.5 flex flex-wrap gap-1.5 ${editMode ? editingZoneClass : ''}`}
          >
            {restLinks.map(link => (
              <div key={link.id} data-link-id={link.id} class={editMode ? 'cursor-grab' : ''}>
                <a
                  href={buildTenantUrl(host, link.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class={`btn btn-outline btn-xs border-base-300 font-medium ${editMode ? 'pointer-events-none' : ''}`}
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import Sortable from 'sortablejs';
import { Pencil, Check, ChevronUp, ChevronDown } from 'lucide-preact';
import { ALL_LINKS } from '../tenant-link-definitions';
import type { TenantLink } from '../tenant-link-definitions';
import { getQuickLinksPreference, saveQuickLinksPreference } from '../quick-links-storage';
import { buildTenantUrl } from '../tenant-url-builder';
import './SortableQuickLinks.css';

interface SortableQuickLinksProps {
  host: string;
}

export function SortableQuickLinks({ host }: SortableQuickLinksProps) {
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
      ghostClass: 'tl-drag-ghost',
      chosenClass: 'tl-drag-chosen',
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

  return (
    <>
      <div class="tl-section">
        <div class="tl-quick-header">
          <h3 class="tl-section-title">Quick Links</h3>
          <button
            type="button"
            class={`tl-edit-btn${editMode ? ' tl-edit-btn--active' : ''}`}
            onClick={() => {
              setEditMode(prev => {
                if (!prev) setRestExpanded(true); // expand "More" when entering edit mode
                return !prev;
              });
            }}
            title={editMode ? 'Done editing' : 'Edit layout'}
          >
            {editMode ? <Check size={12} /> : <Pencil size={12} />}
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>

        <div
          ref={quickRef}
          class={`tl-main-buttons${editMode ? ' tl-zone--editing' : ''}`}
        >
          {quickLinks.map(link => (
            <div
              key={link.id}
              data-link-id={link.id}
              class={`tl-main-btn tl-main-btn--${link.color || 'gray'}${editMode ? ' tl-item--editing' : ''}`}
            >
              <a
                href={buildTenantUrl(host, link.path)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          class="tl-more-header"
          onClick={() => { if (!editMode) setRestExpanded(prev => !prev); }}
        >
          <span>More Links</span>
          {restExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {restExpanded && (
          <div
            ref={restRef}
            class={`tl-more-zone${editMode ? ' tl-zone--editing' : ''}`}
          >
            {restLinks.map(link => (
              <div
                key={link.id}
                data-link-id={link.id}
                class={`tl-link-item${editMode ? ' tl-item--editing' : ''}`}
              >
                <a
                  href={buildTenantUrl(host, link.path)}
                  target="_blank"
                  rel="noopener noreferrer"
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

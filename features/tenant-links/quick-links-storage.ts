import { ALL_LINKS, DEFAULT_QUICK_IDS } from './tenant-link-definitions';

const STORAGE_KEY = 'flowmate-quick-links';

export interface QuickLinksPreference {
  quickLinkIds: string[];
  restLinkIds: string[];
}

export async function getQuickLinksPreference(): Promise<QuickLinksPreference> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const saved = result[STORAGE_KEY] as QuickLinksPreference | undefined;

  if (saved) {
    // Reconcile: add any new links not yet in the saved preference
    const allIds = new Set(ALL_LINKS.map(l => l.id));
    const savedIds = new Set([...saved.quickLinkIds, ...saved.restLinkIds]);

    const newIds = ALL_LINKS.filter(l => !savedIds.has(l.id)).map(l => l.id);
    // Remove IDs that no longer exist in ALL_LINKS
    const quickLinkIds = saved.quickLinkIds.filter(id => allIds.has(id));
    const restLinkIds = [...saved.restLinkIds.filter(id => allIds.has(id)), ...newIds];

    return { quickLinkIds, restLinkIds };
  }

  // First-time: use defaults
  const quickLinkIds = DEFAULT_QUICK_IDS;
  const restLinkIds = ALL_LINKS.filter(l => !DEFAULT_QUICK_IDS.includes(l.id)).map(l => l.id);
  return { quickLinkIds, restLinkIds };
}

export async function saveQuickLinksPreference(pref: QuickLinksPreference): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: pref });
}

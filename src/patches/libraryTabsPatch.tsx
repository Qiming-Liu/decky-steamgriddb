import { afterPatch, findInReactTree, wrapReactType } from '@decky/ui';
import { RoutePatch, routerHook } from '@decky/api';

import log from '../utils/log';

export type LibraryTabSettings = {
  order: string[];
  hidden: string[];
};

export type SeenLibraryTab = {
  key: string;
  title: string;
};

// The "great on this device" tab has a different id depending on the hardware.
const COMPAT_TAB_IDS = ['GreatOnDeck', 'GreatOnMachine', 'SteamOSCompatible'];

export const DEFAULT_LIBRARY_TABS = [
  'GreatOnDeck',
  'AllGames',
  'Installed',
  'Favorites',
  'Collections',
  'DesktopApps',
  'Soundtracks',
];

/** The settings key of a library tab, so the device-specific tab ids share one entry. */
export const libraryTabKey = (id: string): string => (COMPAT_TAB_IDS.includes(id) ? COMPAT_TAB_IDS[0] : id);

const isDefault = ({ order, hidden }: LibraryTabSettings) => order.length === 0 && hidden.length === 0;

/**
 * Hides and reorders a row of Steam tabs. Tabs missing from `order` keep
 * Steam's order after the known ones.
 */
export function arrangeTabs<T extends { id: string }>(
  tabs: T[],
  { order, hidden }: LibraryTabSettings,
  keyOf: (id: string) => string = (id) => id
): T[] {
  return tabs
    .map((tab, index) => {
      const position = order.indexOf(keyOf(tab.id));
      return { tab, rank: position < 0 ? order.length + index : position };
    })
    .filter(({ tab }) => !hidden.includes(keyOf(tab.id)))
    .sort((a, b) => a.rank - b.rank)
    .map(({ tab }) => tab);
}

/** Library tabs arranged by the settings; at least one tab always stays visible. */
export function arrangeLibraryTabs<T extends { id: string }>(tabs: T[], settings: LibraryTabSettings): T[] {
  const arranged = arrangeTabs(tabs, settings, libraryTabKey);
  return arranged.length === 0 ? tabs : arranged;
}

let settings: LibraryTabSettings = { order: [], hidden: [] };
let seenTabs: SeenLibraryTab[] | null = null;
let patch: RoutePatch | undefined;

/** The tabs Steam rendered the last time the library opened, or null before that. */
export const getSeenLibraryTabs = (): SeenLibraryTab[] | null => seenTabs;

function addLibraryTabsPatch() {
  if (patch) return;

  patch = routerHook.addPatch('/library', (props: any) => {
    afterPatch(props.children, 'type', (_: Record<string, unknown>[], ret?: any) => {
      let tabsWrapperCache: any = null;

      afterPatch(ret, 'type', (_: Record<string, unknown>[], ret2?: any) => {
        if (!ret2) return ret2;
        if (tabsWrapperCache) {
          ret2.type = tabsWrapperCache;
          return ret2;
        }

        wrapReactType(ret2);
        afterPatch(ret2.type, 'type', (_: Record<string, unknown>[], ret3?: any) => {
          tabsWrapperCache = ret2.type;

          const host = findInReactTree(ret3, (x) => Array.isArray(x?.tabs) && x?.activeTab !== undefined);
          if (!host) {
            log('library tabs: tab list not found');
            return ret3;
          }

          const tabs: { id: string, title?: unknown }[] = host.tabs;
          seenTabs = tabs.map((tab) => ({
            key: libraryTabKey(tab.id),
            title: typeof tab.title === 'string' ? tab.title : '',
          }));

          const arranged = arrangeLibraryTabs(tabs, settings);
          host.tabs = arranged;
          if (!arranged.some((tab) => tab.id === host.activeTab)) {
            host.activeTab = arranged[0]?.id;
          }
          return ret3;
        });
        return ret2;
      });
      return ret;
    });
    return props;
  });
}

export function removeLibraryTabsPatch(): void {
  if (!patch) return;
  routerHook.removePatch('/library', patch);
  patch = undefined;
}

/**
 * Applies new settings. The route stays unpatched while the settings are the
 * defaults; otherwise the library picks them up on its next render (callers
 * that need it now use rerenderAfterPatchUpdate).
 */
export function setLibraryTabSettings(next: LibraryTabSettings): void {
  settings = { order: [...next.order], hidden: [...next.hidden] };
  if (isDefault(settings)) {
    removeLibraryTabsPatch();
  } else {
    addLibraryTabsPatch();
  }
}

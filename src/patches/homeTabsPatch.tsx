import { afterPatch, findInReactTree, wrapReactType } from '@decky/ui';
import { RoutePatch, routerHook } from '@decky/api';
import { FC, ReactNode } from 'react';

import log from '../utils/log';
import { addStyle, removeStyle } from '../utils/styleInjector';
import { homeCarouselClasses, homeRecentGamesClasses } from '../static-classes';

import { arrangeTabs, LibraryTabSettings, SeenLibraryTab } from './libraryTabsPatch';

export const SWITCH_LIKE_HOME_SETTING = 'switch_like_home';
export const HOME_TABS_SETTING = 'home_tabs';

/** The tabs under the home page's recent games, with Steam's tokens for their names. */
export const HOME_TABS: { id: string, token: string, fallback: string }[] = [
  { id: 'WhatsNew', token: 'HomeTab_WhatsNew', fallback: 'What’s New' },
  { id: 'Friends', token: 'HomeTab_Friends', fallback: 'Friends' },
  { id: 'Recommended', token: 'HomeTab_Recommended', fallback: 'Recommended' },
];

let switchLike = false;
let homeTabs: LibraryTabSettings = { order: [], hidden: [] };
let seenHomeTabs: SeenLibraryTab[] | null = null;
let patch: RoutePatch | undefined;

/** The home tabs Steam rendered the last time the home page opened, or null before that. */
export const getSeenHomeTabs = (): SeenLibraryTab[] | null => seenHomeTabs;

/** The saved order and hidden list; the older hidden-only list and "hide What's New" switch carry over. */
export const readHomeTabSettings = (saved: any, legacyHidden: unknown, legacyHideWhatsNew: unknown): LibraryTabSettings => {
  const strings = (list: unknown) => (Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    return { order: strings(saved.order), hidden: strings(saved.hidden) };
  }
  if (Array.isArray(legacyHidden)) return { order: [], hidden: strings(legacyHidden) };
  return { order: [], hidden: legacyHideWhatsNew === true ? ['WhatsNew'] : [] };
};

const isRecents = (x: any) => x?.props && 'autoFocus' in x.props && 'showBackground' in x.props;
const isTabs = (x: any) => x?.props && 'strActiveTab' in x.props && 'setActiveTab' in x.props;

const indexOfChild = (children: any[], predicate: (x: any) => boolean) =>
  children.findIndex((c) => c && (predicate(c) || findInReactTree(c, predicate)));

/**
 * The home page renders the recent games and the tab section as siblings
 * ([recent games, tabs, ...]). Finds the nearest list that holds both in different
 * entries (outer lists hold both in one).
 */
const findHomeSections = (tree: any) => {
  const parent = findInReactTree(tree, (x) => {
    if (!Array.isArray(x?.props?.children)) return false;
    const recentsIdx = indexOfChild(x.props.children, isRecents);
    const tabsIdx = indexOfChild(x.props.children, isTabs);
    return recentsIdx >= 0 && tabsIdx >= 0 && recentsIdx !== tabsIdx;
  });
  if (!parent) return null;
  const children: any[] = parent.props.children;
  return { children, tabsIdx: indexOfChild(children, isTabs) };
};

/**
 * Stands in for the tab section while the Switch-like layout is on. Nothing under it
 * mounts, so the tabs never build or load What's New, Friends or Recommended. It reads
 * the live setting, so a tree another home patch caches shows the tabs again once the
 * layout is turned off.
 */
const SwitchLikeTabs: FC<{ block: ReactNode }> = ({ block }) => (switchLike ? null : <>{block}</>);

const removeTabs = (tree: any) => {
  if (findInReactTree(tree, (x) => x?.type === SwitchLikeTabs)) return;
  const sections = findHomeSections(tree);
  if (!sections) {
    log('switch-like home: recent games or tabs not found');
    return;
  }
  const { children, tabsIdx } = sections;
  const block = children[tabsIdx];
  children[tabsIdx] = <SwitchLikeTabs key={block?.key ?? 'sgdb-switch-like-tabs'} block={block} />;
};

/**
 * The layout of the "Switch Like Home" CSS Loader theme (with its "No Friends" option,
 * since the tabs are gone): the recent games sit at the bottom of the screen, the
 * "Recent Games" header goes, and the game name shows above the selected game.
 */
const SWITCH_LIKE_STYLE = 'sgdb-switch-like-home';
const switchLikeCss = (): string | null => {
  const recents = homeRecentGamesClasses?.RecentGamesInnerContainer;
  const header = homeRecentGamesClasses?.RecentGamesHeader;
  const carousel = homeCarouselClasses?.BasicGameCarousel;
  const label = homeCarouselClasses?.CarouselGameLabelWrapper;
  if (!recents || !header || !carousel || !label) return null;
  return `
    .${recents} {
      /* Screen height - (header + footer) - header padding */
      height: calc(100vh - 80px - 14px);
    }
    .${recents} .${carousel} {
      bottom: 0px;
      position: absolute !important;
      padding-top: 85px;
    }
    .${recents} .${carousel} > .ReactVirtualized__Grid__innerScrollContainer {
      height: 221px !important;
    }
    .${recents} .${label} {
      position: absolute;
      top: -52px;
      padding-top: 0;
    }
    .${header} {
      display: none;
    }
    .RecentGamesBackgroundContainer, .RecentGamesBackgroundImages {
      bottom: 0;
    }
  `;
};

/**
 * Patches the memoized component that builds the home tabs so it hides and reorders
 * them. It reads the live settings, so a change shows on the home page's next render.
 * Returns the patched type for the caller to cache.
 */
const arrangeHomeTabs = (tree: any, cached: any): any => {
  const tabsElement = findInReactTree(tree, isTabs);
  if (!tabsElement?.type) {
    log('home tabs: tab list not found');
    return cached;
  }
  if (cached) {
    tabsElement.type = cached;
    return cached;
  }
  // Another home patch may hand back a tree this patch already wrapped.
  if (tabsElement.type.sgdbHomeTabsPatched) return tabsElement.type;

  wrapReactType(tabsElement);
  tabsElement.type.sgdbHomeTabsPatched = true;
  afterPatch(tabsElement.type, 'type', (_: Record<string, unknown>[], ret?: any) => {
    const tabsProps = ret?.props;
    if (!Array.isArray(tabsProps?.tabs)) return ret;

    seenHomeTabs = tabsProps.tabs.map((tab: { id: string, title?: unknown }) => ({
      key: tab.id,
      title: typeof tab.title === 'string' ? tab.title : '',
    }));
    const tabs = arrangeTabs(tabsProps.tabs as { id: string }[], homeTabs);
    // Every tab hidden: drop the whole tab row.
    if (tabs.length === 0) return null;
    tabsProps.tabs = tabs;
    if (!tabs.some((tab) => tab.id === tabsProps.activeTab)) {
      tabsProps.activeTab = tabs[0].id;
    }
    return ret;
  });
  return tabsElement.type;
};

const homeTabsDefault = () => homeTabs.order.length === 0 && homeTabs.hidden.length === 0;

function addHomeTabsPatch(): void {
  if (patch) return;

  patch = routerHook.addPatch('/library/home', (props: any) => {
    afterPatch(props.children, 'type', (_: Record<string, unknown>[], ret?: any) => {
      if (!ret?.type) return ret;
      let tabsTypeCache: any = null;

      wrapReactType(ret);
      afterPatch(ret.type, 'type', (_: Record<string, unknown>[], ret2?: any) => {
        // Arrange first: the Switch-like stand-in keeps the tab block, so
        // turning that layout off shows the arranged tabs.
        tabsTypeCache = arrangeHomeTabs(ret2, tabsTypeCache);
        if (switchLike) removeTabs(ret2);
        return ret2;
      });
      return ret;
    });
    return props;
  });
}

function removeRoutePatch(): void {
  if (!patch) return;
  routerHook.removePatch('/library/home', patch);
  patch = undefined;
}

export function removeHomeTabsPatch(): void {
  removeStyle(SWITCH_LIKE_STYLE);
  removeRoutePatch();
}

/** Keeps the route patched only while either feature needs it. */
const updateRoutePatch = () => {
  if (switchLike || !homeTabsDefault()) addHomeTabsPatch();
  else removeRoutePatch();
};

/** Applies new home tab settings; the home page picks them up on its next render. */
export function setHomeTabSettings(next: LibraryTabSettings): void {
  homeTabs = { order: [...next.order], hidden: [...next.hidden] };
  updateRoutePatch();
}

/**
 * Turns the Switch-like home layout, which also drops the home tabs, on or off. The home
 * page picks the change up on its next render.
 */
export function setSwitchLikeHome(next: boolean): void {
  switchLike = next;
  updateRoutePatch();
  if (!switchLike) {
    removeStyle(SWITCH_LIKE_STYLE);
    return;
  }

  const css = switchLikeCss();
  if (css) {
    addStyle(SWITCH_LIKE_STYLE, css);
  } else {
    log('switch-like home: home page classes not found');
    removeStyle(SWITCH_LIKE_STYLE);
  }
}

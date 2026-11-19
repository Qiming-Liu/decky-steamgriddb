import { FC, useEffect, useMemo, useState } from 'react';

import useSettings from '../hooks/useSettings';
import {
  DEFAULT_LIBRARY_TABS,
  getSeenLibraryTabs,
  LibraryTabSettings,
  setLibraryTabSettings,
} from '../patches/libraryTabsPatch';
import t, { localizeToken } from '../utils/i18n';

import SortList, { SortEntry } from './SortList';
import { TabIcon } from './ui/icons';

export const LIBRARY_TABS_SETTING = 'library_tabs';

type Entry = { key: string; title: string; empty: boolean };

// Steam's own names, used until the library has been opened once.
const STEAM_TITLES: Record<string, [string, string]> = {
  GreatOnDeck: ['LibraryTab_DeckGames', 'Great on Deck'],
  AllGames: ['LibraryTab_AllGames', 'All Games'],
  Installed: ['LibraryTab_Installed', 'Installed'],
  Favorites: ['LibraryTab_Favorites', 'Favorites'],
  Collections: ['LibraryTab_Collections', 'Collections'],
  DesktopApps: ['LibraryTab_NonSteam', 'Non-Steam'],
  Soundtracks: ['LibraryTab_Soundtracks', 'Soundtracks'],
};

const steamTitle = (key: string): string => {
  const known = STEAM_TITLES[key];
  return known ? t(known[0], known[1], true) : key;
};

/** Seen tabs in Steam's order, with the default tabs Steam did not show slotted in after their neighbour. */
const baseKeys = (seen: string[] | null): string[] => {
  if (!seen) return [...DEFAULT_LIBRARY_TABS];
  const keys = [...seen];
  DEFAULT_LIBRARY_TABS.forEach((key, index) => {
    if (keys.includes(key)) return;
    const before = DEFAULT_LIBRARY_TABS.slice(0, index).reverse().find((x) => keys.includes(x));
    keys.splice(before ? keys.indexOf(before) + 1 : 0, 0, key);
  });
  return keys;
};

export const readLibraryTabSettings = (value: any): LibraryTabSettings => {
  const strings = (list: unknown) => (Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
  return { order: strings(value?.order), hidden: strings(value?.hidden) };
};

/** Steam library tabs: reorder them or hide the ones not used. */
const LibraryTabSorter: FC<{ onChange?: () => void }> = ({ onChange }) => {
  const { get, set } = useSettings();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const saved = readLibraryTabSettings(await get(LIBRARY_TABS_SETTING, null));
      const seen = getSeenLibraryTabs();
      const base = baseKeys(seen?.map((tab) => tab.key) ?? null);
      const keys = [...saved.order.filter((key) => base.includes(key)), ...base.filter((key) => !saved.order.includes(key))];
      setEntries(keys.map((key) => ({
        key,
        title: localizeToken(seen?.find((tab) => tab.key === key)?.title || '') || steamTitle(key),
        empty: seen !== null && !seen.some((tab) => tab.key === key),
      })));
      setHidden(saved.hidden.filter((key) => keys.includes(key)));
    })();
  }, [get]);

  const sortEntries: SortEntry[] = useMemo(() => (entries ?? []).map((entry) => ({
    key: entry.key,
    title: entry.title,
    icon: <TabIcon id={entry.key} />,
    badge: entry.empty ? t('LABEL_LIBRARY_TAB_EMPTY', 'Empty') : undefined,
  })), [entries]);

  if (!entries) return null;

  const save = (next: LibraryTabSettings) => {
    set(LIBRARY_TABS_SETTING, next, true);
    setLibraryTabSettings(next);
    onChange?.();
  };

  const reorder = (keys: string[]) => {
    setEntries(keys.map((key) => entries.find((entry) => entry.key === key)!));
    save({ order: keys, hidden });
  };

  const toggleHidden = (key: string) => {
    const isHidden = hidden.includes(key);
    // Keep one tab Steam actually shows; tabs marked empty don't count.
    const shown = entries.filter((entry) => !entry.empty && !hidden.includes(entry.key));
    if (!isHidden && shown.length <= 1 && shown.some((entry) => entry.key === key)) return false;
    const next = isHidden ? hidden.filter((x) => x !== key) : [...hidden, key];
    setHidden(next);
    save({ order: entries.map((entry) => entry.key), hidden: next });
    return true;
  };

  const reset = () => {
    const list = baseKeys(getSeenLibraryTabs()?.map((tab) => tab.key) ?? null)
      .map((key) => entries.find((entry) => entry.key === key))
      .filter((entry): entry is Entry => Boolean(entry));
    setEntries(list);
    setHidden([]);
    save({ order: [], hidden: [] });
  };

  return <SortList entries={sortEntries} hidden={hidden} onReorder={reorder} onToggleHidden={toggleHidden} onReset={reset} />;
};

export default LibraryTabSorter;

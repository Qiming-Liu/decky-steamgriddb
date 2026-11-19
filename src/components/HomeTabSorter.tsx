import { FC, useEffect, useMemo, useState } from 'react';

import useSettings from '../hooks/useSettings';
import {
  getSeenHomeTabs,
  HOME_TABS,
  HOME_TABS_SETTING,
  readHomeTabSettings,
  setHomeTabSettings,
  SWITCH_LIKE_HOME_SETTING,
} from '../patches/homeTabsPatch';
import { LibraryTabSettings } from '../patches/libraryTabsPatch';
import t, { localizeToken } from '../utils/i18n';

import SortList, { SortEntry } from './SortList';
import { HomeIcon, TabIcon } from './ui/icons';
import { colors } from './ui/shell';

type Entry = { key: string; title: string };

const knownTitle = (key: string): string => {
  const known = HOME_TABS.find((tab) => tab.id === key);
  return known ? t(known.token, known.fallback, true) : key;
};

/** The tabs under the home page's recent games: reorder them or hide the ones not used. */
const HomeTabSorter: FC = () => {
  const { get, set } = useSettings();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [switchLike, setSwitchLike] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = readHomeTabSettings(
        await get(HOME_TABS_SETTING, null),
        await get('home_tabs_hidden', null),
        await get('hide_whats_new', false)
      );
      setSwitchLike((await get(SWITCH_LIKE_HOME_SETTING, false)) === true);
      const seen = getSeenHomeTabs();
      const base = seen?.map((tab) => tab.key) ?? HOME_TABS.map((tab) => tab.id);
      const keys = [...saved.order.filter((key) => base.includes(key)), ...base.filter((key) => !saved.order.includes(key))];
      setEntries(keys.map((key) => ({
        key,
        title: localizeToken(seen?.find((tab) => tab.key === key)?.title || '') || knownTitle(key),
      })));
      setHidden(saved.hidden.filter((key) => keys.includes(key)));
    })();
  }, [get]);

  const sortEntries: SortEntry[] = useMemo(() => (entries ?? []).map((entry) => ({
    key: entry.key,
    title: entry.title,
    icon: <TabIcon id={entry.key} />,
  })), [entries]);

  if (!entries) return null;

  const save = (next: LibraryTabSettings) => {
    set(HOME_TABS_SETTING, next, true);
    setHomeTabSettings(next);
  };

  const reorder = (keys: string[]) => {
    setEntries(keys.map((key) => entries.find((entry) => entry.key === key)!));
    save({ order: keys, hidden });
  };

  // Hiding every tab is allowed: the home page then drops the tab row.
  const toggleHidden = (key: string) => {
    const next = hidden.includes(key) ? hidden.filter((x) => x !== key) : [...hidden, key];
    setHidden(next);
    save({ order: entries.map((entry) => entry.key), hidden: next });
    return true;
  };

  const reset = () => {
    const base = getSeenHomeTabs()?.map((tab) => tab.key) ?? HOME_TABS.map((tab) => tab.id);
    setEntries(base.map((key) => entries.find((entry) => entry.key === key)).filter((entry): entry is Entry => Boolean(entry)));
    setHidden([]);
    save({ order: [], hidden: [] });
  };

  return (
    <>
      {switchLike && (
        <div role="status" style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 8, borderRadius: 4,
          background: 'rgba(245,185,66,.12)', color: colors.warning, fontSize: 13,
        }}
        >
          <HomeIcon size={16} />
          {t('MSG_HOME_TABS_SWITCH_LIKE', 'Switch-like Home hides these tabs')}
        </div>
      )}
      <SortList
        entries={sortEntries}
        hidden={hidden}
        onReorder={reorder}
        onToggleHidden={toggleHidden}
        onReset={reset}
        disabled={switchLike}
      />
    </>
  );
};

export default HomeTabSorter;

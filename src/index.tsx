import { definePlugin, quickAccessMenuClasses, showModal } from '@decky/ui';
import { addEventListener, call, removeEventListener, routerHook } from '@decky/api';

import QuickAccessSettings from './components/qam-contents/QuickAccessSettings';
import MenuIcon from './components/Icons/MenuIcon';
import { SGDBProvider } from './hooks/useSGDB';
import { SettingsProvider } from './hooks/useSettings';
import SGDBPage from './components/plugin-pages/SGDBPage';
import TabsPage, { TABS_PAGE_ROUTE } from './components/plugin-pages/TabsPage';
import contextMenuPatch, { LibraryContextMenu } from './patches/contextMenuPatch';
import { removeSquareLibraryPatch, addSquareLibraryPatch } from './patches/squareLibraryPatch';
import { removeHomePatch, addHomePatch } from './patches/homePatch';
import { addCapsuleGlowPatch } from './patches/capsuleGlowPatch';
import { removeLibraryTabsPatch, setLibraryTabSettings } from './patches/libraryTabsPatch';
import {
  HOME_TABS_SETTING, readHomeTabSettings, removeHomeTabsPatch, setHomeTabSettings, setSwitchLikeHome, SWITCH_LIKE_HOME_SETTING,
} from './patches/homeTabsPatch';
import { LIBRARY_TABS_SETTING, readLibraryTabSettings } from './components/LibraryTabSorter';
import { removeStyles } from './utils/styleInjector';
import StoreArtworkModal from './modals/StoreArtworkModal';
import t from './utils/i18n';

export default definePlugin(() => {
  const getSetting = async (key: string, fallback: any): Promise<any> => {
    return await call('get_setting', key, fallback);
  };

  routerHook.addRoute('/steamgriddb/:appid/:assetType?', () => (
    <SettingsProvider>
      <SGDBProvider>
        <SGDBPage />
      </SGDBProvider>
    </SettingsProvider>
  ), {
    exact: true,
  });

  routerHook.addRoute(TABS_PAGE_ROUTE, () => (
    <SettingsProvider>
      <TabsPage />
    </SettingsProvider>
  ), {
    exact: true,
  });

  const menuPatches = contextMenuPatch(LibraryContextMenu);

  Promise.all([
    getSetting('squares', false),
    getSetting('uniform_featured', false),
  ]).then(([squares, uniformFeatured]: [boolean, boolean]) => {
    if (squares || uniformFeatured) {
      if (squares) {
        addSquareLibraryPatch(true);
      }
      addHomePatch(true, squares, uniformFeatured);
    }
  });

  getSetting('capsule_glow_amount', 100).then((amount) => {
    addCapsuleGlowPatch(parseInt(amount, 10));
  });

  getSetting(LIBRARY_TABS_SETTING, null).then((value) => {
    setLibraryTabSettings(readLibraryTabSettings(value));
  });

  getSetting(SWITCH_LIKE_HOME_SETTING, false).then((switchLike) => {
    setSwitchLikeHome(switchLike === true);
  });

  Promise.all([
    getSetting(HOME_TABS_SETTING, null),
    getSetting('home_tabs_hidden', null),
    getSetting('hide_whats_new', false),
  ]).then(([saved, legacyHidden, legacyWhatsNew]) => {
    setHomeTabSettings(readHomeTabSettings(saved, legacyHidden, legacyWhatsNew));
  });

  // The button the backend adds to store app pages reports clicks here.
  const storeArtworkListener = addEventListener<[appid: number]>('store_artwork', (appid) => {
    showModal(<StoreArtworkModal appid={appid} />, window);
  });
  call('set_store_button_label', t('ACTION_STORE_USE_FOR_SHORTCUT', 'Use for a Non-Steam Game'));

  return {
    title: <div className={quickAccessMenuClasses.Title}>SteamGridDB+</div>,
    content: <SettingsProvider><QuickAccessSettings /></SettingsProvider>,
    icon: <MenuIcon />,
    onDismount() {
      routerHook.removeRoute('/steamgriddb/:appid/:assetType?');
      routerHook.removeRoute(TABS_PAGE_ROUTE);
      menuPatches?.unpatch();

      removeSquareLibraryPatch(true);
      removeHomePatch(true);
      removeLibraryTabsPatch();
      removeHomeTabsPatch();
      removeEventListener('store_artwork', storeArtworkListener);

      removeStyles(
        'sgdb-square-capsules-library',
        'sgdb-square-capsules-home',
        'sgdb-capsule-glow',
        'sgdb-carousel-logo'
      );
    },
  };
});

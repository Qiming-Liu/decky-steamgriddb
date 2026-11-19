import {
  DialogBody,
  DialogButton,
  DialogButtonPrimary,
  DialogControlsSection,
  DialogFooter,
  DialogHeader,
  Dropdown,
  Field,
  ModalRoot,
  Spinner,
} from '@decky/ui';
import { call, fetchNoCors, toaster } from '@decky/api';
import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';
import { HiCheck, HiMinus, HiXMark } from 'react-icons/hi2';

import MenuIcon from '../components/Icons/MenuIcon';
import { ASSET_TYPE, SGDB_ASSET_TYPE_READABLE } from '../constants';
import getAppOverview from '../utils/getAppOverview';
import getCurrentSteamUserId from '../utils/getCurrentSteamUserId';
import getCustomLogoPosition from '../utils/getCustomLogoPosition';
import log from '../utils/log';
import showRestartConfirm from '../utils/showRestartConfirm';
import SteamLang from '../utils/steam-api-language-map';
import t from '../utils/i18n';

const ASSET_ORDER: SGDBAssetType[] = ['grid_p', 'grid_l', 'hero', 'logo', 'icon'];
const CDN = 'https://shared.steamstatic.com/store_item_assets/';
const ICON_CDN = 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/';
// Steam's own "Close"; a variable key keeps it out of the string dump.
const CLOSE_TOKEN = 'Generic_Close';

const assetGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: '8px',
  marginTop: '12px',
};
const assetPillStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '6px',
  padding: '10px',
  borderRadius: '4px',
  background: 'rgba(255, 255, 255, 0.06)',
  fontSize: '14px',
};
const assetNameStyle: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
// Always takes its space, so names do not shift when a status appears.
const statusIconStyle: CSSProperties = { flex: '0 0 16px', width: '16px', height: '16px' };
const footerStyle: CSSProperties = { display: 'flex', justifyContent: 'center', gap: '16px' };
const footerButtonStyle: CSSProperties = { flex: '0 1 200px', minWidth: 0 };

type StoreAssets = {
  asset_url_format?: string;
  library_capsule?: string;
  library_capsule_2x?: string;
  header?: string;
  header_2x?: string;
  library_hero?: string;
  library_hero_2x?: string;
  community_icon?: string;
};

type StoreGame = { name: string, urls: Record<SGDBAssetType, string[]> };
type Status = 'idle' | 'working' | 'done' | 'missing' | 'failed';

/** The game's official store artwork, best file first for each type. */
const loadStoreGame = async (appid: number): Promise<StoreGame | null> => {
  const language = SteamLang(window.LocalizationManager.m_rgLocalesToUse[0], 'webapi', 'api') || 'english';
  const input = {
    ids: [{ appid }],
    context: { language, country_code: 'US' },
    data_request: { include_assets: true },
  };
  const res = await fetchNoCors(`https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`);
  const item = (await res.json())?.response?.store_items?.[0];
  if (!item?.name) return null;

  const assets: StoreAssets = item.assets ?? {};
  const format = assets.asset_url_format ?? `steam/apps/${appid}/\${FILENAME}`;
  const file = (name?: string) => (name ? CDN + format.replace('${FILENAME}', name) : '');
  // The store data has no logo; Steam keeps unhashed copies of it next to the other files.
  const unhashed = (name: string) => `${CDN}steam/apps/${appid}/${name}`;
  const pick = (...urls: string[]) => urls.filter(Boolean);

  return {
    name: item.name,
    urls: {
      grid_p: pick(file(assets.library_capsule_2x), file(assets.library_capsule)),
      grid_l: pick(file(assets.header_2x), file(assets.header)),
      hero: pick(file(assets.library_hero_2x), file(assets.library_hero)),
      logo: [unhashed('logo_2x.png'), unhashed('logo.png')],
      icon: pick(assets.community_icon ? `${ICON_CDN}${appid}/${assets.community_icon}.jpg` : ''),
    },
  };
};

const download = async (urls: string[]): Promise<{ url: string, data: string } | null> => {
  for (const url of urls) {
    try {
      return { url, data: await call<[string], string>('download_as_base64', url) };
    } catch (err) {
      log('store artwork: not found', url, err);
    }
  }
  return null;
};

const StoreArtworkModal: FC<{ closeModal?: () => void, appid: number }> = ({ closeModal, appid }) => {
  const [game, setGame] = useState<StoreGame | null | undefined>(undefined);
  const [target, setTarget] = useState<number | null>(null);
  const [status, setStatus] = useState<Partial<Record<SGDBAssetType, Status>>>({});
  const [working, setWorking] = useState(false);

  const shortcuts = useMemo(() => {
    const apps: AppStoreAppOverview[] = (window as any).collectionStore?.deckDesktopApps?.allApps ?? [];
    return [...apps].sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, []);

  useEffect(() => {
    loadStoreGame(appid).then(setGame).catch((err) => {
      log('store artwork: store data failed', err);
      setGame(null);
    });
  }, [appid]);

  const apply = async () => {
    if (!game || target === null) return;
    setWorking(true);
    setStatus({});
    let needsRestart = false;
    for (const assetType of ASSET_ORDER) {
      setStatus((s) => ({ ...s, [assetType]: 'working' }));
      let result: Status = 'done';
      try {
        if (assetType === 'icon') {
          const url = game.urls.icon[0];
          if (!url) {
            result = 'missing';
          } else {
            const res = await call<[number, string, string], string | boolean>('set_shortcut_icon_from_url', target, getCurrentSteamUserId(), url);
            if (res === true) needsRestart = true;
          }
        } else {
          const file = await download(game.urls[assetType]);
          if (!file) {
            result = 'missing';
          } else {
            const eAssetType = ASSET_TYPE[assetType];
            await SteamClient.Apps.ClearCustomArtworkForApp(target, eAssetType);
            // Clearing resolves before it is done.
            await new Promise((resolve) => setTimeout(resolve, 500));
            await SteamClient.Apps.SetCustomArtworkForApp(target, file.data, /\.png(\?|$)/.test(file.url) ? 'png' : 'jpg', eAssetType);
            if (assetType === 'logo' && !(await getCustomLogoPosition(target))) {
              // A shortcut's logo stays blank until it has a position.
              const overview = await getAppOverview(target);
              if (overview) {
                await window.appDetailsStore.SaveCustomLogoPosition(overview, { pinnedPosition: 'BottomLeft', nWidthPct: 50, nHeightPct: 50 });
              }
            }
          }
        }
      } catch (err) {
        log('store artwork: apply failed', assetType, err);
        result = 'failed';
      }
      setStatus((s) => ({ ...s, [assetType]: result }));
    }
    setWorking(false);
    toaster.toast({
      title: shortcuts.find((app) => app.appid === target)?.display_name ?? game.name,
      body: t('MSG_STORE_ARTWORK_APPLIED', 'Official artwork applied'),
      icon: <MenuIcon />,
      duration: 1500,
    });
    if (needsRestart) showRestartConfirm();
  };

  const statusIcon = (assetType: SGDBAssetType, missing: boolean) => {
    const value = status[assetType];
    if (value === 'working') return <Spinner style={statusIconStyle} />;
    if (value === 'done') return <HiCheck style={{ ...statusIconStyle, color: '#59bf40' }} title={t('LABEL_STORE_ARTWORK_DONE', 'Applied')} />;
    if (value === 'failed') return <HiXMark style={{ ...statusIconStyle, color: '#d94126' }} title={t('LABEL_STORE_ARTWORK_FAILED', 'Failed')} />;
    if (missing) return <HiMinus style={statusIconStyle} title={t('LABEL_STORE_ARTWORK_MISSING', 'Not on the store')} />;
    return <span style={statusIconStyle} />;
  };

  return (
    <ModalRoot className="sgdb-modal" closeModal={closeModal}>
      <DialogHeader>{game?.name ?? t('TITLE_STORE_ARTWORK', 'Official Artwork')}</DialogHeader>
      <DialogBody>
        {game === undefined && <Spinner style={{ height: '48px' }} />}
        {game === null && <div>{t('MSG_STORE_ARTWORK_UNAVAILABLE', 'Could not load this game from the store.')}</div>}
        {game && (
          <DialogControlsSection>
            <Field label={t('LABEL_STORE_ARTWORK_TARGET', 'Non-Steam game')} childrenContainerWidth="max">
              {shortcuts.length > 0 ? (
                <Dropdown
                  rgOptions={shortcuts.map((app) => ({ data: app.appid, label: app.display_name }))}
                  selectedOption={target}
                  strDefaultLabel={t('LABEL_STORE_ARTWORK_PICK', 'Choose a game')}
                  disabled={working}
                  onChange={(option) => { setTarget(option.data); setStatus({}); }}
                />
              ) : t('LABEL_STORE_ARTWORK_NONE', 'No non-Steam games yet')}
            </Field>
            <div style={assetGridStyle}>
              {ASSET_ORDER.map((assetType) => {
                const missing = status[assetType] === 'missing' || game.urls[assetType].length === 0;
                return (
                  <div key={assetType} style={{ ...assetPillStyle, opacity: missing ? 0.45 : 1 }}>
                    <span style={assetNameStyle}>{SGDB_ASSET_TYPE_READABLE[assetType]}</span>
                    {statusIcon(assetType, missing)}
                  </div>
                );
              })}
            </div>
          </DialogControlsSection>
        )}
      </DialogBody>
      <DialogFooter>
        <div style={footerStyle}>
          <DialogButton style={footerButtonStyle} onClick={closeModal}>{t(CLOSE_TOKEN, 'Close', true)}</DialogButton>
          {game && (
            <DialogButtonPrimary style={footerButtonStyle} disabled={working || target === null} onClick={apply}>
              {t('ACTION_STORE_ARTWORK_APPLY', 'Apply')}
            </DialogButtonPrimary>
          )}
        </div>
      </DialogFooter>
    </ModalRoot>
  );
};

export default StoreArtworkModal;

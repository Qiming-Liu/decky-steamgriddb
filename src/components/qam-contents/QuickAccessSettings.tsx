import {
  PanelSection,
  PanelSectionRow,
  Navigation,
  Field,
  DialogButton,
  Focusable,
} from '@decky/ui';
import { FileSelectionType, openFilePicker } from '@decky/api';
import { useState, useEffect, VFC, useCallback, ReactNode } from 'react';

import t from '../../utils/i18n';
import { TABS_PAGE_ROUTE } from '../plugin-pages/TabsPage';
import useSettings from '../../hooks/useSettings';
import { addHomePatch, removeHomePatch } from '../../patches/homePatch';
import { SWITCH_LIKE_HOME_SETTING, setSwitchLikeHome } from '../../patches/homeTabsPatch';
import { rerenderAfterPatchUpdate } from '../../patches/patchUtils';
import { addSquareLibraryPatch, removeSquareLibraryPatch } from '../../patches/squareLibraryPatch';
import { addCapsuleGlowPatch } from '../../patches/capsuleGlowPatch';
import { DIMENSIONS } from '../../constants';
import { appgridClasses } from '../../static-classes';
import { colors, Glyph, GLYPH, PageStyle, PictureChoice } from '../ui/shell';
import { ChevronRightIcon, HomeIcon, ImageIcon, LibraryIcon } from '../ui/icons';
import {
  GlowArt, HomeDefaultArt, HomeSwitchArt, PortraitGridArt, RecentsDefaultArt, RecentsUniformArt, SquareGridArt,
} from '../ui/art';

const GLOW_STEPS = [0, 25, 50, 75, 100];

const squareGridSizes = DIMENSIONS.grid_p.options.filter((x) => {
  const [w,h] = x.value.split('x');
  return w === h;
}).map((x) => x.value);

// Set square/uniform featured game using logic written at 3am
const setPatches = (squares: boolean, uniformFeatured: boolean): void => {
  if (!uniformFeatured && !squares) {
    removeHomePatch();
  } else if (squares || uniformFeatured) {
    // Remove the home patch then patch it again
    removeHomePatch();
    addHomePatch(false, squares, uniformFeatured);
    if (squares) {
      addSquareLibraryPatch();
    }
  }
  if (!squares) {
    removeSquareLibraryPatch();
  }
};

/** A small heading: the icon of the screen it changes, then the setting's name. */
const Heading: VFC<{ icon: ReactNode; children: ReactNode; first?: boolean }> = ({ icon, children, first }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8, padding: `${first ? 4 : 18}px 2px 8px`,
    fontSize: 13, fontWeight: 600, color: colors.soft,
  }}
  >
    <span aria-hidden style={{ display: 'inline-flex', color: colors.muted }}>{icon}</span>
    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
  </div>
);

/** Opens the full-screen tab lists: library tabs and artwork tabs side by side. */
const TabsLink: VFC = () => {
  const open = () => {
    Navigation.Navigate(TABS_PAGE_ROUTE);
    Navigation.CloseSideMenus();
  };
  return (
    <DialogButton
      className="sgdb-ghost"
      onClick={open}
      style={{
        width: '100%', minWidth: 0, height: 48, marginTop: 18, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10,
        background: colors.well, color: colors.text, fontSize: 14, textAlign: 'left',
      }}
    >
      <span aria-hidden style={{ display: 'inline-flex', gap: 4, color: colors.muted }}>
        <LibraryIcon size={18} /><HomeIcon size={18} />
      </span>
      <span style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {t('LABEL_TABS_PAGE', 'Tabs')}
      </span>
      <ChevronRightIcon size={14} />
    </DialogButton>
  );
};

/** How to reach the artwork picker: game → options button → "Change Artwork...". */
const HowTo: VFC = () => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 4, background: colors.well,
    fontSize: 12, color: colors.muted,
  }}
  >
    <LibraryIcon size={16} />
    <ChevronRightIcon size={10} />
    <Glyph glyph={GLYPH.MENU} />
    <ChevronRightIcon size={10} />
    <ImageIcon size={16} color={colors.accentText} />
    <span style={{ minWidth: 0, color: colors.soft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {t('ACTION_CHANGE_ARTWORK', 'Change Artwork...')}
    </span>
  </div>
);

const QuickAccessSettings: VFC = () => {
  const { get, set } = useSettings();
  const [loaded, setLoaded] = useState(false);
  const [squares, setSquares] = useState<boolean>(false);
  const [uniformFeatured, setUniformFeatured] = useState<boolean>(false);
  const [capsuleGlowAmount, setCapsuleGlowAmount] = useState(100);
  const [switchLikeHome, setSwitchLikeHomeState] = useState(false);
  const [debugAppid] = useState('70');

  const handleSquareToggle = useCallback(async (checked: boolean) => {
    set('squares', checked, true);
    setSquares(checked);
    setPatches(checked, uniformFeatured);

    const currentFilters = await get('filters_grid_p', {});
    if (checked) {
      // only enable square
      currentFilters['dimensions'] = squareGridSizes;
    } else {
      // set to default
      currentFilters['dimensions'] = DIMENSIONS.grid_p.default;
    }
    set('filters_grid_p', currentFilters, true);
  }, [get, set, uniformFeatured]);

  const handleUniformFeaturedToggle = useCallback(async (checked: boolean) => {
    set('uniform_featured', checked, true);
    setUniformFeatured(checked);
    setPatches(squares, checked);
  }, [set, squares]);

  const handleCapsuleGlowChange = useCallback(async (val: number) => {
    set('capsule_glow_amount', val, true);
    addCapsuleGlowPatch(val);
    setCapsuleGlowAmount(val);
  }, [set]);

  const handleSwitchLikeHomeToggle = useCallback((checked: boolean) => {
    set(SWITCH_LIKE_HOME_SETTING, checked, true);
    setSwitchLikeHomeState(checked);
    setSwitchLikeHome(checked);
    rerenderAfterPatchUpdate();
  }, [set]);

  useEffect(() => {
    (async () => {
      setSwitchLikeHomeState((await get(SWITCH_LIKE_HOME_SETTING, false)) === true);
      setSquares(await get('squares', false));
      setUniformFeatured(await get('uniform_featured', false));
      setCapsuleGlowAmount(await get('capsule_glow_amount', 100));
      setLoaded(true);
    })();
  }, [get]);

  if (!loaded) return null;

  const defaultLabel = t('LABEL_CHOICE_DEFAULT', 'Default');

  return (
    <>
      <PageStyle />
      {process.env.ROLLUP_ENV === 'development' && (
        <PanelSection title="Debug">
          <PanelSectionRow>
            <Field
              padding="none"
              childrenContainerWidth="max"
            >
              <DialogButton onClick={() => {
                Navigation.Navigate('/zoo');
                Navigation.CloseSideMenus();
              }}
              >
              Zoo
              </DialogButton>
              <DialogButton onClick={() => {
                Navigation.Navigate(`/steamgriddb/${debugAppid}/manage`);
                Navigation.CloseSideMenus();
              }}
              >
                {debugAppid}
              </DialogButton>
              <DialogButton onClick={() => {
                openFilePicker(
                  FileSelectionType.FOLDER,
                  '/',
                  false,
                  true
                );
              }}
              >
              directory picker
              </DialogButton>
            </Field>
          </PanelSectionRow>
        </PanelSection>
      )}
      <PanelSection>
        <Focusable flow-children="column" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
          <HowTo />

          <Heading icon={<HomeIcon size={16} />}>{t('LABEL_SWITCH_LIKE_HOME', 'Switch-like Home')}</Heading>
          <PictureChoice
            value={switchLikeHome}
            onChange={handleSwitchLikeHomeToggle}
            choices={[
              { value: false, label: defaultLabel, art: <HomeDefaultArt /> },
              { value: true, label: 'Switch', art: <HomeSwitchArt /> },
            ]}
          />

          <Heading icon={<HomeIcon size={16} />}>{t('LABEL_UNIFORM_RECENT', 'Matching Recents Capsule')}</Heading>
          <PictureChoice
            value={uniformFeatured}
            onChange={handleUniformFeaturedToggle}
            choices={[
              { value: false, label: defaultLabel, art: <RecentsDefaultArt /> },
              { value: true, label: t('LABEL_CHOICE_MATCHING', 'Matching'), art: <RecentsUniformArt /> },
            ]}
          />

          <Heading icon={<LibraryIcon size={16} />}>{t('LABEL_SQUARE_CAPSULES', 'Square Capsules')}</Heading>
          <PictureChoice
            value={squares}
            onChange={handleSquareToggle}
            choices={[
              { value: false, label: t('LABEL_CHOICE_PORTRAIT', 'Portrait'), art: <PortraitGridArt /> },
              { value: true, label: t('LABEL_CHOICE_SQUARE', 'Square'), art: <SquareGridArt /> },
            ]}
          />

          {appgridClasses?.LibraryImageBackgroundGlow && (
            <>
              <Heading icon={<LibraryIcon size={16} />}>{t('LABEL_CAPSULE_GLOW', 'Capsule Glow')}</Heading>
              {/* Five strengths drawn as they look; a value set by an older version selects the nearest one. */}
              <PictureChoice
                compact
                value={GLOW_STEPS.reduce((best, step) => (Math.abs(step - capsuleGlowAmount) < Math.abs(best - capsuleGlowAmount) ? step : best))}
                onChange={handleCapsuleGlowChange}
                choices={GLOW_STEPS.map((step) => ({ value: step, label: `${step}%`, art: <GlowArt amount={step} /> }))}
              />
            </>
          )}

          <TabsLink />
        </Focusable>
      </PanelSection>
    </>
  );
};

export default QuickAccessSettings;

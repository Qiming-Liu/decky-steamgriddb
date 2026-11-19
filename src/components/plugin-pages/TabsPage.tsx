import { Focusable, Navigation } from '@decky/ui';
import { ReactNode, VFC } from 'react';

import t from '../../utils/i18n';
import LibraryTabSorter from '../LibraryTabSorter';
import HomeTabSorter from '../HomeTabSorter';
import { colors, IconButton, PageStyle } from '../ui/shell';
import { BackIcon, HomeIcon, LibraryIcon } from '../ui/icons';

export const TABS_PAGE_ROUTE = '/steamgriddb-tabs';

/** One column: the screen's icon, its name, then its list. */
const Column: VFC<{ icon: ReactNode; title: string; children: ReactNode }> = ({ icon, title, children }) => (
  <Focusable flow-children="column" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 4px 10px', fontSize: 15, fontWeight: 600, color: colors.soft }}>
      <span aria-hidden style={{ display: 'inline-flex', color: colors.accentText }}>{icon}</span>
      {title}
    </div>
    {children}
  </Focusable>
);

/**
 * The tab lists, opened from the Quick Access panel. They get a page of their
 * own because two long lists do not fit the narrow panel: Steam's library tabs
 * on the left, the home page's tabs on the right.
 */
const TabsPage: VFC = () => (
  <div style={{
    // Clear of Steam's status bar on top and button hints below.
    position: 'absolute', inset: 0, boxSizing: 'border-box', overflow: 'hidden',
    padding: 'clamp(48px, 8.5vh, 68px) clamp(24px, 4vw, 48px) clamp(52px, 8vh, 64px)',
    background: 'linear-gradient(180deg, #0e141b 0%, #151c24 100%)', color: colors.soft,
    display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2.2vh, 20px)',
  }}
  >
    <PageStyle />
    <Focusable flow-children="row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <IconButton label={t('Button_Back', 'Back', true)} style={{ background: colors.button, color: colors.text }} onClick={() => Navigation.NavigateBack()}>
        <BackIcon />
      </IconButton>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: colors.text }}>{t('LABEL_TABS_PAGE', 'Tabs')}</h1>
    </Focusable>
    <Focusable
      flow-children="row"
      style={{
        flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'clamp(20px, 3vw, 40px)',
      }}
    >
      <Column icon={<LibraryIcon size={20} />} title={t('LABEL_SETTINGS_LIBRARY_TABS', 'Library Tab Settings')}>
        {/* The library draws its tabs again when it opens after this page, so no redraw is needed. */}
        <LibraryTabSorter />
      </Column>
      <Column icon={<HomeIcon size={20} />} title={t('LABEL_SETTINGS_HOME_TABS', 'Home Tab Settings')}>
        <HomeTabSorter />
      </Column>
    </Focusable>
  </div>
);

export default TabsPage;

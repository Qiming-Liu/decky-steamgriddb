import { ReactNode } from 'react';

// Outline icons drawn on a 24px grid, sized and coloured by the caller.

interface IconProps { size?: number; color?: string; width?: number }

function icon(paths: ReactNode, defaultWidth = 2, fill?: boolean) {
  const Icon = ({ size = 18, color = 'currentColor', width = defaultWidth }: IconProps) => (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flex: '0 0 auto' }}
      fill={fill ? color : 'none'}
      stroke={fill ? 'none' : color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths}
    </svg>
  );
  return Icon;
}

export const GearIcon = icon(<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>);
export const BackIcon = icon(<path d="M15 5l-7 7 7 7" />, 2.4);
export const ChevronRightIcon = icon(<path d="M9 5l7 7-7 7" />, 2.2);
export const HomeIcon = icon(<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />);
export const LibraryIcon = icon(<><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="16" rx="1" /><path d="M17.5 5.5l3 14" /></>);
export const ImageIcon = icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>);
export const EyeIcon = icon(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>);
export const EyeOffIcon = icon(<><path d="M10.6 5.1A10 10 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-2.4 3.3M6.6 6.6A17 17 0 002 12s3.6 7 10 7a10 10 0 005.4-1.6" /><path d="M9.9 9.9a3 3 0 004.2 4.2M3 3l18 18" /></>);
export const MoveIcon = icon(<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />, 2.2);
export const ResetIcon = icon(<><path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8" /><path d="M3 3v5h5" /></>);
export const CheckIcon = icon(<path d="M5 12l5 5 9-10" />, 2.6);
export const FilterIcon = icon(<path d="M3 5h18l-7 8v6l-4 2v-8z" />);
export const BadgeIcon = icon(<><path d="M12 2l2.4 2.3 3.3-.4.6 3.3 2.9 1.6-1.5 3 1.5 3-2.9 1.6-.6 3.3-3.3-.4L12 22l-2.4-2.3-3.3.4-.6-3.3-2.9-1.6 1.5-3-1.5-3 2.9-1.6.6-3.3 3.3.4z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>, 1.8);
export const CrosshairIcon = icon(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8M8 12h8" /></>);
export const SlidersIcon = icon(<>
  <path d="M4 7h16M4 12h16M4 17h16" />
  <circle cx="9" cy="7" r="2" fill="#0e141b" /><circle cx="15" cy="12" r="2" fill="#0e141b" /><circle cx="8" cy="17" r="2" fill="#0e141b" />
</>);
export const MenuButtonIcon = icon(<path d="M5 7h14M5 12h14M5 17h14" />, 2.4);
export const GamepadIcon = icon(<><path d="M6 8h12a4 4 0 014 4v1a4 4 0 01-7 2.6L14 15h-4l-1 .6A4 4 0 012 13v-1a4 4 0 014-4z" /><path d="M7 11v3M5.5 12.5h3" /><circle cx="16" cy="11.5" r=".6" fill="currentColor" /><circle cx="18" cy="13.5" r=".6" fill="currentColor" /></>);

// One picture per Steam tab, so a list of tabs reads at a glance.
const StarOutline = icon(<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />);
const TAB_ICONS: Record<string, ReturnType<typeof icon>> = {
  GreatOnDeck: icon(<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>),
  AllGames: icon(<><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>),
  Installed: icon(<path d="M12 4v11M7 10l5 5 5-5M4 20h16" />),
  Favorites: StarOutline,
  Collections: icon(<><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M6 5h12M8 2h8" /></>),
  DesktopApps: icon(<><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>),
  Soundtracks: icon(<><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>),
  WhatsNew: icon(<><path d="M4 10v4a1 1 0 001 1h2l6 4V5L7 9H5a1 1 0 00-1 1z" /><path d="M17 9a4 4 0 010 6M19.5 6.5a8 8 0 010 11" /></>),
  Friends: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2a5 5 0 016 4.8" /></>),
  Recommended: icon(<path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 012 2v4h5.5a2 2 0 012 2.3l-1.2 7A2 2 0 0117.3 20H7" />),
};

/** The picture of a Steam library or home tab; a generic tab for ones Steam adds later. */
export function TabIcon({ id, size = 18 }: { id: string; size?: number }) {
  const Icon = TAB_ICONS[id] ?? LibraryIcon;
  return <Icon size={size} />;
}

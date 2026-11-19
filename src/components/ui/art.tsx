import { ReactNode } from 'react';

// Small drawings of the Steam screens a setting changes. They are pictures,
// not screenshots: just enough shape to see the difference at a glance.

const SCREEN = '#0e141b';
const TILE = '#3d4450';
const HOT = '#2f6fa3';
const PILL = '#262d36';

function Screen({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 96" width="100%" style={{ display: 'block', borderRadius: 4 }}>
      <rect width="160" height="96" rx="4" fill={SCREEN} />
      {/* Steam's top bar */}
      <rect x="0" y="0" width="160" height="7" fill="#171d25" />
      <circle cx="152" cy="3.5" r="1.6" fill={TILE} />
      <circle cx="146" cy="3.5" r="1.6" fill={TILE} />
      {children}
    </svg>
  );
}

const row = (count: number, x: number, y: number, w: number, h: number, gap: number) =>
  Array.from({ length: count }, (_, i) => <rect key={i} x={x + i * (w + gap)} y={y} width={w} height={h} rx="1.5" fill={TILE} />);

/** Home as Steam ships it: recent games on top, tabs and their content below. */
export const HomeDefaultArt = () => (
  <Screen>
    <rect x="8" y="13" width="42" height="30" rx="1.5" fill={HOT} />
    {row(5, 54, 17, 17, 26, 3)}
    <rect x="8" y="53" width="22" height="5" rx="2.5" fill="#4b5563" />
    <rect x="34" y="53" width="18" height="5" rx="2.5" fill={PILL} />
    <rect x="56" y="53" width="20" height="5" rx="2.5" fill={PILL} />
    <rect x="8" y="64" width="70" height="24" rx="1.5" fill={PILL} />
    <rect x="82" y="64" width="70" height="24" rx="1.5" fill={PILL} />
  </Screen>
);

/** The Switch-like home: an open screen with the games along the bottom. */
export const HomeSwitchArt = () => (
  <Screen>
    <rect x="8" y="51" width="44" height="4" rx="2" fill="#a9b1b8" />
    <rect x="6" y="59" width="26" height="26" rx="2" fill="none" stroke="#dcdedf" strokeWidth="1.4" />
    <rect x="8" y="61" width="22" height="22" rx="1.5" fill={HOT} />
    {row(5, 36, 61, 22, 22, 3)}
  </Screen>
);

/** The newest game drawn larger than the rest. */
export const RecentsDefaultArt = () => (
  <Screen>
    <rect x="8" y="22" width="56" height="42" rx="2" fill={HOT} />
    {row(4, 68, 28, 19, 36, 2.5)}
  </Screen>
);

/** Every recent game the same size. */
export const RecentsUniformArt = () => (
  <Screen>
    <rect x="8" y="28" width="19" height="36" rx="1.5" fill={HOT} />
    {row(6, 29.5, 28, 19, 36, 2.5)}
  </Screen>
);

export const PortraitGridArt = () => (
  <Screen>
    {row(6, 9, 14, 20, 30, 4)}
    {row(6, 9, 50, 20, 30, 4)}
  </Screen>
);

export const SquareGridArt = () => (
  <Screen>
    {row(6, 9, 13, 20, 20, 4)}
    {row(6, 9, 38, 20, 20, 4)}
    {row(6, 9, 63, 20, 20, 4)}
  </Screen>
);

/** One library capsule with Steam's coloured glow behind it at the given strength (0-100). */
export const GlowArt = ({ amount }: { amount: number }) => (
  // Cropped close around the capsule so the glow still reads on a small card.
  <svg aria-hidden="true" viewBox="44 0 72 80" width="100%" style={{ display: 'block', borderRadius: 4 }}>
    <defs>
      <linearGradient id="sgdb-glow-art" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff7a45" />
        <stop offset=".5" stopColor="#c04bd8" />
        <stop offset="1" stopColor="#1a9fff" />
      </linearGradient>
      <filter id="sgdb-glow-blur" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
    </defs>
    <rect width="160" height="96" rx="4" fill={SCREEN} />
    <rect x="62" y="16" width="36" height="58" rx="2" fill="url(#sgdb-glow-art)" filter="url(#sgdb-glow-blur)" opacity={amount / 100} />
    <rect x="64" y="14" width="32" height="48" rx="2" fill="url(#sgdb-glow-art)" />
    <rect x="68" y="50" width="24" height="4" rx="2" fill="rgba(255,255,255,.75)" />
  </svg>
);

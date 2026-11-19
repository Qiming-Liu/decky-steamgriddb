import { DialogButton, Focusable } from '@decky/ui';
import { forwardRef, ReactNode } from 'react';

import AdaptiveNavGlyph from '../AdaptiveNavGlyph';

import { CheckIcon } from './icons';

// Shared building blocks in DeckyGCM's look: dark gradient pages, thin-lined
// rows, square icon buttons and picture cards instead of long descriptions.

export const colors = {
  text: '#ffffff', soft: '#dcdedf', muted: '#8b929a', dim: '#6b7480', accent: '#1a9fff', accentText: '#7cc4ff',
  warning: '#f5b942', danger: '#e35b5b', surface: 'rgba(255,255,255,.04)', line: 'rgba(255,255,255,.08)',
  button: '#3d4450', well: 'rgba(0,0,0,.28)',
} as const;

// Inline backgrounds hide Steam's focus colour, so ghost buttons, rows and
// cards bring their own. Selectors stay plain classes: they are matched on
// every focus change, and a Deck has little CPU.
const css = `
.sgdb-ghost.gpfocus, .sgdb-solid.gpfocus { background: #dcdedf !important; color: #0e141b !important; }
.sgdb-row.gpfocuswithin { background: rgba(255,255,255,.08) !important; }
.sgdb-row-main.gpfocus { background: rgba(255,255,255,.06); }
.sgdb-glyph { display: inline-flex; align-items: center; height: 20px; }
.sgdb-glyph svg, .sgdb-glyph img { height: 20px !important; width: auto !important; }
.sgdb-card { transition: box-shadow 120ms ease, transform 120ms ease; }
.sgdb-card.gpfocus { box-shadow: 0 0 0 3px #dcdedf !important; transform: scale(1.02); }
@keyframes sgdb-shake {
  0% { transform: translateX(0) } 25% { transform: translateX(3px) } 50% { transform: translateX(-3px) }
  75% { transform: translateX(3px) } 100% { transform: translateX(0) }
}
`;
export const PageStyle = () => <style>{css}</style>;

/** A square icon-only button. */
export function IconButton({ label, style, children, active, shake, ...props }: Parameters<typeof DialogButton>[0] & {
  label: string; active?: boolean; shake?: boolean;
}) {
  return (
    <DialogButton
      {...props}
      aria-label={label}
      onOKActionDescription={label}
      className="sgdb-ghost"
      style={{
        width: 40, minWidth: 40, height: 40, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', color: active ? colors.accentText : '#a9b1b8',
        animation: shake ? '200ms sgdb-shake 2' : undefined, ...style,
      }}
    >
      {children}
    </DialogButton>
  );
}

/** A button with an icon in front of a short label. */
export const ToolButton = forwardRef<HTMLDivElement, Parameters<typeof DialogButton>[0] & { icon: ReactNode }>(({ icon, children, style, ...props }, ref) => (
  <DialogButton
    {...props}
    ref={ref}
    className="sgdb-solid"
    style={{
      width: 'auto', minWidth: 0, height: 40, padding: '0 14px', fontSize: 14, whiteSpace: 'nowrap', flex: '0 0 auto',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: colors.button, color: colors.text, ...style,
    }}
  >
    {icon}{children}
  </DialogButton>
));
ToolButton.displayName = 'ToolButton';

/**
 * Steam's glyph numbers. They are not GamepadButton's: the glyph component
 * counts A, B, X, Y from 0 and draws the D-pad as 4-7.
 */
export const GLYPH = { A: 0, B: 1, X: 2, Y: 3, LEFT: 4, RIGHT: 5, UP: 6, DOWN: 7, MENU: 11 } as const;
const GLYPH_TEXT: Record<number, string> = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: '←', 5: '→', 6: '↑', 7: '↓', 11: '≡' };

/** A controller button glyph, or its letter where Steam's glyphs are not found. */
export function Glyph({ glyph }: { glyph: number }) {
  return AdaptiveNavGlyph ? <span className="sgdb-glyph"><AdaptiveNavGlyph button={glyph} bAllowKeyboard /></span> : (
    <b style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, padding: '0 4px',
      boxSizing: 'border-box', borderRadius: 10, background: colors.button, color: colors.text, fontSize: 11,
    }}
    >{GLYPH_TEXT[glyph] ?? '?'}
    </b>
  );
}

/** A glyph followed by an icon: "press this to do that" without words. */
export function GlyphHint({ glyph, children }: { glyph: number; children?: ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <Glyph glyph={glyph} />{children}
    </span>
  );
}

export interface Choice<T> { value: T; label: string; art: ReactNode }

/**
 * Picture cards for one setting: each card shows what the screen will look
 * like, the chosen one has a blue ring and a check. One press picks a card.
 */
export function PictureChoice<T>({ choices, value, onChange, disabled, compact }: {
  choices: Choice<T>[]; value: T; onChange: (value: T) => void; disabled?: boolean;
  /** Smaller padding and text, for rows of many small cards. */
  compact?: boolean;
}) {
  return (
    <Focusable flow-children="row" style={{ display: 'grid', gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))`, gap: compact ? 6 : 12 }}>
      {choices.map((choice) => {
        const selected = choice.value === value;
        const pick = () => { if (!disabled && !selected) onChange(choice.value); };
        return (
          <Focusable
            key={String(choice.value)}
            className="sgdb-card"
            role="radio"
            aria-checked={selected}
            onActivate={pick}
            onClick={pick}
            style={{
              position: 'relative', boxSizing: 'border-box', borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
              background: selected ? 'rgba(26,159,255,.12)' : colors.well, opacity: disabled ? .5 : 1,
              boxShadow: selected ? `inset 0 0 0 2px ${colors.accent}` : `inset 0 0 0 1px ${colors.line}`,
            }}
          >
            <div style={{ padding: compact ? '6px 6px 2px' : '12px 12px 4px', lineHeight: 0 }}>{choice.art}</div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: compact ? '4px 2px 6px' : '6px 10px 10px',
              fontSize: compact ? 12 : 14, color: selected ? colors.text : colors.muted, fontWeight: selected ? 600 : 400,
            }}
            >
              {choice.label}
            </div>
            {selected && !compact && (
              <span aria-hidden style={{
                position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, background: colors.accent,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}
              ><CheckIcon size={14} width={3} />
              </span>
            )}
          </Focusable>
        );
      })}
    </Focusable>
  );
}

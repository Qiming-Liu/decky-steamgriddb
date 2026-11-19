import { Focusable, GamepadButton, GamepadEvent } from '@decky/ui';
import { ReactNode, useEffect, useRef, useState } from 'react';

import t from '../utils/i18n';

import { colors, GLYPH, GlyphHint, IconButton } from './ui/shell';
import { CheckIcon, EyeIcon, EyeOffIcon, MoveIcon, ResetIcon } from './ui/icons';

export interface SortEntry {
  key: string;
  title: string;
  icon?: ReactNode;
  /** A small grey tag after the title, e.g. "Empty". */
  badge?: string;
}

/**
 * A list of tabs to reorder and hide. A press picks a row up, the D-pad moves it, A drops it and B puts it
 * back. With a cursor, tapping another row drops the picked one there.
 */
export default function SortList({ entries, hidden, onReorder, onToggleHidden, onReset, disabled }: {
  entries: SortEntry[];
  hidden: string[];
  onReorder: (keys: string[]) => void;
  /** Returns false when the tab must stay visible; its button then shakes. */
  onToggleHidden: (key: string) => boolean;
  onReset: () => void;
  /** Shown dimmed and out of reach, e.g. while another setting hides these tabs. */
  disabled?: boolean;
}) {
  const [list, setList] = useState(entries);
  const [moving, setMoving] = useState(-1);
  const [shaking, setShaking] = useState<string | null>(null);
  const beforeMove = useRef<SortEntry[] | null>(null);

  useEffect(() => { setList(entries); }, [entries]);
  useEffect(() => {
    if (!shaking) return undefined;
    const timeout = setTimeout(() => setShaking(null), 400);
    return () => clearTimeout(timeout);
  }, [shaking]);

  const isMoving = moving >= 0;
  const finishMove = (next: SortEntry[]) => {
    beforeMove.current = null;
    setMoving(-1);
    setList(next);
    onReorder(next.map((entry) => entry.key));
  };
  const cancelMove = () => {
    if (beforeMove.current) setList(beforeMove.current);
    beforeMove.current = null;
    setMoving(-1);
  };
  // Rows are keyed by position: when the moving row swaps with its neighbour,
  // Steam's own focus step lands on the slot that now shows the moving row.
  const step = (direction: -1 | 1) => {
    const target = moving + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[moving], next[target]] = [next[target], next[moving]];
    setList(next);
    setMoving(target);
  };
  const activate = (index: number) => {
    if (!isMoving) {
      beforeMove.current = list;
      setMoving(index);
    } else if (moving === index) {
      finishMove(list);
    } else {
      const next = [...list];
      const [entry] = next.splice(moving, 1);
      next.splice(index, 0, entry);
      finishMove(next);
    }
  };
  const toggle = (key: string) => { if (!onToggleHidden(key)) setShaking(key); };

  const actionMove = t('ACTION_LIBRARY_TAB_MOVE', 'Move');
  const actionConfirm = t('ACTION_LIBRARY_TAB_CONFIRM', 'Confirm Position');
  const actionCancel = t('ACTION_LIBRARY_TAB_CANCEL', 'Cancel');
  const actionShow = t('ACTION_LIBRARY_TAB_SHOW', 'Show');
  const actionHide = t('ACTION_LIBRARY_TAB_HIDE', 'Hide');

  if (disabled) {
    return (
      <div aria-disabled style={{ opacity: .35, pointerEvents: 'none' }}>
        {list.map((entry) => (
          <div key={entry.key} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 10px', borderTop: `1px solid ${colors.line}` }}>
            <span aria-hidden style={{ display: 'inline-flex', color: colors.muted }}>{entry.icon}</span>
            <span style={{ fontSize: 15 }}>{entry.title}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Focusable flow-children="column">
      {/* What the buttons do, drawn as glyph + icon. */}
      <Focusable
        flow-children="row"
        style={{
          display: 'flex', alignItems: 'center', gap: 12, minHeight: 40, padding: '0 4px 0 10px', marginBottom: 6, borderRadius: 4,
          fontSize: 12, color: colors.muted,
          ...(isMoving ? { background: 'rgba(26,159,255,.16)', boxShadow: 'inset 0 0 0 1px rgba(124,196,255,.45)', color: colors.text } : {}),
        }}
      >
        {isMoving ? (
          <>
            <span style={{ flex: '1 1 auto', minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <MoveIcon size={16} color={colors.accentText} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{list[moving]?.title}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><GlyphHint glyph={GLYPH.UP} /><GlyphHint glyph={GLYPH.DOWN} /></span>
            <GlyphHint glyph={GLYPH.A}><CheckIcon size={14} /></GlyphHint>
            <GlyphHint glyph={GLYPH.B}><ResetIcon size={14} /></GlyphHint>
          </>
        ) : (
          <>
            <span style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <GlyphHint glyph={GLYPH.A}><MoveIcon size={14} /></GlyphHint>
              <GlyphHint glyph={GLYPH.X}><EyeOffIcon size={14} /></GlyphHint>
            </span>
            <IconButton label={t('ACTION_LIBRARY_TABS_RESET', 'Reset to Default')} onClick={onReset} style={{ width: 34, minWidth: 34, height: 34 }}>
              <ResetIcon size={16} />
            </IconButton>
          </>
        )}
      </Focusable>
      {list.map((entry, index) => {
        const picked = index === moving;
        const isHidden = hidden.includes(entry.key);
        return (
          <Focusable
            key={index}
            flow-children="row"
            className="sgdb-row"
            style={{ display: 'flex', alignItems: 'center', gap: 2, borderTop: `1px solid ${colors.line}`, borderRadius: 3 }}
          >
            <Focusable
              className="sgdb-row-main"
              onActivate={() => activate(index)}
              onClick={() => activate(index)}
              onOKActionDescription={!isMoving ? actionMove : picked ? actionConfirm : t('ACTION_LIBRARY_TAB_PLACE_HERE', 'Move Here')}
              onSecondaryButton={isMoving ? undefined : () => toggle(entry.key)}
              onSecondaryActionDescription={isMoving ? undefined : isHidden ? actionShow : actionHide}
              onCancelButton={isMoving ? (evt: GamepadEvent) => { evt.stopPropagation(); cancelMove(); } : undefined}
              onCancelActionDescription={isMoving ? actionCancel : undefined}
              onButtonDown={(evt: GamepadEvent) => {
                if (!picked) return;
                if (evt.detail.button === GamepadButton.DIR_UP) step(-1);
                if (evt.detail.button === GamepadButton.DIR_DOWN) step(1);
              }}
              style={{
                flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 10px', borderRadius: 3,
                cursor: 'pointer', color: isHidden ? colors.dim : colors.text,
                ...(picked ? { background: 'rgba(26,159,255,.2)', boxShadow: `inset 0 0 0 2px ${colors.accent}` } : {}),
              }}
            >
              <span aria-hidden style={{ display: 'inline-flex', color: picked ? colors.accentText : isHidden ? colors.dim : colors.muted }}>
                {picked ? <MoveIcon size={18} /> : entry.icon}
              </span>
              <span style={{
                flex: '0 1 auto', minWidth: 0, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                textDecoration: isHidden ? 'line-through' : undefined,
              }}
              >{entry.title}
              </span>
              {entry.badge && (
                <span style={{ flex: '0 0 auto', fontSize: 11, color: colors.muted, padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,.08)' }}>
                  {entry.badge}
                </span>
              )}
            </Focusable>
            <IconButton
              label={isHidden ? actionShow : actionHide}
              focusable={!isMoving}
              disabled={isMoving}
              shake={shaking === entry.key}
              onClick={() => toggle(entry.key)}
              style={{ width: 36, minWidth: 36, height: 36 }}
            >
              {isHidden ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
            </IconButton>
          </Focusable>
        );
      })}
    </Focusable>
  );
}

// "Book shape" control for the editor's tool row: a button that opens a list of square, tall and wide.
// The list works with the keyboard: arrows move, Enter or Space picks, Escape closes.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { PAGE_SHAPES, PAGE_SHAPE_MM } from '../constants';
import { useT } from '../i18n';
import type { PageShape } from '../types';
import { usePopover } from './use_popover';

const ICON_SIZE = 22;
/** Longest side of the shape outline inside the 24-unit icon. */
const ICON_LONG_SIDE = 18;
const ICON_CENTER = 12;
const LIST_ID = 'shape-list';

/** Outline of a page in the given shape, drawn to scale. */
export function ShapeIcon({ shape }: { shape: PageShape }) {
  const size = PAGE_SHAPE_MM[shape];
  const scale = ICON_LONG_SIDE / Math.max(size.w, size.h);
  const width = size.w * scale;
  const height = size.h * scale;
  return (
    <svg aria-hidden="true" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x={ICON_CENTER - width / 2} y={ICON_CENTER - height / 2} width={width} height={height} rx="2" />
    </svg>
  );
}

interface ShapeMenuProps {
  value: PageShape;
  on_change: (shape: PageShape) => void;
}

/** Button showing the current shape, and a list to pick another. */
export function ShapeMenu({ value, on_change }: ShapeMenuProps) {
  const t = useT();
  const button_ref = useRef<HTMLButtonElement>(null);
  const list_ref = useRef<HTMLUListElement>(null);
  const popover = usePopover<HTMLDivElement>(button_ref);
  const [active, set_active] = useState<PageShape>(value);

  // Keyboard focus moves into the list when it opens.
  useEffect(() => {
    if (popover.is_open) list_ref.current?.focus();
  }, [popover.is_open]);

  const open_list = () => {
    set_active(value);
    popover.open();
  };

  const pick = (shape: PageShape) => {
    on_change(shape);
    popover.close(true);
  };

  const handle_button_key = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open_list();
    }
  };

  const handle_list_key = (event: KeyboardEvent<HTMLUListElement>) => {
    const index = PAGE_SHAPES.indexOf(active);
    const last = PAGE_SHAPES.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowDown') next = Math.min(index + 1, last);
    else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next !== null) {
      event.preventDefault();
      set_active(PAGE_SHAPES[next] ?? active);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pick(active);
    } else if (event.key === 'Tab') {
      popover.close();
    }
  };

  return (
    <div className="shape-menu" ref={popover.wrap_ref}>
      <button
        ref={button_ref}
        type="button"
        className="btn small shape-menu-button"
        aria-haspopup="listbox"
        aria-expanded={popover.is_open}
        aria-controls={LIST_ID}
        aria-label={t('editor.shape_aria', { name: t(`editor.shape.${value}`) })}
        onClick={() => (popover.is_open ? popover.close() : open_list())}
        onKeyDown={handle_button_key}
      >
        <ShapeIcon shape={value} />
        <span className="btn-text">{t('editor.shape')}</span>
      </button>
      {popover.is_open && (
        <ul
          ref={list_ref}
          id={LIST_ID}
          className={popover.opens_up ? 'shape-menu-list up' : 'shape-menu-list'}
          role="listbox"
          tabIndex={-1}
          aria-label={t('editor.shape')}
          aria-activedescendant={`shape-option-${active}`}
          onKeyDown={handle_list_key}
        >
          {PAGE_SHAPES.map((shape) => (
            <li
              key={shape}
              id={`shape-option-${shape}`}
              role="option"
              aria-selected={shape === value}
              className={shape === active ? 'shape-menu-option active' : 'shape-menu-option'}
              onPointerEnter={() => set_active(shape)}
              onClick={() => pick(shape)}
            >
              <ShapeIcon shape={shape} />
              <span>{t(`editor.shape.${shape}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

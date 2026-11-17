// Open/close state for a small pop-up list under a button: closes on Escape or a click outside,
// and opens upward when there is not enough room below.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** Room (px) a list needs below its button before it opens upward instead. */
const ROOM_BELOW_PX = 320;

export interface Popover<T extends HTMLElement> {
  is_open: boolean;
  /** True when the list should open above the button. */
  opens_up: boolean;
  /** Wraps the button and the list; clicks inside it do not close the list. */
  wrap_ref: RefObject<T | null>;
  open: () => void;
  /** Closes the list; with return_focus the focus goes back to the element given to focus_on_close. */
  close: (return_focus?: boolean) => void;
  toggle: () => void;
}

/** Popover state; focus_target is focused when the list is closed with Escape. */
export function usePopover<T extends HTMLElement>(focus_target?: RefObject<HTMLElement | null>): Popover<T> {
  const wrap_ref = useRef<T | null>(null);
  const [is_open, set_open] = useState(false);
  const [opens_up, set_opens_up] = useState(false);

  const close = useCallback(
    (return_focus = false) => {
      set_open(false);
      if (return_focus) focus_target?.current?.focus();
    },
    [focus_target],
  );

  const open = useCallback(() => {
    const box = wrap_ref.current?.getBoundingClientRect();
    set_opens_up(box !== undefined && window.innerHeight - box.bottom < ROOM_BELOW_PX && box.top > window.innerHeight - box.bottom);
    set_open(true);
  }, []);

  const toggle = useCallback(() => (is_open ? close() : open()), [is_open, close, open]);

  useEffect(() => {
    if (!is_open) return undefined;
    const handle_pointer = (event: PointerEvent) => {
      if (wrap_ref.current && !wrap_ref.current.contains(event.target as Node)) close();
    };
    const handle_key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };
    document.addEventListener('pointerdown', handle_pointer);
    document.addEventListener('keydown', handle_key);
    return () => {
      document.removeEventListener('pointerdown', handle_pointer);
      document.removeEventListener('keydown', handle_key);
    };
  }, [is_open, close]);

  return { is_open, opens_up, wrap_ref, open, close, toggle };
}

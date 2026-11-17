// Open/close state and placement for a small pop-up list under a button. The list is rendered into
// document.body (see PopoverLayer) with position: fixed, so it never makes the page itself taller: once open,
// its real size is measured and it is placed below or above the button, kept inside the window, and scrolls
// inside itself when the window is too short. Escape or a click outside closes it.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Space (px) between the button and the list, and kept clear at the window edges. */
const LIST_GAP_PX = 6;
const WINDOW_MARGIN_PX = 8;
/** Below this many px of room on both sides, the list uses the whole window height instead. */
const LIST_MIN_HEIGHT_PX = 160;

/** Which edge of the button the list lines up with. */
export type PopoverAlign = 'start' | 'end';

export interface Popover<T extends HTMLElement, L extends HTMLElement> {
  is_open: boolean;
  /** Wraps the button; clicks inside it or inside the list do not close the list. */
  wrap_ref: RefObject<T | null>;
  /** The pop-up list element. */
  list_ref: RefObject<L | null>;
  open: () => void;
  /** Closes the list; with return_focus the focus goes back to the element given to focus_target. */
  close: (return_focus?: boolean) => void;
  toggle: () => void;
}

/**
 * Places the list next to the anchor rect, inside the window. Exported for tests.
 * Returns the top, left and the max height (null when the whole list fits).
 */
export function place_popover(
  anchor: { top: number; bottom: number; left: number; right: number },
  list: { width: number; height: number },
  view: { width: number; height: number },
  align: PopoverAlign,
): { top: number; left: number; max_height: number | null } {
  const room_below = view.height - anchor.bottom - LIST_GAP_PX - WINDOW_MARGIN_PX;
  const room_above = anchor.top - LIST_GAP_PX - WINDOW_MARGIN_PX;
  let top: number;
  let max_height: number | null = null;
  if (list.height <= room_below) top = anchor.bottom + LIST_GAP_PX;
  else if (list.height <= room_above) top = anchor.top - LIST_GAP_PX - list.height;
  else if (Math.max(room_below, room_above) < LIST_MIN_HEIGHT_PX) {
    top = WINDOW_MARGIN_PX;
    max_height = Math.max(0, view.height - WINDOW_MARGIN_PX * 2);
  } else if (room_below >= room_above) {
    top = anchor.bottom + LIST_GAP_PX;
    max_height = room_below;
  } else {
    top = WINDOW_MARGIN_PX;
    max_height = room_above;
  }
  const wanted_left = align === 'end' ? anchor.right - list.width : anchor.left;
  const left = Math.max(WINDOW_MARGIN_PX, Math.min(wanted_left, view.width - WINDOW_MARGIN_PX - list.width));
  return { top, left, max_height };
}

/** Measures the anchor and the list and writes the list's place into its style. */
function place_list(anchor_element: HTMLElement, list_element: HTMLElement, align: PopoverAlign): void {
  const anchor = anchor_element.getBoundingClientRect();
  list_element.style.minWidth = `${anchor.width}px`;
  // Measure the list at its natural height before limiting it.
  list_element.style.maxHeight = '';
  const size = list_element.getBoundingClientRect();
  const view = { width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight };
  const place = place_popover(anchor, size, view, align);
  list_element.style.top = `${place.top}px`;
  list_element.style.left = `${place.left}px`;
  list_element.style.maxHeight = place.max_height === null ? '' : `${place.max_height}px`;
}

/** Popover state; focus_target is focused when the list is closed with Escape. */
export function usePopover<T extends HTMLElement, L extends HTMLElement = HTMLDivElement>(
  focus_target?: RefObject<HTMLElement | null>,
  align: PopoverAlign = 'start',
): Popover<T, L> {
  const wrap_ref = useRef<T | null>(null);
  const list_ref = useRef<L | null>(null);
  const [is_open, set_open] = useState(false);

  const close = useCallback(
    (return_focus = false) => {
      set_open(false);
      if (return_focus) focus_target?.current?.focus();
    },
    [focus_target],
  );
  const open = useCallback(() => set_open(true), []);
  const toggle = useCallback(() => (is_open ? close() : open()), [is_open, close, open]);

  // Place the list before the browser paints it, then again whenever the window, a scroll or the list itself changes.
  useLayoutEffect(() => {
    if (!is_open) return undefined;
    const place = () => {
      if (wrap_ref.current && list_ref.current) place_list(wrap_ref.current, list_ref.current, align);
    };
    place();
    let frame = 0;
    const place_soon = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place_soon);
    if (observer && list_ref.current) observer.observe(list_ref.current);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [is_open, align]);

  useEffect(() => {
    if (!is_open) return undefined;
    const is_inside = (target: EventTarget | null) =>
      target instanceof Node && (wrap_ref.current?.contains(target) === true || list_ref.current?.contains(target) === true);
    const handle_pointer = (event: PointerEvent) => {
      if (!is_inside(event.target)) close();
    };
    const handle_key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      } else if (event.key === 'Tab' && list_ref.current?.contains(document.activeElement)) {
        // The list lives at the end of the page, so Tab out of it goes back to its button instead.
        const items = Array.from(list_ref.current.querySelectorAll<HTMLElement>('button, textarea, input, [tabindex="0"]'));
        const at_edge = event.shiftKey ? document.activeElement === items[0] : document.activeElement === items[items.length - 1];
        if (at_edge) {
          event.preventDefault();
          close(true);
        }
      }
    };
    document.addEventListener('pointerdown', handle_pointer);
    document.addEventListener('keydown', handle_key);
    return () => {
      document.removeEventListener('pointerdown', handle_pointer);
      document.removeEventListener('keydown', handle_key);
    };
  }, [is_open, close]);

  return { is_open, wrap_ref, list_ref, open, close, toggle };
}

// Dragging and arrow-key control shared by the editor's text box and picture box.
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { KEY_MOVE_BIG_STEP, KEY_MOVE_STEP } from '../constants';
import type { Rect } from '../types';
import { move_box, type Corner, type SnapResult } from './geometry';

const PERCENT = 100;
/** Movement (px) needed to start a drag; anything smaller counts as a click. */
const DRAG_THRESHOLD_PX = 5;
/** Only this corner handle is keyboard-focusable. */
export const KEYBOARD_RESIZE_CORNER: Corner = 'se';
export const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];

interface DragState {
  mode: 'move' | Corner;
  start_x: number;
  start_y: number;
  start_rect: Rect;
  active: boolean;
}

export interface BoxDragOptions {
  rect: Rect;
  /** Page width in px; the page height is width * aspect. */
  size: number;
  aspect: number;
  /** Part of the undo key, so one drag is one undo step. */
  key_prefix: string;
  on_rect: (rect: Rect, change_key: string) => void;
  /** How a corner drag changes the box (free, or keeping the picture's proportions). */
  resize: (start: Rect, corner: Corner, dx: number, dy: number) => SnapResult;
}

export interface BoxDrag {
  is_dragging: boolean;
  guides: { x: number | null; y: number | null };
  begin_drag: (event: ReactPointerEvent, mode: 'move' | Corner) => void;
  handle_move_key: (event: ReactKeyboardEvent) => void;
  handle_resize_key: (event: ReactKeyboardEvent) => void;
  clear_guides: () => void;
}

/** Arrow key to a step in percent; Shift makes it the big step. */
function arrow_delta(event: ReactKeyboardEvent): { dx: number; dy: number } | null {
  const step = event.shiftKey ? KEY_MOVE_BIG_STEP : KEY_MOVE_STEP;
  if (event.key === 'ArrowLeft') return { dx: -step, dy: 0 };
  if (event.key === 'ArrowRight') return { dx: step, dy: 0 };
  if (event.key === 'ArrowUp') return { dx: 0, dy: -step };
  if (event.key === 'ArrowDown') return { dx: 0, dy: step };
  return null;
}

/** Pointer drag (move or resize by a corner) and arrow keys for one box. */
export function useBoxDrag({ rect, size, aspect, key_prefix, on_rect, resize }: BoxDragOptions): BoxDrag {
  const drag_ref = useRef<DragState | null>(null);
  const [is_dragging, set_is_dragging] = useState(false);
  const [guides, set_guides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  // Window listeners live for the whole drag, so they read the latest props through a ref.
  const latest = useRef({ size, aspect, on_rect, resize, key_prefix });
  useEffect(() => {
    latest.current = { size, aspect, on_rect, resize, key_prefix };
  });

  const apply_result = (result: SnapResult, change_key: string) => {
    set_guides({ x: result.guide_x, y: result.guide_y });
    latest.current.on_rect(result.rect, change_key);
  };

  /** Arms a drag; it only becomes active after moving past DRAG_THRESHOLD_PX. */
  const begin_drag = (event: ReactPointerEvent, mode: 'move' | Corner) => {
    if (event.button !== 0) return;
    const drag_id = `${mode}:${latest.current.key_prefix}:${Date.now()}`;
    drag_ref.current = { mode, start_x: event.clientX, start_y: event.clientY, start_rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, active: false };

    const handle_move = (move_event: PointerEvent) => {
      const drag = drag_ref.current;
      if (!drag) return;
      const dx_px = move_event.clientX - drag.start_x;
      const dy_px = move_event.clientY - drag.start_y;
      if (!drag.active) {
        if (Math.hypot(dx_px, dy_px) < DRAG_THRESHOLD_PX) return;
        drag.active = true;
        set_is_dragging(true);
        window.getSelection()?.removeAllRanges();
      }
      move_event.preventDefault();
      const { size: width, aspect: page_aspect } = latest.current;
      const dx = (dx_px / width) * PERCENT;
      const dy = (dy_px / (width * page_aspect)) * PERCENT;
      const result = drag.mode === 'move' ? move_box(drag.start_rect, dx, dy) : latest.current.resize(drag.start_rect, drag.mode, dx, dy);
      apply_result(result, drag_id);
    };

    const handle_up = () => {
      drag_ref.current = null;
      set_is_dragging(false);
      set_guides({ x: null, y: null });
      window.removeEventListener('pointermove', handle_move);
      window.removeEventListener('pointerup', handle_up);
      window.removeEventListener('pointercancel', handle_up);
    };

    window.addEventListener('pointermove', handle_move, { passive: false });
    window.addEventListener('pointerup', handle_up);
    window.addEventListener('pointercancel', handle_up);
  };

  const handle_move_key = (event: ReactKeyboardEvent) => {
    const delta = arrow_delta(event);
    if (!delta) return;
    event.preventDefault();
    apply_result(move_box(rect, delta.dx, delta.dy, false), `key-move:${key_prefix}`);
  };

  const handle_resize_key = (event: ReactKeyboardEvent) => {
    const delta = arrow_delta(event);
    if (!delta) return;
    event.preventDefault();
    apply_result(resize(rect, KEYBOARD_RESIZE_CORNER, delta.dx, delta.dy), `key-resize:${key_prefix}`);
  };

  return { is_dragging, guides, begin_drag, handle_move_key, handle_resize_key, clear_guides: () => set_guides({ x: null, y: null }) };
}

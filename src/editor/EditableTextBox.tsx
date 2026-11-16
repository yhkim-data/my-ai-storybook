// Editor text box: click to edit in place, drag to move, drag a corner to resize.
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { rect_style, text_box_class, text_box_style } from '../components/PageView';
import { KEY_MOVE_STEP } from '../constants';
import { useT } from '../i18n';
import type { BookPage, Rect } from '../types';
import { move_box, resize_box, type Corner, type SnapResult } from './geometry';

const PERCENT = 100;
/** Movement (px) needed to start a drag; anything smaller counts as a click to edit text. */
const DRAG_THRESHOLD_PX = 5;
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];
/** Only this corner handle is keyboard-focusable. */
const KEYBOARD_RESIZE_CORNER: Corner = 'se';

interface DragState {
  mode: 'move' | Corner;
  start_x: number;
  start_y: number;
  start_rect: Rect;
  active: boolean;
}

interface EditableTextBoxProps {
  page: BookPage;
  /** Page side length (px). */
  size: number;
  /** Page name used in the accessible label. */
  name: string;
  on_text: (text: string) => void;
  /** Changes with the same change_key are merged into one undo step. */
  on_rect: (rect: Rect, change_key: string) => void;
  /** Called when text editing ends; closes the current undo group. */
  on_edit_end: () => void;
}

function arrow_delta(key: string): { dx: number; dy: number } | null {
  if (key === 'ArrowLeft') return { dx: -KEY_MOVE_STEP, dy: 0 };
  if (key === 'ArrowRight') return { dx: KEY_MOVE_STEP, dy: 0 };
  if (key === 'ArrowUp') return { dx: 0, dy: -KEY_MOVE_STEP };
  if (key === 'ArrowDown') return { dx: 0, dy: KEY_MOVE_STEP };
  return null;
}

/** Editable text box, rendered as an overlay on PageView. */
export function EditableTextBox({ page, size, name, on_text, on_rect, on_edit_end }: EditableTextBoxProps) {
  const t = useT();
  const box = page.text_box;
  const drag_ref = useRef<DragState | null>(null);
  const [is_dragging, set_is_dragging] = useState(false);
  const [guides, set_guides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  // Window listeners live for the whole drag, so they read the latest props through a ref.
  const latest = useRef({ size, on_rect, page_id: page.id });
  useEffect(() => {
    latest.current = { size, on_rect, page_id: page.id };
  });

  const apply_result = (result: SnapResult, change_key: string) => {
    set_guides({ x: result.guide_x, y: result.guide_y });
    latest.current.on_rect(result.rect, change_key);
  };

  /** Arms a drag; it only becomes active after moving past DRAG_THRESHOLD_PX. */
  const begin_drag = (event: ReactPointerEvent, mode: DragState['mode']) => {
    if (event.button !== 0) return;
    const drag_id = `${mode}:${latest.current.page_id}:${Date.now()}`;
    drag_ref.current = {
      mode,
      start_x: event.clientX,
      start_y: event.clientY,
      start_rect: { x: box.x, y: box.y, w: box.w, h: box.h },
      active: false,
    };

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
      const dx = (dx_px / latest.current.size) * PERCENT;
      const dy = (dy_px / latest.current.size) * PERCENT;
      const result = drag.mode === 'move' ? move_box(drag.start_rect, dx, dy) : resize_box(drag.start_rect, drag.mode, dx, dy);
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
    const delta = arrow_delta(event.key);
    if (!delta) return;
    event.preventDefault();
    apply_result(move_box(box, delta.dx, delta.dy), `key-move:${page.id}`);
  };

  const handle_resize_key = (event: ReactKeyboardEvent) => {
    const delta = arrow_delta(event.key);
    if (!delta) return;
    event.preventDefault();
    apply_result(resize_box(box, KEYBOARD_RESIZE_CORNER, delta.dx, delta.dy), `key-resize:${page.id}`);
  };

  return (
    <>
      {guides.x !== null && <span className="snap-guide vertical" style={{ left: `${guides.x}%` }} aria-hidden="true" />}
      {guides.y !== null && <span className="snap-guide horizontal" style={{ top: `${guides.y}%` }} aria-hidden="true" />}
      <div
        className={`${text_box_class(box)} editor-box${is_dragging ? ' dragging' : ''}`}
        style={{ ...rect_style(box, size), ...text_box_style(box, size) }}
        onPointerDown={(event) => begin_drag(event, 'move')}
        data-testid="text-box"
      >
        <textarea
          className="editor-text"
          value={page.text}
          placeholder={t('editor.text_placeholder')}
          aria-label={t('editor.text_aria', { name })}
          onChange={(event) => on_text(event.target.value)}
          onBlur={on_edit_end}
          spellCheck={false}
        />
        {box.background === 'bubble' && <span className="bubble-tail" aria-hidden="true" />}
        <button
          type="button"
          className="box-grip"
          aria-label={t('editor.move_handle')}
          onKeyDown={handle_move_key}
          onBlur={() => set_guides({ x: null, y: null })}
          data-testid="box-move"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2v14M2 9h14M9 2l-2 2M9 2l2 2M9 16l-2-2M9 16l2-2M2 9l2-2M2 9l2 2M16 9l-2-2M16 9l-2 2" />
          </svg>
        </button>
        {CORNERS.map((corner) =>
          corner === KEYBOARD_RESIZE_CORNER ? (
            <button
              key={corner}
              type="button"
              className={`box-handle ${corner}`}
              aria-label={t('editor.resize_handle')}
              onPointerDown={(event) => {
                event.stopPropagation();
                begin_drag(event, corner);
              }}
              onKeyDown={handle_resize_key}
              onBlur={() => set_guides({ x: null, y: null })}
              data-testid="box-resize"
            />
          ) : (
            <span
              key={corner}
              className={`box-handle ${corner}`}
              aria-hidden="true"
              onPointerDown={(event) => {
                event.stopPropagation();
                begin_drag(event, corner);
              }}
            />
          ),
        )}
      </div>
    </>
  );
}

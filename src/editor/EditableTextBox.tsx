// 꾸미기 화면의 글상자. 누르면 그 자리에서 글을 고치고, 끌면 옮기고, 모서리를 끌면 크기를 바꾼다.
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { rect_style, text_box_class, text_box_style } from '../components/PageView';
import { KEY_MOVE_STEP } from '../constants';
import { useT } from '../i18n';
import type { BookPage, Rect } from '../types';
import { move_box, resize_box, type Corner, type SnapResult } from './geometry';

const PERCENT = 100;
/** 이만큼(px) 움직여야 끌기로 본다. 그보다 작으면 글을 고치려고 누른 것이다. */
const DRAG_THRESHOLD_PX = 5;
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];
/** 키보드로 다루는 크기 손잡이 */
const KEYBOARD_RESIZE_CORNER: Corner = 'se';

/** 끌기 한 번의 상태 */
interface DragState {
  mode: 'move' | Corner;
  start_x: number;
  start_y: number;
  start_rect: Rect;
  active: boolean;
}

interface EditableTextBoxProps {
  page: BookPage;
  /** 쪽 한 변의 길이(px) */
  size: number;
  /** 쪽 이름 (읽어 주는 이름에 쓴다) */
  name: string;
  on_text: (text: string) => void;
  /** 글상자 자리가 바뀔 때. change_key가 같으면 되돌리기 한 단계로 묶인다. */
  on_rect: (rect: Rect, change_key: string) => void;
  /** 글 고치기를 마쳤을 때 (되돌리기 묶음을 끊는다) */
  on_edit_end: () => void;
}

/**
 * 화살표 키를 (dx, dy) 방향으로 바꾼다. 화살표가 아니면 null이다.
 */
function arrow_delta(key: string): { dx: number; dy: number } | null {
  if (key === 'ArrowLeft') return { dx: -KEY_MOVE_STEP, dy: 0 };
  if (key === 'ArrowRight') return { dx: KEY_MOVE_STEP, dy: 0 };
  if (key === 'ArrowUp') return { dx: 0, dy: -KEY_MOVE_STEP };
  if (key === 'ArrowDown') return { dx: 0, dy: KEY_MOVE_STEP };
  return null;
}

/**
 * 고칠 수 있는 글상자. 쪽 위에 얹어서 쓴다.
 */
export function EditableTextBox({ page, size, name, on_text, on_rect, on_edit_end }: EditableTextBoxProps) {
  const t = useT();
  const box = page.text_box;
  const drag_ref = useRef<DragState | null>(null);
  const [is_dragging, set_is_dragging] = useState(false);
  const [guides, set_guides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  // 끄는 동안 창에 건 이벤트 처리기가 늘 최신 값을 보도록 ref에 담아 둔다.
  const latest = useRef({ size, on_rect, page_id: page.id });
  useEffect(() => {
    latest.current = { size, on_rect, page_id: page.id };
  });

  /** 계산 결과를 책에 반영하고 자석 안내선을 보여 준다. */
  const apply_result = (result: SnapResult, change_key: string) => {
    set_guides({ x: result.guide_x, y: result.guide_y });
    latest.current.on_rect(result.rect, change_key);
  };

  /** 끌기를 시작할 준비를 한다. 실제 끌기는 조금 움직인 뒤에 시작된다. */
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

    /** 포인터가 움직일 때: 문턱을 넘으면 끌기로 보고 글상자를 옮기거나 크기를 바꾼다. */
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

    /** 포인터를 뗄 때: 끌기를 끝내고 창에 건 처리기를 치운다. */
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

  /** 옮기기 손잡이에서 화살표 키를 누르면 글상자를 옮긴다. */
  const handle_move_key = (event: ReactKeyboardEvent) => {
    const delta = arrow_delta(event.key);
    if (!delta) return;
    event.preventDefault();
    apply_result(move_box(box, delta.dx, delta.dy), `key-move:${page.id}`);
  };

  /** 크기 손잡이에서 화살표 키를 누르면 글상자 크기를 바꾼다. */
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

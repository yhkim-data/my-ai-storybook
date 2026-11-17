// Move handle, corner handles and snap guides, shared by the editor's text box and picture box.
import type { BoxDrag } from './use_box_drag';
import { CORNERS, KEYBOARD_RESIZE_CORNER } from './use_box_drag';

const GRIP_ICON_SIZE = 18;

interface BoxHandlesProps {
  drag: BoxDrag;
  move_label: string;
  resize_label: string;
  /** Test id prefix: "box" for the text box, "image" for the picture. */
  test_prefix: string;
  /** Called when a handle gets focus, so keyboard users select the box too. */
  on_focus: () => void;
}

/** The move grip above the box and the four corner handles; only the bottom-right one takes focus. */
export function BoxHandles({ drag, move_label, resize_label, test_prefix, on_focus }: BoxHandlesProps) {
  return (
    <>
      <button
        type="button"
        className="box-grip"
        aria-label={move_label}
        onKeyDown={drag.handle_move_key}
        onFocus={on_focus}
        onBlur={drag.clear_guides}
        onPointerDown={(event) => {
          event.stopPropagation();
          on_focus();
          drag.begin_drag(event, 'move');
        }}
        data-testid={`${test_prefix}-move`}
      >
        <svg aria-hidden="true" width={GRIP_ICON_SIZE} height={GRIP_ICON_SIZE} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2v14M2 9h14M9 2l-2 2M9 2l2 2M9 16l-2-2M9 16l2-2M2 9l2-2M2 9l2 2M16 9l-2-2M16 9l-2 2" />
        </svg>
      </button>
      {CORNERS.map((corner) =>
        corner === KEYBOARD_RESIZE_CORNER ? (
          <button
            key={corner}
            type="button"
            className={`box-handle ${corner}`}
            aria-label={resize_label}
            onPointerDown={(event) => {
              event.stopPropagation();
              drag.begin_drag(event, corner);
            }}
            onKeyDown={drag.handle_resize_key}
            onFocus={on_focus}
            onBlur={drag.clear_guides}
            data-testid={`${test_prefix}-resize`}
          />
        ) : (
          <span
            key={corner}
            className={`box-handle ${corner}`}
            aria-hidden="true"
            onPointerDown={(event) => {
              event.stopPropagation();
              drag.begin_drag(event, corner);
            }}
          />
        ),
      )}
    </>
  );
}

/** Red snap lines while a box is dragged, in percent of the page. */
export function SnapGuides({ guides }: { guides: BoxDrag['guides'] }) {
  return (
    <>
      {guides.x !== null && <span className="snap-guide vertical" style={{ left: `${guides.x}%` }} aria-hidden="true" />}
      {guides.y !== null && <span className="snap-guide horizontal" style={{ top: `${guides.y}%` }} aria-hidden="true" />}
    </>
  );
}

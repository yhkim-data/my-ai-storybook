// Editor text box: click to edit in place, drag to move, drag a corner to resize. Handles show while it is selected.
import { rect_style, text_box_class, text_box_style } from '../components/PageView';
import { useT } from '../i18n';
import type { BookPage, Rect } from '../types';
import { BoxHandles, SnapGuides } from './BoxHandles';
import { resize_box } from './geometry';
import { useBoxDrag } from './use_box_drag';

interface EditableTextBoxProps {
  page: BookPage;
  /** Page width (px); the page height is size * aspect. */
  size: number;
  aspect?: number;
  /** Page name used in the accessible label. */
  name: string;
  /** Whether the text box is the selected box (shows the outline and handles). */
  selected: boolean;
  on_select: () => void;
  on_text: (text: string) => void;
  /** Changes with the same change_key are merged into one undo step. */
  on_rect: (rect: Rect, change_key: string) => void;
  /** Called when text editing ends; closes the current undo group. */
  on_edit_end: () => void;
}

/** Editable text box, rendered as an overlay on PageView. */
export function EditableTextBox({ page, size, aspect = 1, name, selected, on_select, on_text, on_rect, on_edit_end }: EditableTextBoxProps) {
  const t = useT();
  const box = page.text_box;
  const drag = useBoxDrag({ rect: box, size, aspect, key_prefix: `text:${page.id}`, on_rect, resize: resize_box });

  return (
    <>
      <SnapGuides guides={drag.guides} />
      <div
        className={`${text_box_class(box)} editor-box${selected ? ' selected' : ''}${drag.is_dragging ? ' dragging' : ''}`}
        style={{ ...rect_style(box, size, size * aspect), ...text_box_style(box, size) }}
        onPointerDown={(event) => {
          on_select();
          drag.begin_drag(event, 'move');
        }}
        data-testid="text-box"
      >
        <textarea
          className="editor-text"
          value={page.text}
          placeholder={t('editor.text_placeholder')}
          aria-label={t('editor.text_aria', { name })}
          onChange={(event) => on_text(event.target.value)}
          onFocus={on_select}
          onBlur={on_edit_end}
          spellCheck={false}
        />
        {box.background === 'bubble' && <span className="bubble-tail" aria-hidden="true" />}
        {selected && (
          <BoxHandles drag={drag} move_label={t('editor.move_handle')} resize_label={t('editor.resize_handle')} test_prefix="box" on_focus={on_select} />
        )}
      </div>
    </>
  );
}

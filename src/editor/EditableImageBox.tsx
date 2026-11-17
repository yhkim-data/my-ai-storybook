// Editor picture box: click to select, drag to move, drag a corner to resize, with the same handles as the text box.
// With "keep proportions" on, corner drags keep the picture's shape on screen; off, the box can take any shape and
// the picture fills it, cropped.
import { image_box_style } from '../components/PageView';
import { PAGE_REF_SIZE } from '../constants';
import { useT } from '../i18n';
import type { BookPage, Rect } from '../types';
import { BoxHandles, SnapGuides } from './BoxHandles';
import { image_min_size, resize_box, resize_box_keep_ratio, type Corner } from './geometry';
import { useBoxDrag } from './use_box_drag';

/** Placeholder font size, in px at PAGE_REF_SIZE. */
const PLACEHOLDER_FONT_SIZE = 16;

interface EditableImageBoxProps {
  page: BookPage;
  /** Page width (px); the page height is size * aspect. */
  size: number;
  aspect?: number;
  /** Text shown in the box when the page has no picture yet. */
  placeholder: string;
  image_alt: string;
  selected: boolean;
  on_select: () => void;
  /** Changes with the same change_key are merged into one undo step. */
  on_rect: (rect: Rect, change_key: string) => void;
}

/** Editable picture box, rendered as an overlay on PageView. */
export function EditableImageBox({ page, size, aspect = 1, placeholder, image_alt, selected, on_select, on_rect }: EditableImageBoxProps) {
  const t = useT();
  const box = page.image_box;
  const min = image_min_size(aspect);
  const resize = (start: Rect, corner: Corner, dx: number, dy: number) =>
    page.image_lock ? resize_box_keep_ratio(start, corner, dx, dy, aspect, min.w) : resize_box(start, corner, dx, dy, min);
  const drag = useBoxDrag({ rect: box, size, aspect, key_prefix: `image:${page.id}`, on_rect, resize });
  const { borderRadius, ...frame } = image_box_style(box, size, 0, size * aspect);

  return (
    <>
      <SnapGuides guides={drag.guides} />
      <div
        className={`editor-image-box${selected ? ' selected' : ''}${drag.is_dragging ? ' dragging' : ''}`}
        style={frame}
        onPointerDown={(event) => {
          on_select();
          drag.begin_drag(event, 'move');
        }}
        data-testid="image-box"
      >
        {page.image ? (
          <div className="page-image" style={{ inset: 0, borderRadius }}>
            <img src={page.image.data_url} alt={image_alt} draggable={false} />
          </div>
        ) : (
          <div className="page-image empty" style={{ inset: 0, borderRadius, fontSize: (PLACEHOLDER_FONT_SIZE * size) / PAGE_REF_SIZE }}>
            {placeholder}
          </div>
        )}
        {selected && (
          <BoxHandles drag={drag} move_label={t('editor.image_move_handle')} resize_label={t('editor.image_resize_handle')} test_prefix="image" on_focus={on_select} />
        )}
      </div>
    </>
  );
}

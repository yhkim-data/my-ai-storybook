// Renders one book page; shared by the editor, the flip-through preview and PDF export.
import type { CSSProperties, ReactNode } from 'react';
import { BLEED_MM, FONTS, PAGE_REF_SIZE, PAGE_SHAPE_MM } from '../constants';
import { translate } from '../i18n';
import { MOCK_IMAGE_MODEL } from '../providers/mock_image';
import { get_ai_model_names, get_book_title, page_aspect } from '../store/book_model';
import type { Book, BookPage, PageShape, Rect, TextBox } from '../types';

const PERCENT = 100;
/** Text box padding as a fraction of page width. */
const BOX_PADDING_RATIO = 0.025;
/** Corner radii as a fraction of page width. */
const BOX_RADIUS_RATIO = 0.02;
const BUBBLE_RADIUS_RATIO = 0.05;
const IMAGE_RADIUS_RATIO = 0.015;
/** Credits page font sizes, in px at PAGE_REF_SIZE. */
const CREDITS_HEADING_SIZE = 30;
const CREDITS_TITLE_SIZE = 24;
const CREDITS_BODY_SIZE = 18;
const CREDITS_NOTICE_SIZE = 15;
const CREDITS_GAP_RATIO = 0.035;
const CREDITS_PADDING_RATIO = 0.12;
/** Placeholder font size, in px at PAGE_REF_SIZE. */
const PLACEHOLDER_FONT_SIZE = 16;

export interface PageFrame {
  /** Page height in px. */
  height: number;
  /** Size with the print bleed added on every side. */
  outer_w: number;
  outer_h: number;
  /** Bleed width in px (0 without bleed). */
  offset: number;
}

/** Page height, outer size and bleed for a page `width` px wide in the given shape. */
export function page_frame(width: number, shape: PageShape, bleed: boolean): PageFrame {
  const height = width * page_aspect(shape);
  const offset = bleed ? (width * BLEED_MM) / PAGE_SHAPE_MM[shape].w : 0;
  return { height, outer_w: width + offset * 2, outer_h: height + offset * 2, offset };
}

/** Converts a percent rect to absolute px position styles on a page of the given width and height. */
export function rect_style(rect: Rect, width: number, height = width): CSSProperties {
  return {
    left: (rect.x * width) / PERCENT,
    top: (rect.y * height) / PERCENT,
    width: (rect.w * width) / PERCENT,
    height: (rect.h * height) / PERCENT,
  };
}

/** Text box typography and padding; the editor's editable box uses the same styles. */
export function text_box_style(box: TextBox, size: number): CSSProperties {
  const font = FONTS[box.font_id];
  return {
    // Glyphs missing from the handwriting font fall back to the plain font.
    fontFamily: `'${font.css_family}', '${FONTS.plain.css_family}', sans-serif`,
    fontSize: (box.font_size * size) / PAGE_REF_SIZE,
    color: box.color,
    textAlign: box.align,
    padding: size * BOX_PADDING_RATIO,
    borderRadius: size * (box.background === 'bubble' ? BUBBLE_RADIUS_RATIO : BOX_RADIUS_RATIO),
  };
}

export function text_box_class(box: TextBox): string {
  return box.background === 'none' ? 'text-box' : `text-box bg-${box.background}`;
}

interface PageViewProps {
  page: BookPage;
  /** Page width (px); the height follows the shape, and the bleed is added on top. */
  size: number;
  shape?: PageShape;
  /** Add the print bleed. */
  bleed?: boolean;
  /** Placeholder text shown when there is no image (editor only). */
  placeholder?: string;
  image_alt?: string;
  /** Skip the text box and the picture; the editor draws its own editable ones. */
  hide_text?: boolean;
  hide_image?: boolean;
  /** Overlay content, e.g. the editor's editable boxes. */
  children?: ReactNode;
  class_name?: string;
}

/**
 * Picture position in px. A side that touches the page edge reaches into the print bleed, and only a
 * picture that touches no edge gets rounded corners.
 */
export function image_box_style(box: Rect, width: number, offset: number, height = width): CSSProperties {
  const left = box.x <= 0 ? -offset : (box.x * width) / PERCENT;
  const top = box.y <= 0 ? -offset : (box.y * height) / PERCENT;
  const right = box.x + box.w >= PERCENT ? width + offset : ((box.x + box.w) * width) / PERCENT;
  const bottom = box.y + box.h >= PERCENT ? height + offset : ((box.y + box.h) * height) / PERCENT;
  const touches_edge = box.x <= 0 || box.y <= 0 || box.x + box.w >= PERCENT || box.y + box.h >= PERCENT;
  return { left, top, width: right - left, height: bottom - top, borderRadius: touches_edge ? 0 : width * IMAGE_RADIUS_RATIO };
}

/** Renders a page: picture and text box at their saved places, the `front` one on top. */
export function PageView({
  page,
  size,
  shape = 'square',
  bleed = false,
  placeholder,
  image_alt = '',
  hide_text = false,
  hide_image = false,
  children,
  class_name = '',
}: PageViewProps) {
  const { height, outer_w, outer_h, offset } = page_frame(size, shape, bleed);
  const image_style = image_box_style(page.image_box, size, offset, height);

  const image_part = hide_image ? null : page.image ? (
    <div key="image" className="page-image" style={image_style}>
      <img src={page.image.data_url} alt={image_alt} draggable={false} />
    </div>
  ) : placeholder !== undefined ? (
    <div key="image" className="page-image empty" style={{ ...image_style, fontSize: (PLACEHOLDER_FONT_SIZE * size) / PAGE_REF_SIZE }}>
      {placeholder}
    </div>
  ) : null;
  const text_part =
    !hide_text && page.text.trim().length > 0 ? (
      <div key="text" className={text_box_class(page.text_box)} style={{ ...rect_style(page.text_box, size, height), ...text_box_style(page.text_box, size) }}>
        {page.text}
        {page.text_box.background === 'bubble' && <span className="bubble-tail" aria-hidden="true" />}
      </div>
    ) : null;

  return (
    <div className={`book-page ${class_name}`} style={{ width: outer_w, height: outer_h }} data-page-id={page.id}>
      <div className="page-inner" style={{ left: offset, top: offset, width: size, height }}>
        {page.front === 'image' ? [text_part, image_part] : [image_part, text_part]}
        {children}
      </div>
    </div>
  );
}

interface CreditsPageViewProps {
  book: Book;
  /** Page width (px); the height follows the book shape. */
  size: number;
  bleed?: boolean;
  class_name?: string;
}

/**
 * Closing credits page. The AI notice appears only if some image is AI-generated.
 * No app name or DI Lab branding: the book belongs to its author.
 */
export function CreditsPageView({ book, size, bleed = false, class_name = '' }: CreditsPageViewProps) {
  const { height, outer_w, outer_h, offset } = page_frame(size, book.page_shape, bleed);
  const scale = size / PAGE_REF_SIZE;
  const model_names = get_ai_model_names(book).map((name) =>
    name === MOCK_IMAGE_MODEL ? translate(book.lang, 'credits.practice_name') : name,
  );
  const author = book.author.trim();
  return (
    <div className={`book-page ${class_name}`} style={{ width: outer_w, height: outer_h }} data-page-id="credits">
      <div
        className="page-inner"
        style={{
          left: offset,
          top: offset,
          width: size,
          height,
          padding: size * CREDITS_PADDING_RATIO,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: size * CREDITS_GAP_RATIO,
          textAlign: 'center',
          color: '#17233A',
          fontFamily: "'Noto Sans KR', sans-serif",
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontFamily: "'Gowun Dodum', sans-serif", fontSize: CREDITS_HEADING_SIZE * scale }}>
          {translate(book.lang, 'credits.heading')}
        </div>
        <div style={{ fontSize: CREDITS_TITLE_SIZE * scale, fontWeight: 700 }}>{get_book_title(book)}</div>
        {author && <div style={{ fontSize: CREDITS_BODY_SIZE * scale }}>{translate(book.lang, 'credits.author', { author })}</div>}
        {model_names.length > 0 && (
          <div style={{ fontSize: CREDITS_NOTICE_SIZE * scale, color: '#4A5872' }} data-testid="ai-notice">
            {translate(book.lang, 'credits.ai_notice', { name: model_names.join(', ') })}
          </div>
        )}
      </div>
    </div>
  );
}

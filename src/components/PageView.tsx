// Renders one book page; shared by the editor, the flip-through preview and PDF export.
import type { CSSProperties, ReactNode } from 'react';
import { BLEED_MM, FONTS, LAYOUT_IMAGE_RECT, PAGE_MM, PAGE_REF_SIZE } from '../constants';
import { translate } from '../i18n';
import { MOCK_IMAGE_MODEL } from '../providers/mock_image';
import { get_ai_model_names, get_book_title } from '../store/book_model';
import type { Book, BookPage, Rect, TextBox } from '../types';

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

/** Outer frame size and inner page offset when a print bleed is added. */
export function page_frame(size: number, bleed: boolean): { outer: number; offset: number } {
  if (!bleed) return { outer: size, offset: 0 };
  const offset = (size * BLEED_MM) / PAGE_MM;
  return { outer: size + offset * 2, offset };
}

/** Converts a percent rect to absolute px position styles. */
export function rect_style(rect: Rect, size: number): CSSProperties {
  return {
    left: (rect.x * size) / PERCENT,
    top: (rect.y * size) / PERCENT,
    width: (rect.w * size) / PERCENT,
    height: (rect.h * size) / PERCENT,
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
  /** Page side length (px); the bleed is added on top. */
  size: number;
  /** Add the print bleed. */
  bleed?: boolean;
  /** Placeholder text shown when there is no image (editor only). */
  placeholder?: string;
  image_alt?: string;
  /** Skip the text box; the editor draws its own. */
  hide_text?: boolean;
  /** Overlay content, e.g. the editor's editable text box. */
  children?: ReactNode;
  class_name?: string;
}

/** Renders a page: the image follows the layout, the text box uses its saved position. */
export function PageView({ page, size, bleed = false, placeholder, image_alt = '', hide_text = false, children, class_name = '' }: PageViewProps) {
  const { outer, offset } = page_frame(size, bleed);
  const image_rect = LAYOUT_IMAGE_RECT[page.layout];
  const is_full = page.layout === 'full';
  // The full layout extends the image into the bleed.
  const image_style: CSSProperties = is_full
    ? { left: -offset, top: -offset, width: outer, height: outer }
    : { ...rect_style(image_rect, size), borderRadius: size * IMAGE_RADIUS_RATIO };

  return (
    <div className={`book-page ${class_name}`} style={{ width: outer, height: outer }} data-page-id={page.id}>
      <div className="page-inner" style={{ left: offset, top: offset, width: size, height: size }}>
        {page.image ? (
          <div className="page-image" style={image_style}>
            <img src={page.image.data_url} alt={image_alt} draggable={false} />
          </div>
        ) : (
          placeholder !== undefined && (
            <div className="page-image empty" style={{ ...image_style, fontSize: (PLACEHOLDER_FONT_SIZE * size) / PAGE_REF_SIZE }}>
              {placeholder}
            </div>
          )
        )}
        {!hide_text && page.text.trim().length > 0 && (
          <div className={text_box_class(page.text_box)} style={{ ...rect_style(page.text_box, size), ...text_box_style(page.text_box, size) }}>
            {page.text}
            {page.text_box.background === 'bubble' && <span className="bubble-tail" aria-hidden="true" />}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

interface CreditsPageViewProps {
  book: Book;
  size: number;
  bleed?: boolean;
  class_name?: string;
}

/**
 * Closing credits page. The AI notice appears only if some image is AI-generated.
 * No app name or DI Lab branding: the book belongs to its author.
 */
export function CreditsPageView({ book, size, bleed = false, class_name = '' }: CreditsPageViewProps) {
  const { outer, offset } = page_frame(size, bleed);
  const scale = size / PAGE_REF_SIZE;
  const model_names = get_ai_model_names(book).map((name) =>
    name === MOCK_IMAGE_MODEL ? translate(book.lang, 'credits.practice_name') : name,
  );
  const author = book.author.trim();
  return (
    <div className={`book-page ${class_name}`} style={{ width: outer, height: outer }} data-page-id="credits">
      <div
        className="page-inner"
        style={{
          left: offset,
          top: offset,
          width: size,
          height: size,
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

// Pure functions that create and update book data; no UI or store dependencies.
import {
  COVER_FONT_SIZE,
  CUSTOM_STYLE_MAX_LENGTH,
  DEFAULT_AGE_BAND,
  DEFAULT_LAYOUT_ID,
  DEFAULT_PAGE_COUNT,
  DEFAULT_PAGE_SHAPE,
  DEFAULT_STYLE_ID,
  DEFAULT_TEXT_BOX,
  LAYOUT_IDS,
  LAYOUT_IMAGE_RECT,
  LAYOUT_TEXT_RECT,
  PAGE_COUNT_MAX,
  PAGE_COUNT_MIN,
  PAGE_SHAPES,
  PAGE_SHAPE_MM,
  STYLE_IDS,
} from '../constants';
import type { ArtStyle, Book, BookPage, Lang, LayoutId, PageDraft, PageShape, Rect, StorySeed, StyleChoice, TextBox } from '../types';
import { normalize_versions } from './image_versions';

/** Cover title box position, in percent. */
const COVER_TEXT_RECT = { x: 8, y: 6, w: 84, h: 22 };

/** Unique id; falls back when crypto.randomUUID is unavailable. */
export function make_id(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Default text box for a layout. The full-bleed layout gets a white background so text stays readable. */
export function make_text_box(layout: LayoutId, current?: TextBox): TextBox {
  const style = current ?? DEFAULT_TEXT_BOX;
  return {
    ...style,
    ...LAYOUT_TEXT_RECT[layout],
    background: layout === 'full' && style.background === 'none' ? 'white' : style.background,
  };
}

/** Picture box for a layout. */
export function make_image_box(layout: LayoutId): Rect {
  return { ...LAYOUT_IMAGE_RECT[layout] };
}

export function make_story_page(text = '', image_prompt = ''): BookPage {
  return {
    id: make_id(),
    kind: 'story',
    text,
    image_prompt,
    image: null,
    layout: DEFAULT_LAYOUT_ID,
    text_box: make_text_box(DEFAULT_LAYOUT_ID),
    image_box: make_image_box(DEFAULT_LAYOUT_ID),
    front: 'text',
    image_lock: true,
  };
}

/** Cover page; its text is the book title. */
export function make_cover_page(title = '', image_prompt = ''): BookPage {
  return {
    id: make_id(),
    kind: 'cover',
    text: title,
    image_prompt,
    image: null,
    layout: 'full',
    text_box: {
      ...DEFAULT_TEXT_BOX,
      ...COVER_TEXT_RECT,
      font_size: COVER_FONT_SIZE,
      align: 'center',
      background: 'white',
    },
    image_box: make_image_box('full'),
    front: 'text',
    image_lock: true,
  };
}

/** Rounds a page count and keeps it in PAGE_COUNT_MIN..PAGE_COUNT_MAX; anything not a number becomes the default. */
export function clamp_page_count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_PAGE_COUNT;
  return Math.max(PAGE_COUNT_MIN, Math.min(Math.round(value), PAGE_COUNT_MAX));
}

/** Keeps a style description to one line of at most CUSTOM_STYLE_MAX_LENGTH characters. */
export function clean_custom_style(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s*[\r\n]+\s*/g, ' ').slice(0, CUSTOM_STYLE_MAX_LENGTH);
}

/** True for the six styles and 'custom'. */
export function is_art_style(value: unknown): value is ArtStyle {
  return value === 'custom' || STYLE_IDS.some((style_id) => style_id === value);
}

/** Page height divided by page width for a book shape. */
export function page_aspect(shape: PageShape): number {
  const size = PAGE_SHAPE_MM[shape];
  return size.h / size.w;
}

const FULL = 100;

/**
 * Pages after the book shape changes. Boxes are in percent, so they follow the new shape; a picture that keeps
 * its proportions gets a new height so its shape on screen stays the same. A picture filling the whole page still does.
 */
export function reshape_pages(pages: BookPage[], from: PageShape, to: PageShape): BookPage[] {
  const scale = page_aspect(from) / page_aspect(to);
  return pages.map((page) => {
    const box = page.image_box;
    const fills_page = box.x <= 0 && box.y <= 0 && box.w >= FULL && box.h >= FULL;
    if (!page.image_lock || fills_page || scale === 1) return page;
    let h = box.h * scale;
    let w = box.w;
    // Too tall for the new page: shrink both sides so the shape stays the same.
    if (h > FULL) {
      w = (w * FULL) / h;
      h = FULL;
    }
    const x = Math.min(box.x, FULL - w);
    const y = Math.max(0, Math.min(box.y, FULL - h));
    return { ...page, image_box: { x, y, w, h } };
  });
}

/** The style a page is drawn in: its own style if it has one, else the book's style. */
export function effective_style(book: Book, page: BookPage | undefined): StyleChoice {
  if (page?.style) return { style_id: page.style, custom_style: page.custom_style ?? '' };
  return { style_id: book.style_id, custom_style: book.custom_style };
}

/** Short text that names a style choice, stored with AI images to notice a later style change. */
export function style_key(choice: StyleChoice): string {
  return choice.style_id === 'custom' ? `custom:${choice.custom_style.trim()}` : choice.style_id;
}

/** True for a rect whose four numbers are all finite. */
function is_rect(value: unknown): value is Rect {
  if (typeof value !== 'object' || value === null) return false;
  const rect = value as Partial<Rect>;
  return [rect.x, rect.y, rect.w, rect.h].every((part) => typeof part === 'number' && Number.isFinite(part));
}

/**
 * Fills page fields that older books lack: the picture box comes from the layout, the text stays
 * in front and the picture keeps its proportions. Drops a page style that is not valid, and picture versions that do not hold together.
 */
function normalize_page(page: BookPage): BookPage {
  return normalize_versions(normalize_page_fields(page));
}

function normalize_page_fields(page: BookPage): BookPage {
  const { style, custom_style, ...rest } = page;
  const layout = LAYOUT_IDS.includes(page.layout) ? page.layout : DEFAULT_LAYOUT_ID;
  const filled: BookPage = {
    ...rest,
    layout,
    image_box: is_rect(page.image_box) ? page.image_box : make_image_box(layout),
    front: page.front === 'image' ? 'image' : 'text',
    image_lock: typeof page.image_lock === 'boolean' ? page.image_lock : true,
  };
  if (!is_art_style(style)) return filled;
  return style === 'custom' ? { ...filled, style, custom_style: clean_custom_style(custom_style) } : { ...filled, style };
}

/**
 * Fills fields that older saved books may lack and fixes out-of-range values.
 * Used for every book that is opened (saved on this device, loaded from a file, or the demo).
 */
export function normalize_book(book: Book): Book {
  return {
    ...book,
    seed: { ...make_seed(), ...book.seed, page_count: clamp_page_count(book.seed?.page_count) },
    style_id: is_art_style(book.style_id) ? book.style_id : DEFAULT_STYLE_ID,
    custom_style: clean_custom_style(book.custom_style),
    page_shape: PAGE_SHAPES.includes(book.page_shape) ? book.page_shape : DEFAULT_PAGE_SHAPE,
    pages: (book.pages ?? []).map(normalize_page),
  };
}

export function make_seed(): StorySeed {
  return { age_band: DEFAULT_AGE_BAND, topic: '', hero_name: '', hero_look: '', page_count: DEFAULT_PAGE_COUNT };
}

/** New book with no pages yet. */
export function create_book(lang: Lang): Book {
  return {
    format_version: 1,
    id: make_id(),
    lang,
    author: '',
    seed: make_seed(),
    write_mode: 'ai',
    plots: [],
    plots_key: '',
    chosen_plot: null,
    pages_key: '',
    style_id: DEFAULT_STYLE_ID,
    custom_style: '',
    page_shape: DEFAULT_PAGE_SHAPE,
    pages: [],
    step: 'seed',
    updated_at: Date.now(),
  };
}

/** Rebuilds cover and story pages from drafts, keeping any existing cover image. */
export function build_pages(title: string, cover_description: string, drafts: PageDraft[], old_cover?: BookPage): BookPage[] {
  const cover = make_cover_page(title, cover_description);
  if (old_cover) cover.image = old_cover.image;
  return [cover, ...drafts.map((draft) => make_story_page(draft.text, draft.image_prompt))];
}

/** Pads with blank pages or trims from the end to page_count; creates a cover if missing. */
export function resize_pages(pages: BookPage[], page_count: number, title: string, cover_description: string): BookPage[] {
  const cover = pages[0] ?? make_cover_page(title, cover_description);
  const story = pages.slice(1, page_count + 1);
  while (story.length < page_count) story.push(make_story_page());
  return [cover, ...story];
}

/** Applies a layout: both boxes go to that layout's places, and can be moved freely afterwards. */
export function apply_layout(page: BookPage, layout: LayoutId): BookPage {
  return { ...page, layout, text_box: make_text_box(layout, page.text_box), image_box: make_image_box(layout) };
}

/** Book title: the cover text, else the chosen plot title, else ''. */
export function get_book_title(book: Book): string {
  return book.pages[0]?.text.trim() || book.chosen_plot?.title.trim() || '';
}

/** Distinct image model names used in the book; empty if there are no AI images. */
export function get_ai_model_names(book: Book): string[] {
  const names = book.pages
    .filter((page) => page.image?.source === 'ai')
    .map((page) => page.image?.model_name ?? '')
    .filter((name) => name.length > 0);
  return [...new Set(names)];
}

export function has_ai_image(book: Book): boolean {
  return book.pages.some((page) => page.image?.source === 'ai');
}

/** Key for comparing inputs, so the AI is not called again for the same input. */
export function make_input_key(...parts: unknown[]): string {
  return JSON.stringify(parts);
}

// 책 자료를 만들고 바꾸는 순수 함수들. 화면이나 저장소에 기대지 않는다.
import {
  COVER_FONT_SIZE,
  DEFAULT_AGE_BAND,
  DEFAULT_LAYOUT_ID,
  DEFAULT_PAGE_COUNT,
  DEFAULT_STYLE_ID,
  DEFAULT_TEXT_BOX,
  LAYOUT_TEXT_RECT,
} from '../constants';
import type { Book, BookPage, Lang, LayoutId, PageDraft, StorySeed, TextBox } from '../types';

/** 표지 글상자가 놓이는 자리 (퍼센트) */
const COVER_TEXT_RECT = { x: 8, y: 6, w: 84, h: 22 };

/**
 * 겹치지 않는 식별자를 만든다.
 */
export function make_id(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * 배치에 맞는 기본 글상자를 만든다. 그림 가득 배치는 글이 보이도록 흰 바탕을 준다.
 */
export function make_text_box(layout: LayoutId, current?: TextBox): TextBox {
  const style = current ?? DEFAULT_TEXT_BOX;
  return {
    ...style,
    ...LAYOUT_TEXT_RECT[layout],
    background: layout === 'full' && style.background === 'none' ? 'white' : style.background,
  };
}

/**
 * 본문 쪽 하나를 만든다.
 */
export function make_story_page(text = '', image_prompt = ''): BookPage {
  return {
    id: make_id(),
    kind: 'story',
    text,
    image_prompt,
    image: null,
    layout: DEFAULT_LAYOUT_ID,
    text_box: make_text_box(DEFAULT_LAYOUT_ID),
  };
}

/**
 * 표지 쪽을 만든다. 표지의 글이 책 제목이다.
 */
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
  };
}

/**
 * 빈 이야기 씨앗을 만든다.
 */
export function make_seed(): StorySeed {
  return { age_band: DEFAULT_AGE_BAND, topic: '', hero_name: '', hero_look: '', page_count: DEFAULT_PAGE_COUNT };
}

/**
 * 새 책을 만든다. 쪽은 아직 없다.
 */
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
    pages: [],
    step: 'seed',
    updated_at: Date.now(),
  };
}

/**
 * 표지와 본문 쪽을 초안으로 새로 만든다. 표지에 이미 넣은 그림은 남긴다.
 */
export function build_pages(title: string, cover_description: string, drafts: PageDraft[], old_cover?: BookPage): BookPage[] {
  const cover = make_cover_page(title, cover_description);
  if (old_cover) cover.image = old_cover.image;
  return [cover, ...drafts.map((draft) => make_story_page(draft.text, draft.image_prompt))];
}

/**
 * 본문 쪽수를 맞춘다. 모자라면 빈 쪽을 더하고 남으면 뒤에서 뺀다. 표지가 없으면 만든다.
 */
export function resize_pages(pages: BookPage[], page_count: number, title: string, cover_description: string): BookPage[] {
  const cover = pages[0] ?? make_cover_page(title, cover_description);
  const story = pages.slice(1, page_count + 1);
  while (story.length < page_count) story.push(make_story_page());
  return [cover, ...story];
}

/**
 * 쪽의 배치를 바꾼다. 글상자는 새 배치의 기본 자리로 옮긴다.
 */
export function apply_layout(page: BookPage, layout: LayoutId): BookPage {
  return { ...page, layout, text_box: make_text_box(layout, page.text_box) };
}

/**
 * 책 제목(표지의 글)을 돌려준다.
 */
export function get_book_title(book: Book): string {
  return book.pages[0]?.text.trim() || book.chosen_plot?.title.trim() || '';
}

/**
 * 책에 쓰인 그림 AI 이름을 겹치지 않게 모은다. AI 그림이 없으면 빈 배열이다.
 */
export function get_ai_model_names(book: Book): string[] {
  const names = book.pages
    .filter((page) => page.image?.source === 'ai')
    .map((page) => page.image?.model_name ?? '')
    .filter((name) => name.length > 0);
  return [...new Set(names)];
}

/**
 * AI로 만든 그림이 한 장이라도 있는지 본다.
 */
export function has_ai_image(book: Book): boolean {
  return book.pages.some((page) => page.image?.source === 'ai');
}

/**
 * 같은 입력인지 견주는 열쇠를 만든다. 같은 입력이면 AI를 다시 부르지 않는다.
 */
export function make_input_key(...parts: unknown[]): string {
  return JSON.stringify(parts);
}

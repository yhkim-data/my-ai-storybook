// 책 저장소. 지금 화면, 만들고 있는 책, 되돌리기 기록을 쥔다.
import { create } from 'zustand';
import { HISTORY_LIMIT, STEP_SCREENS } from '../constants';
import { build_cover_description } from '../providers/prompts';
import type { Book, BookPage, Lang, PageDraft, PageImage, Plot, Screen, StorySeed, StyleId, WriteMode } from '../types';
import { build_pages, create_book, make_story_page, resize_pages } from './book_model';

/** 단계에 들지 않는 곁 화면 */
export type SideScreen = 'connect' | 'rights';

export interface BookState {
  screen: Screen;
  /** 곁 화면에서 돌아갈 화면 */
  return_screen: Screen;
  book: Book | null;
  /** 체험판을 보고 있는가. 체험판은 저장하지 않는다. */
  is_demo: boolean;
  /** 이 기기에 만들던 책이 저장되어 있는가 */
  has_saved_book: boolean;
  /** 그림·꾸미기·완성 화면에서 보고 있는 쪽 */
  current_page: number;
  undo_stack: BookPage[][];
  redo_stack: BookPage[][];
  last_change_key: string | null;

  go: (screen: Screen) => void;
  open_side: (screen: SideScreen) => void;
  close_side: () => void;
  start_new_book: (lang: Lang) => void;
  open_book: (book: Book, is_demo?: boolean) => void;
  close_book: () => void;
  set_has_saved_book: (value: boolean) => void;
  update_seed: (patch: Partial<StorySeed>) => void;
  set_write_mode: (mode: WriteMode) => void;
  set_plots: (plots: Plot[], key: string) => void;
  choose_plot: (plot: Plot) => void;
  set_page_drafts: (drafts: PageDraft[], key: string) => void;
  ensure_page_count: () => void;
  update_page: (index: number, patch: Partial<BookPage>) => void;
  set_page_image: (index: number, image: PageImage | null) => void;
  set_style: (style_id: StyleId) => void;
  set_author: (author: string) => void;
  set_current_page: (index: number) => void;
  edit_pages: (mutator: (pages: BookPage[]) => BookPage[], change_key?: string) => void;
  undo: () => void;
  redo: () => void;
}

/**
 * 쪽 번호를 책의 범위 안으로 맞춘다.
 */
function clamp_page_index(index: number, pages: BookPage[]): number {
  return Math.max(0, Math.min(index, pages.length - 1));
}

/**
 * 책의 표지 그림 설명을 제목과 줄거리로 만든다.
 */
function cover_description_of(book: Book): string {
  return build_cover_description(book.chosen_plot?.title ?? '', book.chosen_plot?.summary ?? '', book.lang);
}

export const useBook = create<BookState>((set, get) => {
  /** 책이 있을 때만 책을 바꾼다. 바꾼 시각도 함께 남긴다. */
  const change_book = (mutator: (book: Book) => Book) => {
    const book = get().book;
    if (!book) return;
    set({ book: { ...mutator(book), updated_at: Date.now() } });
  };

  return {
    screen: 'start',
    return_screen: 'start',
    book: null,
    is_demo: false,
    has_saved_book: false,
    current_page: 0,
    undo_stack: [],
    redo_stack: [],
    last_change_key: null,

    go: (screen) => {
      set({ screen, last_change_key: null });
      if (screen !== 'start' && STEP_SCREENS.includes(screen)) change_book((book) => ({ ...book, step: screen }));
      if (typeof window !== 'undefined') window.scrollTo?.(0, 0);
    },
    open_side: (screen) => set({ return_screen: get().screen, screen }),
    close_side: () => set({ screen: get().return_screen }),

    start_new_book: (lang) =>
      set({
        book: create_book(lang),
        is_demo: false,
        screen: 'seed',
        current_page: 0,
        undo_stack: [],
        redo_stack: [],
        last_change_key: null,
      }),
    open_book: (book, is_demo = false) =>
      set({
        book,
        is_demo,
        screen: is_demo ? 'finish' : book.step,
        current_page: 0,
        undo_stack: [],
        redo_stack: [],
        last_change_key: null,
      }),
    close_book: () => set({ book: null, is_demo: false, screen: 'start', undo_stack: [], redo_stack: [] }),
    set_has_saved_book: (value) => set({ has_saved_book: value }),

    update_seed: (patch) => change_book((book) => ({ ...book, seed: { ...book.seed, ...patch } })),
    set_write_mode: (mode) => change_book((book) => ({ ...book, write_mode: mode })),
    set_plots: (plots, key) => change_book((book) => ({ ...book, plots, plots_key: key })),
    choose_plot: (plot) =>
      change_book((book) => {
        // 쪽이 이미 있으면 표지 제목도 함께 바꾼다.
        const pages = book.pages.map((page, index) => (index === 0 ? { ...page, text: plot.title } : page));
        return { ...book, chosen_plot: plot, pages };
      }),
    set_page_drafts: (drafts, key) =>
      change_book((book) => ({
        ...book,
        pages: build_pages(book.chosen_plot?.title ?? '', cover_description_of(book), drafts, book.pages[0]),
        pages_key: key,
      })),
    ensure_page_count: () =>
      change_book((book) => {
        if (book.pages.length === book.seed.page_count + 1) return book;
        const pages = resize_pages(book.pages, book.seed.page_count, book.chosen_plot?.title ?? '', cover_description_of(book));
        return { ...book, pages };
      }),
    update_page: (index, patch) =>
      change_book((book) => ({
        ...book,
        pages: book.pages.map((page, page_index) => (page_index === index ? { ...page, ...patch } : page)),
      })),
    set_page_image: (index, image) => get().update_page(index, { image }),
    set_style: (style_id) => change_book((book) => ({ ...book, style_id })),
    set_author: (author) => change_book((book) => ({ ...book, author })),
    set_current_page: (index) => {
      const pages = get().book?.pages ?? [];
      set({ current_page: clamp_page_index(index, pages), last_change_key: null });
    },

    edit_pages: (mutator, change_key) => {
      const { book, undo_stack, last_change_key } = get();
      if (!book) return;
      const next_pages = mutator(book.pages);
      if (next_pages === book.pages) return;
      // 같은 종류의 연속된 바꿈(글자 입력, 끌기)은 되돌리기 한 단계로 묶는다.
      const is_same_change = change_key !== undefined && change_key === last_change_key;
      const next_undo = is_same_change ? undo_stack : [...undo_stack, book.pages].slice(-HISTORY_LIMIT);
      set({
        book: { ...book, pages: next_pages, updated_at: Date.now() },
        undo_stack: next_undo,
        redo_stack: [],
        last_change_key: change_key ?? null,
        current_page: clamp_page_index(get().current_page, next_pages),
      });
    },
    undo: () => {
      const { book, undo_stack, redo_stack } = get();
      const previous = undo_stack[undo_stack.length - 1];
      if (!book || !previous) return;
      set({
        book: { ...book, pages: previous, updated_at: Date.now() },
        undo_stack: undo_stack.slice(0, -1),
        redo_stack: [...redo_stack, book.pages],
        last_change_key: null,
        current_page: clamp_page_index(get().current_page, previous),
      });
    },
    redo: () => {
      const { book, undo_stack, redo_stack } = get();
      const next = redo_stack[redo_stack.length - 1];
      if (!book || !next) return;
      set({
        book: { ...book, pages: next, updated_at: Date.now() },
        undo_stack: [...undo_stack, book.pages],
        redo_stack: redo_stack.slice(0, -1),
        last_change_key: null,
        current_page: clamp_page_index(get().current_page, next),
      });
    },
  };
});

/**
 * 쪽 목록에 빈 쪽을 하나 끼워 넣는다. 꾸미기 화면의 "쪽 더하기"에서 쓴다.
 */
export function insert_blank_page(pages: BookPage[], after_index: number): BookPage[] {
  const position = Math.max(1, after_index + 1);
  return [...pages.slice(0, position), make_story_page(), ...pages.slice(position)];
}

/**
 * 쪽을 다른 자리로 옮긴다. 표지(0번)는 옮기지 않고, 표지 앞으로도 못 간다.
 */
export function move_page(pages: BookPage[], from_index: number, to_index: number): BookPage[] {
  const last = pages.length - 1;
  if (from_index < 1 || from_index > last || to_index < 1 || to_index > last || from_index === to_index) return pages;
  const next = [...pages];
  const [moved] = next.splice(from_index, 1);
  if (!moved) return pages;
  next.splice(to_index, 0, moved);
  return next;
}

/**
 * 본문 쪽 하나를 뺀다. 표지는 뺄 수 없고, 본문은 한 쪽 이상 남긴다.
 */
export function remove_page(pages: BookPage[], index: number): BookPage[] {
  const MIN_PAGES_WITH_COVER = 2;
  if (index < 1 || pages.length <= MIN_PAGES_WITH_COVER) return pages;
  return pages.filter((_, page_index) => page_index !== index);
}

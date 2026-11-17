// Book store: current screen, the book being made, and undo history.
import { create } from 'zustand';
import { HISTORY_LIMIT, STEP_SCREENS } from '../constants';
import { build_cover_description } from '../providers/prompts';
import type { ArtStyle, Book, BookPage, Lang, PageDraft, PageImage, Plot, Screen, StorySeed, WriteMode } from '../types';
import { build_pages, clean_custom_style, create_book, make_story_page, normalize_book, resize_pages } from './book_model';

/** Side screens that are not wizard steps. */
export type SideScreen = 'connect' | 'rights';

export interface BookState {
  screen: Screen;
  /** Screen to return to when a side screen closes. */
  return_screen: Screen;
  book: Book | null;
  /** Viewing the demo book; it is never saved. */
  is_demo: boolean;
  /** Whether a book in progress is saved on this device. */
  has_saved_book: boolean;
  /** Page shown on the pictures, editor and finish screens. */
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
  set_style: (style_id: ArtStyle) => void;
  /** Saves the user's own style description and picks the 'custom' style. */
  set_custom_style: (text: string) => void;
  set_author: (author: string) => void;
  set_current_page: (index: number) => void;
  edit_pages: (mutator: (pages: BookPage[]) => BookPage[], change_key?: string) => void;
  undo: () => void;
  redo: () => void;
}

function clamp_page_index(index: number, pages: BookPage[]): number {
  return Math.max(0, Math.min(index, pages.length - 1));
}

function cover_description_of(book: Book): string {
  return build_cover_description(book.chosen_plot?.title ?? '', book.chosen_plot?.summary ?? '', book.lang);
}

export const useBook = create<BookState>((set, get) => {
  /** Updates the book (if any) and stamps updated_at. */
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
    open_book: (raw_book, is_demo = false) => {
      const book = normalize_book(raw_book);
      set({
        book,
        is_demo,
        screen: is_demo ? 'finish' : book.step,
        current_page: 0,
        undo_stack: [],
        redo_stack: [],
        last_change_key: null,
      });
    },
    close_book: () => set({ book: null, is_demo: false, screen: 'start', undo_stack: [], redo_stack: [] }),
    set_has_saved_book: (value) => set({ has_saved_book: value }),

    update_seed: (patch) => change_book((book) => ({ ...book, seed: { ...book.seed, ...patch } })),
    set_write_mode: (mode) => change_book((book) => ({ ...book, write_mode: mode })),
    set_plots: (plots, key) => change_book((book) => ({ ...book, plots, plots_key: key })),
    choose_plot: (plot) =>
      change_book((book) => {
        // If pages already exist, update the cover title too.
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
    set_custom_style: (text) => change_book((book) => ({ ...book, style_id: 'custom', custom_style: clean_custom_style(text) })),
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
      // Consecutive changes with the same key (typing, dragging) form one undo step.
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

/** Inserts a blank page after after_index, never before the cover. */
export function insert_blank_page(pages: BookPage[], after_index: number): BookPage[] {
  const position = Math.max(1, after_index + 1);
  return [...pages.slice(0, position), make_story_page(), ...pages.slice(position)];
}

/** Moves a story page; the cover (index 0) cannot move and nothing can go before it. */
export function move_page(pages: BookPage[], from_index: number, to_index: number): BookPage[] {
  const last = pages.length - 1;
  if (from_index < 1 || from_index > last || to_index < 1 || to_index > last || from_index === to_index) return pages;
  const next = [...pages];
  const [moved] = next.splice(from_index, 1);
  if (!moved) return pages;
  next.splice(to_index, 0, moved);
  return next;
}

/** Removes a story page; the cover and the last story page cannot be removed. */
export function remove_page(pages: BookPage[], index: number): BookPage[] {
  const MIN_PAGES_WITH_COVER = 2;
  if (index < 1 || pages.length <= MIN_PAGES_WITH_COVER) return pages;
  return pages.filter((_, page_index) => page_index !== index);
}

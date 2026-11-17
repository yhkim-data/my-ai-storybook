import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_LIMIT, LAYOUT_TEXT_RECT } from '../constants';
import { build_demo_book } from '../data/demo_book';
import type { BookPage, PageDraft } from '../types';
import { apply_layout, get_ai_model_names, get_book_title, has_ai_image, make_story_page } from './book_model';
import { insert_blank_page, move_page, remove_page, useBook } from './book_store';

/** Minimum number of undo steps that must work. */
const REQUIRED_UNDO_STEPS = 35;
const PLOT = { id: 'plot-1', title: '별을 찾는 곰', summary: '곰이 별을 찾아 떠난다.' };

function reset_store() {
  useBook.setState({
    screen: 'start',
    return_screen: 'start',
    book: null,
    is_demo: false,
    has_saved_book: false,
    current_page: 0,
    undo_stack: [],
    redo_stack: [],
    last_change_key: null,
  });
}

function make_drafts(count: number): PageDraft[] {
  return Array.from({ length: count }, (_, index) => ({ text: `글 ${index + 1}`, image_prompt: `그림 ${index + 1}` }));
}

function pages_now(): BookPage[] {
  return useBook.getState().book?.pages ?? [];
}

/** Edits the text of page 1. */
function set_text(text: string, change_key?: string) {
  useBook.getState().edit_pages((pages) => pages.map((page, index) => (index === 1 ? { ...page, text } : page)), change_key);
}

function setup_book_with_pages(page_count = 4) {
  const state = useBook.getState();
  state.start_new_book('ko');
  state.update_seed({ page_count: 4 });
  state.choose_plot(PLOT);
  state.set_page_drafts(make_drafts(page_count), 'key-1');
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  reset_store();
});

describe('new book and pages', () => {
  it('start_new_book sets screen to seed with an empty book', () => {
    useBook.getState().start_new_book('en');
    const state = useBook.getState();
    expect(state.screen).toBe('seed');
    expect(state.book?.lang).toBe('en');
    expect(state.book?.pages).toEqual([]);
    expect(state.is_demo).toBe(false);
  });

  it('set_page_drafts builds cover + story pages with the title on the cover', () => {
    setup_book_with_pages(4);
    const pages = pages_now();
    expect(pages).toHaveLength(5);
    expect(pages[0]?.kind).toBe('cover');
    expect(pages[0]?.text).toBe(PLOT.title);
    expect(pages.slice(1).every((page) => page.kind === 'story')).toBe(true);
    expect(pages[2]?.text).toBe('글 2');
    expect(useBook.getState().book?.pages_key).toBe('key-1');
  });

  it('ensure_page_count grows and shrinks pages and keeps existing text', () => {
    setup_book_with_pages(4);
    useBook.getState().update_seed({ page_count: 6 });
    useBook.getState().ensure_page_count();
    expect(pages_now()).toHaveLength(7);
    expect(pages_now()[1]?.text).toBe('글 1');
    expect(pages_now()[4]?.text).toBe('글 4');
    expect(pages_now()[5]?.text).toBe('');
    useBook.getState().update_seed({ page_count: 4 });
    useBook.getState().ensure_page_count();
    expect(pages_now()).toHaveLength(5);
    expect(pages_now()[1]?.text).toBe('글 1');
    expect(pages_now()[0]?.text).toBe(PLOT.title);
  });

  it('ensure_page_count creates a cover for a book with no pages', () => {
    useBook.getState().start_new_book('ko');
    useBook.getState().ensure_page_count();
    expect(pages_now()).toHaveLength(useBook.getState().book!.seed.page_count + 1);
    expect(pages_now()[0]?.kind).toBe('cover');
  });

  it('choose_plot also updates the cover title when pages exist', () => {
    setup_book_with_pages(4);
    useBook.getState().choose_plot({ id: 'plot-2', title: '새 제목', summary: '요약' });
    expect(pages_now()[0]?.text).toBe('새 제목');
    expect(useBook.getState().book?.chosen_plot?.id).toBe('plot-2');
  });
});

describe('undo and redo', () => {
  it('undo/redo after edit_pages restores state exactly', () => {
    setup_book_with_pages(4);
    const before = pages_now();
    set_text('고친 글');
    const after = pages_now();
    expect(after[1]?.text).toBe('고친 글');
    useBook.getState().undo();
    expect(pages_now()).toBe(before);
    useBook.getState().redo();
    expect(pages_now()).toBe(after);
  });

  it('consecutive changes with the same change_key merge into one step', () => {
    setup_book_with_pages(4);
    const before = pages_now();
    set_text('a', 'text:1');
    set_text('ab', 'text:1');
    set_text('abc', 'text:1');
    expect(useBook.getState().undo_stack).toHaveLength(1);
    useBook.getState().undo();
    expect(pages_now()).toBe(before);
  });

  it('different change_keys are separate steps', () => {
    setup_book_with_pages(4);
    set_text('a', 'text:1');
    set_text('b', 'other');
    set_text('c');
    set_text('d');
    expect(useBook.getState().undo_stack).toHaveLength(4);
  });

  it('35 undos after 35 distinct changes restore the initial state', () => {
    setup_book_with_pages(4);
    const first = pages_now();
    for (let step = 0; step < REQUIRED_UNDO_STEPS; step += 1) set_text(`바꿈 ${step}`, `key-${step}`);
    expect(useBook.getState().undo_stack).toHaveLength(REQUIRED_UNDO_STEPS);
    for (let step = 0; step < REQUIRED_UNDO_STEPS; step += 1) useBook.getState().undo();
    expect(pages_now()).toBe(first);
    expect(useBook.getState().undo_stack).toHaveLength(0);
    expect(useBook.getState().redo_stack).toHaveLength(REQUIRED_UNDO_STEPS);
  });

  it('drops the oldest entries beyond HISTORY_LIMIT', () => {
    setup_book_with_pages(4);
    const total = HISTORY_LIMIT + 5;
    for (let step = 0; step < total; step += 1) set_text(`바꿈 ${step}`);
    expect(useBook.getState().undo_stack).toHaveLength(HISTORY_LIMIT);
    for (let step = 0; step < total; step += 1) useBook.getState().undo();
    // The first 5 changes fell out of history, so undo stops at the state before the 5th change.
    expect(pages_now()[1]?.text).toBe('바꿈 4');
  });

  it('a new change clears redo', () => {
    setup_book_with_pages(4);
    set_text('a');
    set_text('b');
    useBook.getState().undo();
    expect(useBook.getState().redo_stack).toHaveLength(1);
    set_text('c');
    expect(useBook.getState().redo_stack).toHaveLength(0);
  });

  it('no history entry when nothing changed (same pages array)', () => {
    setup_book_with_pages(4);
    useBook.getState().edit_pages((pages) => pages);
    expect(useBook.getState().undo_stack).toHaveLength(0);
  });
});

describe('insert, move and remove pages', () => {
  it('insert_blank_page inserts after the index, never before the cover', () => {
    setup_book_with_pages(4);
    const pages = pages_now();
    const added = insert_blank_page(pages, 2);
    expect(added).toHaveLength(pages.length + 1);
    expect(added[3]?.text).toBe('');
    expect(added[2]).toBe(pages[2]);
    expect(insert_blank_page(pages, 0)[1]?.text).toBe('');
  });

  it('move_page moves story pages but never the cover or before it', () => {
    setup_book_with_pages(4);
    const pages = pages_now();
    const moved = move_page(pages, 2, 4);
    expect(moved[4]).toBe(pages[2]);
    expect(moved[0]).toBe(pages[0]);
    expect(move_page(pages, 0, 2)).toBe(pages);
    expect(move_page(pages, 2, 0)).toBe(pages);
    expect(move_page(pages, 2, 2)).toBe(pages);
    expect(move_page(pages, 2, pages.length)).toBe(pages);
  });

  it('remove_page keeps the cover and at least one story page', () => {
    setup_book_with_pages(4);
    const pages = pages_now();
    expect(remove_page(pages, 0)).toBe(pages);
    const removed = remove_page(pages, 2);
    expect(removed).toHaveLength(pages.length - 1);
    expect(removed.includes(pages[2]!)).toBe(false);
    const cover_and_one = pages.slice(0, 2);
    expect(remove_page(cover_and_one, 1)).toBe(cover_and_one);
  });
});

describe('navigation', () => {
  it('go to a step screen updates book.step', () => {
    setup_book_with_pages(4);
    useBook.getState().go('plot');
    expect(useBook.getState().screen).toBe('plot');
    expect(useBook.getState().book?.step).toBe('plot');
  });

  it('go to a side screen leaves book.step alone', () => {
    setup_book_with_pages(4);
    useBook.getState().go('pictures');
    useBook.getState().go('connect');
    expect(useBook.getState().screen).toBe('connect');
    expect(useBook.getState().book?.step).toBe('pictures');
  });

  it('open_side and close_side remember the return screen', () => {
    setup_book_with_pages(4);
    useBook.getState().go('style');
    useBook.getState().open_side('rights');
    expect(useBook.getState().screen).toBe('rights');
    useBook.getState().close_side();
    expect(useBook.getState().screen).toBe('style');
  });

  it('open_book(book, true) sets is_demo and the finish screen', () => {
    useBook.getState().open_book(build_demo_book('ko'), true);
    expect(useBook.getState().is_demo).toBe(true);
    expect(useBook.getState().screen).toBe('finish');
  });

  it('open_book(book) goes to the saved step of the book', () => {
    useBook.getState().open_book({ ...build_demo_book('ko'), step: 'style' });
    expect(useBook.getState().is_demo).toBe(false);
    expect(useBook.getState().screen).toBe('style');
  });
});

describe('book helpers', () => {
  it('has_ai_image and get_ai_model_names (deduplicated)', () => {
    const book = build_demo_book('ko');
    expect(has_ai_image(book)).toBe(false);
    expect(get_ai_model_names(book)).toEqual([]);
    const make_ai = (index: number, model_name?: string): BookPage => ({
      ...book.pages[index]!,
      image: { data_url: 'data:image/png;base64,AAAA', source: 'ai', model_name },
    });
    const next = {
      ...book,
      pages: [book.pages[0]!, make_ai(1, 'a'), make_ai(2, 'a'), make_ai(3, 'b'), make_ai(4)],
    };
    expect(has_ai_image(next)).toBe(true);
    expect(get_ai_model_names(next)).toEqual(['a', 'b']);
  });

  it('get_book_title: cover text, then chosen plot title, then empty', () => {
    const book = build_demo_book('ko');
    expect(get_book_title(book)).toBe(book.pages[0]?.text.trim());
    const no_cover_text = { ...book, pages: [{ ...book.pages[0]!, text: '  ' }, ...book.pages.slice(1)] };
    expect(get_book_title(no_cover_text)).toBe(book.chosen_plot?.title.trim());
    expect(get_book_title({ ...no_cover_text, chosen_plot: null })).toBe('');
  });

  it('apply_layout: full sets a white background and moves the text box', () => {
    const page = make_story_page('글');
    expect(page.text_box.background).toBe('none');
    const full = apply_layout(page, 'full');
    expect(full.layout).toBe('full');
    expect(full.text_box.background).toBe('white');
    expect(full.text_box).toMatchObject(LAYOUT_TEXT_RECT.full);
    const text_left = apply_layout(page, 'text_left');
    expect(text_left.text_box).toMatchObject(LAYOUT_TEXT_RECT.text_left);
    expect(text_left.text_box.background).toBe('none');
  });
});

describe('book shape and undo', () => {
  it('changing the shape is one undo step that also restores the picture boxes', () => {
    useBook.setState({ book: build_demo_book('ko'), undo_stack: [], redo_stack: [], last_change_key: null });
    const before = useBook.getState().book!;
    useBook.getState().set_page_shape('landscape');
    expect(useBook.getState().book?.page_shape).toBe('landscape');
    expect(useBook.getState().undo_stack).toHaveLength(1);
    useBook.getState().undo();
    expect(useBook.getState().book?.page_shape).toBe('square');
    expect(useBook.getState().book?.pages).toEqual(before.pages);
    useBook.getState().redo();
    expect(useBook.getState().book?.page_shape).toBe('landscape');
  });

  it('choosing the same shape again changes nothing', () => {
    useBook.setState({ book: build_demo_book('ko'), undo_stack: [], redo_stack: [] });
    useBook.getState().set_page_shape('square');
    expect(useBook.getState().undo_stack).toHaveLength(0);
  });
});

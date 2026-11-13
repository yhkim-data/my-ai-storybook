// 책 저장소 검사: 새 책, 쪽 만들기, 쪽수 맞추기, 되돌리기(30단계 이상), 쪽 넣기·옮기기·빼기, 화면 이동.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_LIMIT, LAYOUT_TEXT_RECT } from '../constants';
import { build_demo_book } from '../data/demo_book';
import type { BookPage, PageDraft } from '../types';
import { apply_layout, get_ai_model_names, get_book_title, has_ai_image, make_story_page } from './book_model';
import { insert_blank_page, move_page, remove_page, useBook } from './book_store';

/** 되돌리기 요구 단계 수 */
const REQUIRED_UNDO_STEPS = 35;
const PLOT = { id: 'plot-1', title: '별을 찾는 곰', summary: '곰이 별을 찾아 떠난다.' };

/** 저장소를 처음 상태로 돌린다. */
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

/** 쪽 초안 n개를 만든다. */
function make_drafts(count: number): PageDraft[] {
  return Array.from({ length: count }, (_, index) => ({ text: `글 ${index + 1}`, image_prompt: `그림 ${index + 1}` }));
}

/** 지금 책의 쪽을 돌려준다. */
function pages_now(): BookPage[] {
  return useBook.getState().book?.pages ?? [];
}

/** 1번 쪽의 글을 바꾸는 바꿈 */
function set_text(text: string, change_key?: string) {
  useBook.getState().edit_pages((pages) => pages.map((page, index) => (index === 1 ? { ...page, text } : page)), change_key);
}

/** 쪽이 있는 책을 시작 상태로 준비한다. */
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

describe('새 책과 쪽 만들기', () => {
  it('start_new_book 뒤 screen이 seed이고 책이 비어 있다', () => {
    useBook.getState().start_new_book('en');
    const state = useBook.getState();
    expect(state.screen).toBe('seed');
    expect(state.book?.lang).toBe('en');
    expect(state.book?.pages).toEqual([]);
    expect(state.is_demo).toBe(false);
  });

  it('set_page_drafts가 표지+본문을 만들고 표지 글이 제목이다', () => {
    setup_book_with_pages(4);
    const pages = pages_now();
    expect(pages).toHaveLength(5);
    expect(pages[0]?.kind).toBe('cover');
    expect(pages[0]?.text).toBe(PLOT.title);
    expect(pages.slice(1).every((page) => page.kind === 'story')).toBe(true);
    expect(pages[2]?.text).toBe('글 2');
    expect(useBook.getState().book?.pages_key).toBe('key-1');
  });

  it('ensure_page_count가 쪽수를 늘리고 줄이며 기존 글을 지킨다', () => {
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

  it('ensure_page_count는 쪽이 없는 책에도 표지를 만든다', () => {
    useBook.getState().start_new_book('ko');
    useBook.getState().ensure_page_count();
    expect(pages_now()).toHaveLength(useBook.getState().book!.seed.page_count + 1);
    expect(pages_now()[0]?.kind).toBe('cover');
  });

  it('choose_plot이 쪽이 있을 때 표지 제목도 바꾼다', () => {
    setup_book_with_pages(4);
    useBook.getState().choose_plot({ id: 'plot-2', title: '새 제목', summary: '요약' });
    expect(pages_now()[0]?.text).toBe('새 제목');
    expect(useBook.getState().book?.chosen_plot?.id).toBe('plot-2');
  });
});

describe('되돌리기와 다시 하기', () => {
  it('edit_pages 뒤 undo/redo로 상태가 정확히 돌아온다', () => {
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

  it('같은 change_key로 연속 바꾸면 한 단계로 묶인다', () => {
    setup_book_with_pages(4);
    const before = pages_now();
    set_text('a', 'text:1');
    set_text('ab', 'text:1');
    set_text('abc', 'text:1');
    expect(useBook.getState().undo_stack).toHaveLength(1);
    useBook.getState().undo();
    expect(pages_now()).toBe(before);
  });

  it('change_key가 다르면 따로 쌓인다', () => {
    setup_book_with_pages(4);
    set_text('a', 'text:1');
    set_text('b', 'other');
    set_text('c');
    set_text('d');
    expect(useBook.getState().undo_stack).toHaveLength(4);
  });

  it('서로 다른 바꿈 35번 뒤 undo 35번으로 처음 상태가 된다', () => {
    setup_book_with_pages(4);
    const first = pages_now();
    for (let step = 0; step < REQUIRED_UNDO_STEPS; step += 1) set_text(`바꿈 ${step}`, `key-${step}`);
    expect(useBook.getState().undo_stack).toHaveLength(REQUIRED_UNDO_STEPS);
    for (let step = 0; step < REQUIRED_UNDO_STEPS; step += 1) useBook.getState().undo();
    expect(pages_now()).toBe(first);
    expect(useBook.getState().undo_stack).toHaveLength(0);
    expect(useBook.getState().redo_stack).toHaveLength(REQUIRED_UNDO_STEPS);
  });

  it('HISTORY_LIMIT을 넘으면 오래된 것부터 버린다', () => {
    setup_book_with_pages(4);
    const total = HISTORY_LIMIT + 5;
    for (let step = 0; step < total; step += 1) set_text(`바꿈 ${step}`);
    expect(useBook.getState().undo_stack).toHaveLength(HISTORY_LIMIT);
    for (let step = 0; step < total; step += 1) useBook.getState().undo();
    // 처음 5번의 바꿈은 기록에서 밀려났으므로, 마지막으로 돌아간 상태는 5번째 바꿈 직전("바꿈 4")이다.
    expect(pages_now()[1]?.text).toBe('바꿈 4');
  });

  it('새 바꿈을 하면 redo가 비워진다', () => {
    setup_book_with_pages(4);
    set_text('a');
    set_text('b');
    useBook.getState().undo();
    expect(useBook.getState().redo_stack).toHaveLength(1);
    set_text('c');
    expect(useBook.getState().redo_stack).toHaveLength(0);
  });

  it('바뀐 것이 없으면(같은 쪽 배열) 기록이 쌓이지 않는다', () => {
    setup_book_with_pages(4);
    useBook.getState().edit_pages((pages) => pages);
    expect(useBook.getState().undo_stack).toHaveLength(0);
  });
});

describe('쪽 넣기·옮기기·빼기', () => {
  it('insert_blank_page가 뒤에 빈 쪽을 넣고, 표지 뒤가 가장 앞이다', () => {
    setup_book_with_pages(4);
    const pages = pages_now();
    const added = insert_blank_page(pages, 2);
    expect(added).toHaveLength(pages.length + 1);
    expect(added[3]?.text).toBe('');
    expect(added[2]).toBe(pages[2]);
    expect(insert_blank_page(pages, 0)[1]?.text).toBe('');
  });

  it('move_page: 본문은 옮기고 표지는 못 옮기며 표지 앞으로 못 간다', () => {
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

  it('remove_page: 표지는 못 빼고 본문 한 쪽은 남긴다', () => {
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

describe('화면 이동', () => {
  it('go가 단계 화면이면 book.step을 바꾼다', () => {
    setup_book_with_pages(4);
    useBook.getState().go('plot');
    expect(useBook.getState().screen).toBe('plot');
    expect(useBook.getState().book?.step).toBe('plot');
  });

  it('go가 곁 화면이면 book.step을 안 바꾼다', () => {
    setup_book_with_pages(4);
    useBook.getState().go('pictures');
    useBook.getState().go('connect');
    expect(useBook.getState().screen).toBe('connect');
    expect(useBook.getState().book?.step).toBe('pictures');
  });

  it('open_side와 close_side가 돌아갈 화면을 기억한다', () => {
    setup_book_with_pages(4);
    useBook.getState().go('style');
    useBook.getState().open_side('rights');
    expect(useBook.getState().screen).toBe('rights');
    useBook.getState().close_side();
    expect(useBook.getState().screen).toBe('style');
  });

  it('open_book(book, true)는 is_demo와 screen finish이다', () => {
    useBook.getState().open_book(build_demo_book('ko'), true);
    expect(useBook.getState().is_demo).toBe(true);
    expect(useBook.getState().screen).toBe('finish');
  });

  it('open_book(book)은 책이 있던 단계로 간다', () => {
    useBook.getState().open_book({ ...build_demo_book('ko'), step: 'style' });
    expect(useBook.getState().is_demo).toBe(false);
    expect(useBook.getState().screen).toBe('style');
  });
});

describe('책 도우미', () => {
  it('has_ai_image와 get_ai_model_names (겹침 제거)', () => {
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

  it('get_book_title: 표지 글, 없으면 고른 줄거리 제목, 그것도 없으면 빈 글', () => {
    const book = build_demo_book('ko');
    expect(get_book_title(book)).toBe(book.pages[0]?.text.trim());
    const no_cover_text = { ...book, pages: [{ ...book.pages[0]!, text: '  ' }, ...book.pages.slice(1)] };
    expect(get_book_title(no_cover_text)).toBe(book.chosen_plot?.title.trim());
    expect(get_book_title({ ...no_cover_text, chosen_plot: null })).toBe('');
  });

  it('apply_layout: full이면 바탕이 white가 되고 글상자 자리가 바뀐다', () => {
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

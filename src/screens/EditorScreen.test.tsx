// Step 7 editor tests. Every edit except image regeneration must make zero AI calls.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAYOUT_TEXT_RECT, TEXT_COLORS } from '../constants';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import type { Book, BookPage, LayoutId, Rect } from '../types';
import { EditorScreen } from './EditorScreen';

const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);

/** Text box position clear of every snap line (x 10-40, y 20-40, center 25/30). */
const FREE_RECT: Rect = { x: 10, y: 20, w: 30, h: 20 };
const ARROW_PRESSES = 3;
const DRAG_START = 100;
const DRAG_FAR_PX = 60;
const DRAG_NEAR_PX = 3;
const STORY_PAGES = 8;

/** Demo book with page 1's text box moved away from snap lines. */
function make_book(): Book {
  const book = build_demo_book('ko');
  const pages = book.pages.map((page, index) => (index === 1 ? { ...page, text_box: { ...page.text_box, ...FREE_RECT } } : page));
  return { ...book, pages };
}

function setup(options: { page?: number; practice?: boolean; text_key?: string } = {}) {
  useSettings.setState({ lang: 'ko', practice: options.practice ?? false, text_key: options.text_key ?? '', image_key: '', usage_count: 0 });
  useBook.setState({
    book: make_book(),
    is_demo: false,
    screen: 'editor',
    current_page: options.page ?? 1,
    undo_stack: [],
    redo_stack: [],
    last_change_key: null,
  });
  return render(<EditorScreen />);
}

function pages_now(): BookPage[] {
  return useBook.getState().book?.pages ?? [];
}
function page_one(): BookPage {
  return pages_now()[1]!;
}
function button(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}
function expect_no_ai_calls() {
  expect(useSettings.getState().usage_count).toBe(0);
}

beforeEach(() => {
  window.scrollTo = vi.fn();
});
afterEach(() => cleanup());

describe('header and footer', () => {
  it('shows the step title, undo/redo/regenerate buttons, the no-AI badge and DI Lab', () => {
    setup();
    expect(screen.getByText('7 / 8 꾸미기')).toBeInTheDocument();
    expect(button(ko('editor.undo'))).toBeInTheDocument();
    expect(button(ko('editor.redo'))).toBeInTheDocument();
    expect(button(ko('editor.regen'))).toBeInTheDocument();
    expect(screen.getByText(ko('editor.no_ai_badge'))).toBeInTheDocument();
    expect(screen.getAllByText('DI Lab').length).toBeGreaterThanOrEqual(2);
  });

  it('footer shows the maker line and "Data Insight Lab"', () => {
    setup();
    expect(screen.getByText(/만든 곳/)).toBeInTheDocument();
    expect(screen.getByText(/Data Insight Lab/)).toBeInTheDocument();
  });

  it('undo and redo start disabled', () => {
    setup();
    expect(button(ko('editor.undo'))).toBeDisabled();
    expect(button(ko('editor.redo'))).toBeDisabled();
  });
});

describe('text editing and undo', () => {
  it('editing text updates the book and undo/redo toggles it', () => {
    setup();
    const original = page_one().text;
    const textarea = screen.getByRole('textbox', { name: /1쪽 글/ });
    fireEvent.change(textarea, { target: { value: '고친 글' } });
    expect(page_one().text).toBe('고친 글');
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one().text).toBe(original);
    fireEvent.click(button(ko('editor.redo')));
    expect(page_one().text).toBe('고친 글');
    expect_no_ai_calls();
  });

  it('one undo reverts a run of consecutive typing', () => {
    setup();
    const original = page_one().text;
    const textarea = screen.getByRole('textbox', { name: /1쪽 글/ });
    fireEvent.change(textarea, { target: { value: '가' } });
    fireEvent.change(textarea, { target: { value: '가나' } });
    fireEvent.change(textarea, { target: { value: '가나다' } });
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one().text).toBe(original);
    expect_no_ai_calls();
  });
});

describe('text box settings', () => {
  it('picking a font changes font_id and undo restores it', () => {
    setup();
    const before = page_one();
    fireEvent.change(screen.getByLabelText(ko('editor.font')), { target: { value: 'hand' } });
    expect(page_one().text_box.font_id).toBe('hand');
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one()).toEqual(before);
    expect_no_ai_calls();
  });

  it('the font size slider changes font_size', () => {
    setup();
    fireEvent.change(screen.getByLabelText(ko('editor.font_size')), { target: { value: '30' } });
    expect(page_one().text_box.font_size).toBe(30);
    expect_no_ai_calls();
  });

  it('a color swatch changes color and moves aria-pressed', () => {
    setup();
    const white = TEXT_COLORS.find((color) => color.id === 'white')!;
    const navy = button(ko('editor.color.navy'));
    expect(navy).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button(ko('editor.color.white')));
    expect(page_one().text_box.color).toBe(white.value);
    expect(button(ko('editor.color.white'))).toHaveAttribute('aria-pressed', 'true');
    expect(button(ko('editor.color.navy'))).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one().text_box.color).not.toBe(white.value);
    expect_no_ai_calls();
  });

  it('an align button changes align and moves aria-pressed', () => {
    setup();
    fireEvent.click(button(ko('editor.align.center')));
    expect(page_one().text_box.align).toBe('center');
    expect(button(ko('editor.align.center'))).toHaveAttribute('aria-pressed', 'true');
    expect(button(ko('editor.align.left'))).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one().text_box.align).toBe('left');
    expect_no_ai_calls();
  });

  it('the bubble background changes background and moves aria-pressed', () => {
    setup();
    fireEvent.click(button(ko('editor.bg.bubble')));
    expect(page_one().text_box.background).toBe('bubble');
    expect(button(ko('editor.bg.bubble'))).toHaveAttribute('aria-pressed', 'true');
    expect(button(ko('editor.bg.none'))).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one().text_box.background).toBe('none');
    expect_no_ai_calls();
  });
});

describe('layout', () => {
  const LAYOUTS: LayoutId[] = ['image_top', 'text_top', 'image_left', 'text_left', 'full'];

  it.each(LAYOUTS)('layout %s changes layout, text box rect and aria-pressed, and undo restores them', (layout) => {
    setup();
    const before = page_one();
    fireEvent.click(screen.getByRole('tab', { name: ko('editor.tab.image') }));
    fireEvent.click(button(ko(`editor.layout.${layout}`)));
    expect(page_one().layout).toBe(layout);
    expect(page_one().text_box).toMatchObject(LAYOUT_TEXT_RECT[layout]);
    expect(button(ko(`editor.layout.${layout}`))).toHaveAttribute('aria-pressed', 'true');
    for (const other of LAYOUTS.filter((id) => id !== layout)) {
      expect(button(ko(`editor.layout.${other}`))).toHaveAttribute('aria-pressed', 'false');
    }
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one()).toEqual(before);
    expect_no_ai_calls();
  });
});

describe('keyboard move and resize', () => {
  it('3 ArrowRight presses on the move handle add 3 to x and one undo restores it', () => {
    setup();
    const start_x = page_one().text_box.x;
    const handle = screen.getByTestId('box-move');
    handle.focus();
    for (let press = 0; press < ARROW_PRESSES; press += 1) fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(page_one().text_box.x).toBeCloseTo(start_x + ARROW_PRESSES);
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one().text_box.x).toBe(start_x);
    expect_no_ai_calls();
  });

  it('ArrowDown on the resize handle increases h', () => {
    setup();
    const start_h = page_one().text_box.h;
    const handle = screen.getByTestId('box-resize');
    handle.focus();
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(page_one().text_box.h).toBeGreaterThan(start_h);
    expect(page_one().text_box.y).toBe(FREE_RECT.y);
    expect_no_ai_calls();
  });
});

describe('dragging', () => {
  function drag_box(dx_px: number) {
    const box = screen.getByTestId('text-box');
    fireEvent.pointerDown(box, { button: 0, clientX: DRAG_START, clientY: DRAG_START });
    fireEvent(window, new MouseEvent('pointermove', { clientX: DRAG_START + dx_px, clientY: DRAG_START, bubbles: true }));
    fireEvent(window, new MouseEvent('pointerup', { clientX: DRAG_START + dx_px, clientY: DRAG_START, bubbles: true }));
  }

  it('a long enough drag increases x', () => {
    setup();
    drag_box(DRAG_FAR_PX);
    expect(page_one().text_box.x).toBeGreaterThan(FREE_RECT.x);
    expect(page_one().text_box.y).toBe(FREE_RECT.y);
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one().text_box.x).toBe(FREE_RECT.x);
    expect_no_ai_calls();
  });

  it('a move under 5px changes nothing', () => {
    setup();
    drag_box(DRAG_NEAR_PX);
    expect(page_one().text_box.x).toBe(FREE_RECT.x);
    expect(useBook.getState().undo_stack).toHaveLength(0);
    expect_no_ai_calls();
  });
});

describe('adding, removing and moving pages', () => {
  it('add page: one more page and the new page is selected', () => {
    setup();
    fireEvent.click(button(ko('editor.add_page')));
    expect(pages_now()).toHaveLength(STORY_PAGES + 2);
    expect(useBook.getState().current_page).toBe(2);
    expect(pages_now()[2]?.text).toBe('');
    expect_no_ai_calls();
  });

  it('remove page: one page fewer and undo brings it back', () => {
    setup();
    fireEvent.click(button(ko('editor.remove_page')));
    expect(pages_now()).toHaveLength(STORY_PAGES);
    fireEvent.click(button(ko('editor.undo')));
    expect(pages_now()).toHaveLength(STORY_PAGES + 1);
    expect_no_ai_calls();
  });

  it('move down: the order changes', () => {
    setup();
    const [, first, second] = pages_now();
    fireEvent.click(button(ko('editor.move_down')));
    expect(pages_now()[1]?.id).toBe(second!.id);
    expect(pages_now()[2]?.id).toBe(first!.id);
    expect(useBook.getState().current_page).toBe(2);
    expect_no_ai_calls();
  });

  it('on the cover, remove and move are disabled and the cover hint is shown', () => {
    setup({ page: 0 });
    expect(button(ko('editor.remove_page'))).toBeDisabled();
    expect(button(ko('editor.move_up'))).toBeDisabled();
    expect(button(ko('editor.move_down'))).toBeDisabled();
    expect(screen.getByText(ko('editor.cover_hint'))).toBeInTheDocument();
    expect_no_ai_calls();
  });
});

describe('regenerating one image', () => {
  it('without a connection shows a notice and makes no call', async () => {
    setup();
    const before = pages_now();
    fireEvent.click(button(ko('editor.regen')));
    expect(await screen.findByText(ko('editor.regen_need'))).toBeInTheDocument();
    expect(pages_now()).toBe(before);
    expect_no_ai_calls();
  });

  it('in practice mode replaces only that page image with exactly one call, and undo restores it', async () => {
    setup({ practice: true });
    const before = pages_now();
    fireEvent.click(button(ko('editor.regen')));
    await waitFor(() => expect(page_one().image?.source).toBe('ai'));
    expect(page_one().image?.model_name).toBe('mock-image');
    pages_now().forEach((page, index) => {
      if (index !== 1) expect(page.image).toEqual(before[index]?.image);
    });
    expect(useSettings.getState().usage_count).toBe(1);
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one().image).toEqual(before[1]?.image);
  });
});

describe('navigation buttons', () => {
  it('next goes to finish, previous goes to pictures', () => {
    setup();
    fireEvent.click(button(ko('editor.next')));
    expect(useBook.getState().screen).toBe('finish');
    useBook.setState({ screen: 'editor' });
    fireEvent.click(within(document.body).getByRole('button', { name: ko('common.prev') }));
    expect(useBook.getState().screen).toBe('pictures');
    expect_no_ai_calls();
  });
});

describe('settings tabs and the page art style', () => {
  it('the words tab is shown first; the picture tab has the layout and the art style', () => {
    setup();
    expect(screen.getByRole('tab', { name: ko('editor.tab.text') })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(ko('editor.font'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: ko('editor.tab.image') }));
    expect(screen.queryByLabelText(ko('editor.font'))).not.toBeInTheDocument();
    expect(button(ko('editor.layout.full'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ko('style.page.menu_aria', { name: ko('style.name.watercolor') }) })).toBeInTheDocument();
  });

  it('arrow keys move between the tabs', () => {
    setup();
    const text_tab = screen.getByRole('tab', { name: ko('editor.tab.text') });
    fireEvent.keyDown(text_tab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: ko('editor.tab.image') })).toHaveAttribute('aria-selected', 'true');
  });

  it('a page style is one undo step; with real AI the picture stays and the redraw button asks to redraw', () => {
    setup();
    const book = useBook.getState().book!;
    // Pretend page 1 has an AI picture made in the book style.
    useBook.setState({
      book: { ...book, pages: book.pages.map((page, index) => (index === 1 ? { ...page, image: { data_url: 'data:image/png;base64,AA', source: 'ai', model_name: 'm', style_key: 'watercolor' } } : page)) },
      undo_stack: [],
    });
    const image_before = page_one().image;
    fireEvent.click(screen.getByRole('tab', { name: ko('editor.tab.image') }));
    fireEvent.click(screen.getByRole('button', { name: ko('style.page.menu_aria', { name: ko('style.name.watercolor') }) }));
    fireEvent.click(button(ko('style.name.pixel')));
    expect(page_one().style).toBe('pixel');
    expect(page_one().image).toEqual(image_before);
    expect(button(ko('pictures.redo_style'))).toHaveClass('attention');
    expect_no_ai_calls();
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one().style).toBeUndefined();
    expect(button(ko('editor.regen'))).not.toHaveClass('attention');
  });

  it('practice mode swaps the picture for the new style right away', async () => {
    setup({ practice: true });
    const book = useBook.getState().book!;
    useBook.setState({
      book: { ...book, pages: book.pages.map((page, index) => (index === 1 ? { ...page, image: { data_url: 'data:image/png;base64,AA', source: 'ai', model_name: 'mock-image', style_key: 'watercolor' } } : page)) },
    });
    fireEvent.click(screen.getByRole('tab', { name: ko('editor.tab.image') }));
    fireEvent.click(screen.getByRole('button', { name: ko('style.page.menu_aria', { name: ko('style.name.watercolor') }) }));
    fireEvent.click(button(ko('style.name.pencil')));
    await waitFor(() => expect(page_one().image?.style_key).toBe('pencil'));
    expect(page_one().image?.data_url.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('"my own style" for one page opens a description box right under it', () => {
    setup();
    fireEvent.click(screen.getByRole('tab', { name: ko('editor.tab.image') }));
    fireEvent.click(screen.getByRole('button', { name: ko('style.page.menu_aria', { name: ko('style.name.watercolor') }) }));
    fireEvent.click(button(ko('style.name.custom')));
    fireEvent.change(screen.getByLabelText(ko('style.page.custom_label')), { target: { value: '수묵화 느낌' } });
    expect(page_one().style).toBe('custom');
    expect(page_one().custom_style).toBe('수묵화 느낌');
    fireEvent.click(button(ko('style.page.follow', { name: ko('style.name.watercolor') })));
    expect(page_one().style).toBeUndefined();
  });
});

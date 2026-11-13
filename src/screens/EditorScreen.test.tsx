// 7단계 꾸미기 화면 검사: 글 고치기, 글상자 설정, 배치, 키보드·끌기, 쪽 더하기/빼기/옮기기, 그림 다시 만들기, AI 호출 0회.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAYOUT_TEXT_RECT, TEXT_COLORS } from '../constants';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import type { Book, BookPage, LayoutId, Rect } from '../types';
import { EditorScreen } from './EditorScreen';

/** 한국어 문구 */
const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);

/** 자석에 걸리지 않는 글상자 자리 (가로 10~40, 세로 20~40, 가운데 25·30) */
const FREE_RECT: Rect = { x: 10, y: 20, w: 30, h: 20 };
const ARROW_PRESSES = 3;
const DRAG_START = 100;
const DRAG_FAR_PX = 60;
const DRAG_NEAR_PX = 3;
const STORY_PAGES = 8;

/** 책의 1번 쪽 글상자를 자석에 걸리지 않는 자리로 옮긴 책을 만든다. */
function make_book(): Book {
  const book = build_demo_book('ko');
  const pages = book.pages.map((page, index) => (index === 1 ? { ...page, text_box: { ...page.text_box, ...FREE_RECT } } : page));
  return { ...book, pages };
}

/** 저장소를 준비하고 화면을 그린다. */
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

/** 지금 책의 쪽 */
function pages_now(): BookPage[] {
  return useBook.getState().book?.pages ?? [];
}
/** 지금 1번 쪽 */
function page_one(): BookPage {
  return pages_now()[1]!;
}
/** 이름으로 단추를 찾는다. */
function button(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}
/** AI를 한 번도 부르지 않았는지 본다. */
function expect_no_ai_calls() {
  expect(useSettings.getState().usage_count).toBe(0);
}

beforeEach(() => {
  window.scrollTo = vi.fn();
});
afterEach(() => cleanup());

describe('머리글과 바닥글', () => {
  it('단계 제목, 되돌리기·다시 하기·그림 다시 만들기, AI 안 씀 표시, DI Lab', () => {
    setup();
    expect(screen.getByText('7 / 8 꾸미기')).toBeInTheDocument();
    expect(button(ko('editor.undo'))).toBeInTheDocument();
    expect(button(ko('editor.redo'))).toBeInTheDocument();
    expect(button(ko('editor.regen'))).toBeInTheDocument();
    expect(screen.getByText(ko('editor.no_ai_badge'))).toBeInTheDocument();
    expect(screen.getAllByText('DI Lab').length).toBeGreaterThanOrEqual(2);
  });

  it('바닥글에 "만든 곳"과 "Data Insight Lab"이 있다', () => {
    setup();
    expect(screen.getByText(/만든 곳/)).toBeInTheDocument();
    expect(screen.getByText(/Data Insight Lab/)).toBeInTheDocument();
  });

  it('처음에는 되돌리기와 다시 하기가 꺼져 있다', () => {
    setup();
    expect(button(ko('editor.undo'))).toBeDisabled();
    expect(button(ko('editor.redo'))).toBeDisabled();
  });
});

describe('글 고치기와 되돌리기', () => {
  it('글을 고치면 책이 바뀌고 되돌리기·다시 하기로 오간다', () => {
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

  it('글자를 이어서 쓰면 되돌리기 한 번으로 원래 글이 된다', () => {
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

describe('글상자 설정', () => {
  it('글꼴을 고르면 font_id가 바뀌고 되돌리면 원래대로다', () => {
    setup();
    const before = page_one();
    fireEvent.change(screen.getByLabelText(ko('editor.font')), { target: { value: 'hand' } });
    expect(page_one().text_box.font_id).toBe('hand');
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one()).toEqual(before);
    expect_no_ai_calls();
  });

  it('글자 크기 막대를 움직이면 font_size가 바뀐다', () => {
    setup();
    fireEvent.change(screen.getByLabelText(ko('editor.font_size')), { target: { value: '30' } });
    expect(page_one().text_box.font_size).toBe(30);
    expect_no_ai_calls();
  });

  it('글자 색 단추를 누르면 color가 바뀌고 aria-pressed가 옮겨 간다', () => {
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

  it('글 맞춤 단추를 누르면 align이 바뀌고 aria-pressed가 옮겨 간다', () => {
    setup();
    fireEvent.click(button(ko('editor.align.center')));
    expect(page_one().text_box.align).toBe('center');
    expect(button(ko('editor.align.center'))).toHaveAttribute('aria-pressed', 'true');
    expect(button(ko('editor.align.left'))).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one().text_box.align).toBe('left');
    expect_no_ai_calls();
  });

  it('글상자 바탕(말풍선)을 고르면 background가 바뀌고 aria-pressed가 옮겨 간다', () => {
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

describe('배치', () => {
  const LAYOUTS: LayoutId[] = ['image_top', 'text_top', 'image_left', 'text_left', 'full'];

  it.each(LAYOUTS)('배치 %s를 누르면 layout, 글상자 자리, aria-pressed가 바뀌고 되돌리면 원래대로다', (layout) => {
    setup();
    const before = page_one();
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

describe('키보드로 옮기고 크기 바꾸기', () => {
  it('옮기기 손잡이에서 ArrowRight 3번이면 x가 3 늘고 되돌리기 한 번으로 원래 x다', () => {
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

  it('크기 손잡이에서 ArrowDown을 누르면 h가 늘어난다', () => {
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

describe('끌기', () => {
  /** 글상자를 눌러 (dx_px)만큼 끌고 뗀다. */
  function drag_box(dx_px: number) {
    const box = screen.getByTestId('text-box');
    fireEvent.pointerDown(box, { button: 0, clientX: DRAG_START, clientY: DRAG_START });
    fireEvent(window, new MouseEvent('pointermove', { clientX: DRAG_START + dx_px, clientY: DRAG_START, bubbles: true }));
    fireEvent(window, new MouseEvent('pointerup', { clientX: DRAG_START + dx_px, clientY: DRAG_START, bubbles: true }));
  }

  it('충분히 끌면 x가 커진다', () => {
    setup();
    drag_box(DRAG_FAR_PX);
    expect(page_one().text_box.x).toBeGreaterThan(FREE_RECT.x);
    expect(page_one().text_box.y).toBe(FREE_RECT.y);
    fireEvent.click(button(ko('editor.undo')));
    expect(page_one().text_box.x).toBe(FREE_RECT.x);
    expect_no_ai_calls();
  });

  it('5px보다 덜 움직이면 안 바뀐다', () => {
    setup();
    drag_box(DRAG_NEAR_PX);
    expect(page_one().text_box.x).toBe(FREE_RECT.x);
    expect(useBook.getState().undo_stack).toHaveLength(0);
    expect_no_ai_calls();
  });
});

describe('쪽 더하기·빼기·옮기기', () => {
  it('쪽 더하기: 쪽이 하나 늘고 새 쪽이 선택된다', () => {
    setup();
    fireEvent.click(button(ko('editor.add_page')));
    expect(pages_now()).toHaveLength(STORY_PAGES + 2);
    expect(useBook.getState().current_page).toBe(2);
    expect(pages_now()[2]?.text).toBe('');
    expect_no_ai_calls();
  });

  it('이 쪽 빼기: 쪽이 하나 줄고 되돌리면 돌아온다', () => {
    setup();
    fireEvent.click(button(ko('editor.remove_page')));
    expect(pages_now()).toHaveLength(STORY_PAGES);
    fireEvent.click(button(ko('editor.undo')));
    expect(pages_now()).toHaveLength(STORY_PAGES + 1);
    expect_no_ai_calls();
  });

  it('뒤로 옮기기: 순서가 바뀐다', () => {
    setup();
    const [, first, second] = pages_now();
    fireEvent.click(button(ko('editor.move_down')));
    expect(pages_now()[1]?.id).toBe(second!.id);
    expect(pages_now()[2]?.id).toBe(first!.id);
    expect(useBook.getState().current_page).toBe(2);
    expect_no_ai_calls();
  });

  it('표지에서는 빼기·옮기기가 꺼져 있고 표지 안내가 보인다', () => {
    setup({ page: 0 });
    expect(button(ko('editor.remove_page'))).toBeDisabled();
    expect(button(ko('editor.move_up'))).toBeDisabled();
    expect(button(ko('editor.move_down'))).toBeDisabled();
    expect(screen.getByText(ko('editor.cover_hint'))).toBeInTheDocument();
    expect_no_ai_calls();
  });
});

describe('이 그림만 다시 만들기', () => {
  it('연결이 없으면 안내 문구가 보이고 호출이 없다', async () => {
    setup();
    const before = pages_now();
    fireEvent.click(button(ko('editor.regen')));
    expect(await screen.findByText(ko('editor.regen_need'))).toBeInTheDocument();
    expect(pages_now()).toBe(before);
    expect_no_ai_calls();
  });

  it('연습 모드면 그 쪽 그림만 AI 그림으로 바뀌고 호출이 정확히 1 늘며 되돌리면 원래 그림이다', async () => {
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

describe('이동 단추', () => {
  it('다음은 finish, 이전은 pictures로 간다', () => {
    setup();
    fireEvent.click(button(ko('editor.next')));
    expect(useBook.getState().screen).toBe('finish');
    useBook.setState({ screen: 'editor' });
    fireEvent.click(within(document.body).getByRole('button', { name: ko('common.prev') }));
    expect(useBook.getState().screen).toBe('pictures');
    expect_no_ai_calls();
  });
});

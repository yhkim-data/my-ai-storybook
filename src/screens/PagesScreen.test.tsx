// 4단계 쪽 나누기 화면 검사: 쪽 나누기 1회, 다시 그릴 때 호출 없음, 글 고치기, 직접 쓰기, 한도 초과 안내.
import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get_sample_plots } from '../data/sample_story';
import { translate } from '../i18n';
import { reset_mock_failures } from '../providers/mock_failure';
import { create_book, make_seed } from '../store/book_model';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import type { Book, PageCount } from '../types';
import { PagesScreen } from './PagesScreen';

const ko = (key: string) => translate('ko', key);
/** 검사에서 쓰는 본문 쪽수 */
const PAGE_COUNT: PageCount = 4;
/** 본문 글 칸을 찾는 이름 (1쪽 글, 2쪽 글, ...) */
const TEXT_LABEL = /쪽 글$/;
const DESC_LABEL = /쪽 그림 설명$/;

/** 고른 줄거리가 있는 책을 준비한다. */
function prepare_store(patch: Partial<Book> = {}): void {
  useSettings.setState({ lang: 'ko', practice: true, text_key: '' });
  const plot = get_sample_plots('ko', '토리')[0] ?? null;
  const book: Book = {
    ...create_book('ko'),
    seed: { ...make_seed(), topic: '모험', hero_name: '토리', page_count: PAGE_COUNT },
    chosen_plot: plot,
    ...patch,
  };
  useBook.setState({ book, screen: 'pages' });
}

const usage = () => useSettings.getState().usage_count;

/** 지금 책을 읽는다. */
function current_book(): Book {
  const book = useBook.getState().book;
  if (!book) throw new Error('책이 없어요');
  return book;
}

describe('PagesScreen', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    reset_mock_failures();
  });
  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
    reset_mock_failures();
  });

  it('연습 모드로 들어오면 쪽 칸이 쪽수만큼 생기고 호출은 1회다 (StrictMode 포함)', async () => {
    prepare_store();
    const before = usage();
    render(
      <StrictMode>
        <PagesScreen />
      </StrictMode>,
    );
    expect(await screen.findAllByLabelText(TEXT_LABEL)).toHaveLength(PAGE_COUNT);
    expect(screen.getAllByLabelText(DESC_LABEL)).toHaveLength(PAGE_COUNT);
    expect(usage() - before).toBe(1);
    expect(current_book().pages).toHaveLength(PAGE_COUNT + 1);
  });

  it('쪽이 이미 있으면 다시 그려도 호출하지 않고 쪽 글을 지킨다', async () => {
    prepare_store();
    const first = render(<PagesScreen />);
    await screen.findAllByLabelText(TEXT_LABEL);
    const before = usage();
    const kept_text = current_book().pages[1]?.text;
    first.unmount();
    render(<PagesScreen />);
    expect(screen.getAllByLabelText(TEXT_LABEL)).toHaveLength(PAGE_COUNT);
    expect(usage() - before).toBe(0);
    expect(current_book().pages[1]?.text).toBe(kept_text);
  });

  it('글을 고치면 book.pages의 글이 바뀐다', async () => {
    prepare_store();
    render(<PagesScreen />);
    const inputs = await screen.findAllByLabelText(TEXT_LABEL);
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '새로 쓴 글' } });
    expect(current_book().pages[2]?.text).toBe('새로 쓴 글');
    const descs = screen.getAllByLabelText(DESC_LABEL);
    fireEvent.change(descs[0] as HTMLElement, { target: { value: '새 그림 설명' } });
    expect(current_book().pages[1]?.image_prompt).toBe('새 그림 설명');
  });

  it('직접 쓰기 상태에서는 호출 없이 빈 칸이 쪽수만큼 보인다', () => {
    prepare_store({ write_mode: 'self' });
    const before = usage();
    render(<PagesScreen />);
    const inputs = screen.getAllByLabelText(TEXT_LABEL);
    expect(inputs).toHaveLength(PAGE_COUNT);
    inputs.forEach((input) => expect(input).toHaveValue(''));
    expect(screen.getByText(ko('pages.self_hint'))).toBeInTheDocument();
    expect(usage() - before).toBe(0);
  });

  it('한도 초과 오류가 나면 쉬운 안내가 보인다', async () => {
    window.history.pushState({}, '', '/?mockfail=quota');
    prepare_store();
    render(<PagesScreen />);
    expect(await screen.findByText(/오늘 쓸 수 있는 횟수를 다 썼어요/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ko('plot.self') })).toBeInTheDocument();
  });

  it('"다시 나눠 달라고 하기"를 누르면 호출이 1회 더 늘고 글이 새 글로 바뀐다', async () => {
    prepare_store();
    render(<PagesScreen />);
    const inputs = await screen.findAllByLabelText(TEXT_LABEL);
    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '고친 글' } });
    const before = usage();
    fireEvent.click(screen.getByRole('button', { name: ko('pages.rewrite') }));
    expect(usage() - before).toBe(1);
    await waitFor(() => expect(screen.getAllByLabelText(TEXT_LABEL)[0]).not.toHaveValue('고친 글'));
  });
});

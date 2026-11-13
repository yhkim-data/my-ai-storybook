// 3단계 줄거리 화면 검사: 자동 제안 1회, 저장된 줄거리 재사용, 고르기와 고치기, 직접 쓰기, 연결 없음, 실패와 다시 하기.
import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get_sample_plots } from '../data/sample_story';
import { translate } from '../i18n';
import { reset_mock_failures } from '../providers/mock_failure';
import { create_book } from '../store/book_model';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import type { Book } from '../types';
import { PlotScreen } from './PlotScreen';

const ko = (key: string) => translate('ko', key);
/** 줄거리 카드를 찾는 이름 (줄거리 1: ...) */
const CARD_NAME = /^줄거리 \d/;
const PLOT_COUNT = 3;

/** 책과 설정을 준비한다. practice가 false면 연결이 없는 상태다. */
function prepare_store(patch: Partial<Book> = {}, practice = true): void {
  useSettings.setState({ lang: 'ko', practice, text_key: '' });
  useBook.setState({ book: { ...create_book('ko'), ...patch }, screen: 'plot' });
}

/** 지금까지 센 연결부 호출 횟수 */
const usage = () => useSettings.getState().usage_count;

/** 지금 책을 읽는다. */
function current_book(): Book {
  const book = useBook.getState().book;
  if (!book) throw new Error('책이 없어요');
  return book;
}

describe('PlotScreen', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    reset_mock_failures();
  });
  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
    reset_mock_failures();
  });

  it('연습 모드로 들어오면 줄거리 3개가 보이고 호출은 정확히 1회다 (StrictMode 포함)', async () => {
    prepare_store();
    const before = usage();
    render(
      <StrictMode>
        <PlotScreen />
      </StrictMode>,
    );
    expect(await screen.findAllByRole('button', { name: CARD_NAME })).toHaveLength(PLOT_COUNT);
    expect(usage() - before).toBe(1);
    expect(current_book().plots).toHaveLength(PLOT_COUNT);
  });

  it('이미 줄거리가 있는 책으로 다시 그리면 호출하지 않는다', () => {
    prepare_store({ plots: get_sample_plots('ko', '토리'), plots_key: 'saved' });
    const before = usage();
    render(<PlotScreen />);
    expect(screen.getAllByRole('button', { name: CARD_NAME })).toHaveLength(PLOT_COUNT);
    expect(usage() - before).toBe(0);
  });

  it('카드를 누르면 제목 칸에 값이 들어가고 고치면 chosen_plot.title이 바뀐다', async () => {
    prepare_store({ plots: get_sample_plots('ko', '토리'), plots_key: 'saved' });
    const user = userEvent.setup();
    render(<PlotScreen />);
    const first = get_sample_plots('ko', '토리')[0];
    await user.click(screen.getAllByRole('button', { name: CARD_NAME })[0] as HTMLElement);
    const title_input = screen.getByLabelText(ko('plot.title_label'));
    expect(title_input).toHaveValue(first?.title);
    fireEvent.change(title_input, { target: { value: '내가 바꾼 제목' } });
    expect(current_book().chosen_plot?.title).toBe('내가 바꾼 제목');
    expect(current_book().chosen_plot?.id).toBe(first?.id);
  });

  it('"내가 직접 쓸게요"를 누르면 호출 없이 빈 칸이 보인다', async () => {
    prepare_store({ plots: get_sample_plots('ko', '토리'), plots_key: 'saved' });
    const user = userEvent.setup();
    render(<PlotScreen />);
    const before = usage();
    await user.click(screen.getByRole('button', { name: ko('plot.self') }));
    expect(usage() - before).toBe(0);
    expect(current_book().write_mode).toBe('self');
    expect(screen.getByLabelText(ko('plot.title_label'))).toHaveValue('');
    expect(screen.getByText(ko('plot.self_hint'))).toBeInTheDocument();
  });

  it('연결이 없으면 직접 쓰기 안내가 보이고 호출은 0회다', () => {
    prepare_store({}, false);
    const before = usage();
    render(<PlotScreen />);
    expect(screen.getByText(ko('plot.no_ai'))).toBeInTheDocument();
    expect(screen.getByLabelText(ko('plot.title_label'))).toBeInTheDocument();
    expect(usage() - before).toBe(0);
  });

  it('제목 없이 다음을 누르면 안내가 뜨고 화면이 그대로다', async () => {
    prepare_store({ write_mode: 'self' });
    const user = userEvent.setup();
    render(<PlotScreen />);
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(screen.getByRole('alert')).toHaveTextContent(ko('plot.need_title'));
    expect(useBook.getState().screen).toBe('plot');
  });

  it('직접 쓴 제목이 있으면 쪽 나누기 화면으로 간다', async () => {
    prepare_store({ write_mode: 'self' });
    const user = userEvent.setup();
    render(<PlotScreen />);
    fireEvent.change(screen.getByLabelText(ko('plot.title_label')), { target: { value: '나의 책' } });
    expect(current_book().chosen_plot?.id).toBe('self');
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(useBook.getState().screen).toBe('pages');
  });

  it('차단 오류가 나면 안내가 뜨고, 다시 하기를 누르면 줄거리 3개가 보인다', async () => {
    // 가짜 연결부는 주소 꼬리표로 처음 한 번만 실패를 흉내 낸다.
    window.history.pushState({}, '', '/?mockfail=blocked');
    prepare_store();
    const user = userEvent.setup();
    render(<PlotScreen />);
    expect(await screen.findByText(ko('error.blocked'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ko('error.retry') }));
    expect(await screen.findAllByRole('button', { name: CARD_NAME })).toHaveLength(PLOT_COUNT);
    expect(screen.queryByText(ko('error.blocked'))).not.toBeInTheDocument();
  });
});

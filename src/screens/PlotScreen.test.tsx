// Step 3 plot screen tests.
import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
/** Matches the Korean plot card labels ("Plot 1: ..."). */
const CARD_NAME = /^줄거리 \d/;
const PLOT_COUNT = 3;

/** practice = false means no connection. */
function prepare_store(patch: Partial<Book> = {}, practice = true): void {
  useSettings.setState({ lang: 'ko', practice, text_key: '' });
  useBook.setState({ book: { ...create_book('ko'), ...patch }, screen: 'plot' });
}

const usage = () => useSettings.getState().usage_count;

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

  it('practice mode shows 3 plots with exactly one call, even under StrictMode', async () => {
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

  it('does not call when the book already has plots', () => {
    prepare_store({ plots: get_sample_plots('ko', '토리'), plots_key: 'saved' });
    const before = usage();
    render(<PlotScreen />);
    expect(screen.getAllByRole('button', { name: CARD_NAME })).toHaveLength(PLOT_COUNT);
    expect(usage() - before).toBe(0);
  });

  it('clicking a card fills the title and editing it updates chosen_plot.title', async () => {
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

  it('"write it myself" shows empty fields without a call', async () => {
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

  it('without a connection shows the self-writing hint and makes no call', () => {
    prepare_store({}, false);
    const before = usage();
    render(<PlotScreen />);
    expect(screen.getByText(ko('plot.no_ai'))).toBeInTheDocument();
    expect(screen.getByLabelText(ko('plot.title_label'))).toBeInTheDocument();
    expect(usage() - before).toBe(0);
  });

  it('next without a title shows a notice and stays on the screen', async () => {
    prepare_store({ write_mode: 'self' });
    const user = userEvent.setup();
    render(<PlotScreen />);
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(screen.getByRole('alert')).toHaveTextContent(ko('plot.need_title'));
    expect(useBook.getState().screen).toBe('plot');
  });

  it('goes to the page split screen with a self-written title', async () => {
    prepare_store({ write_mode: 'self' });
    const user = userEvent.setup();
    render(<PlotScreen />);
    fireEvent.change(screen.getByLabelText(ko('plot.title_label')), { target: { value: '나의 책' } });
    expect(current_book().chosen_plot?.id).toBe('self');
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(useBook.getState().screen).toBe('pages');
  });

  it('a blocked error shows a notice, and retry shows 3 plots', async () => {
    // The mock provider fails only the first call when the URL has this query flag.
    window.history.pushState({}, '', '/?mockfail=blocked');
    prepare_store();
    const user = userEvent.setup();
    render(<PlotScreen />);
    expect(await screen.findByText(ko('error.blocked'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ko('error.retry') }));
    expect(await screen.findAllByRole('button', { name: CARD_NAME })).toHaveLength(PLOT_COUNT);
    expect(screen.queryByText(ko('error.blocked'))).not.toBeInTheDocument();
  });

  it('"Ask AI for help" writes the title and the summary together, and undo restores both', async () => {
    prepare_store({ write_mode: 'self' });
    render(<PlotScreen />);
    fireEvent.change(screen.getByLabelText(ko('plot.title_label')), { target: { value: '내 제목' } });
    fireEvent.click(screen.getByRole('button', { name: ko('assist.button') }));
    await waitFor(() => expect(current_book().chosen_plot?.title).not.toBe('내 제목'));
    expect(current_book().chosen_plot?.summary.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: ko('assist.undo') }));
    expect(current_book().chosen_plot?.title).toBe('내 제목');
    expect(current_book().chosen_plot?.summary).toBe('');
  });
});

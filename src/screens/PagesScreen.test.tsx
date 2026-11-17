// Step 4 page split screen tests.
import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const PAGE_COUNT: PageCount = 4;
/** Matches the Korean per-page labels ("page 1 text", "page 2 text", ...). */
const TEXT_LABEL = /쪽 글$/;
const DESC_LABEL = /쪽 그림 설명$/;

/** Prepares a book with a chosen plot. */
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

/** Buttons in the page list on the left. */
function list_items(): HTMLElement[] {
  return within(screen.getByRole('navigation', { name: ko('pages.list') })).getAllByRole('button');
}

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

  it('practice mode creates one field per page with a single call, even under StrictMode', async () => {
    prepare_store();
    const before = usage();
    render(
      <StrictMode>
        <PagesScreen />
      </StrictMode>,
    );
    expect(await screen.findByLabelText(ko('pages.text_label').replace('{n}', '1'))).toBeInTheDocument();
    expect(list_items()).toHaveLength(PAGE_COUNT);
    expect(screen.getAllByLabelText(TEXT_LABEL)).toHaveLength(1);
    expect(screen.getAllByLabelText(DESC_LABEL)).toHaveLength(1);
    expect(usage() - before).toBe(1);
    expect(current_book().pages).toHaveLength(PAGE_COUNT + 1);
  });

  it('does not call again on re-render when pages exist and keeps their text', async () => {
    prepare_store();
    const first = render(<PagesScreen />);
    await screen.findAllByLabelText(TEXT_LABEL);
    const before = usage();
    const kept_text = current_book().pages[1]?.text;
    first.unmount();
    render(<PagesScreen />);
    expect(list_items()).toHaveLength(PAGE_COUNT);
    expect(usage() - before).toBe(0);
    expect(current_book().pages[1]?.text).toBe(kept_text);
  });

  it('editing updates the text of the page chosen in the list', async () => {
    prepare_store();
    render(<PagesScreen />);
    await screen.findAllByLabelText(TEXT_LABEL);
    fireEvent.change(screen.getByLabelText(DESC_LABEL), { target: { value: '새 그림 설명' } });
    expect(current_book().pages[1]?.image_prompt).toBe('새 그림 설명');
    fireEvent.click(list_items()[1] as HTMLElement);
    expect(list_items()[1]).toHaveAttribute('aria-current', 'true');
    fireEvent.change(screen.getByLabelText(TEXT_LABEL), { target: { value: '새로 쓴 글' } });
    expect(current_book().pages[2]?.text).toBe('새로 쓴 글');
  });

  it('previous and next page buttons move through the pages and stop at the ends', async () => {
    prepare_store();
    render(<PagesScreen />);
    await screen.findAllByLabelText(TEXT_LABEL);
    const prev = screen.getByRole('button', { name: ko('pages.prev_page') });
    const next = screen.getByRole('button', { name: ko('pages.next_page') });
    expect(prev).toBeDisabled();
    for (let step = 1; step < PAGE_COUNT; step += 1) fireEvent.click(next);
    expect(screen.getByLabelText(TEXT_LABEL)).toHaveAttribute('id', `page-text-${PAGE_COUNT}`);
    expect(next).toBeDisabled();
    fireEvent.click(prev);
    expect(screen.getByLabelText(TEXT_LABEL)).toHaveAttribute('id', `page-text-${PAGE_COUNT - 1}`);
  });

  it('the words and the picture note inputs have the same rows, so they are the same height', async () => {
    prepare_store();
    render(<PagesScreen />);
    const text = (await screen.findAllByLabelText(TEXT_LABEL))[0] as HTMLTextAreaElement;
    const desc = screen.getByLabelText(DESC_LABEL) as HTMLTextAreaElement;
    expect(text.rows).toBe(desc.rows);
    expect(text.parentElement).toBe(desc.parentElement);
  });

  it('self-writing mode shows one empty field per page without a call', () => {
    prepare_store({ write_mode: 'self' });
    const before = usage();
    render(<PagesScreen />);
    expect(list_items()).toHaveLength(PAGE_COUNT);
    // No page has words yet, so no list item is marked as filled.
    expect(screen.queryByText(ko('pages.filled'))).not.toBeInTheDocument();
    expect(screen.getByLabelText(TEXT_LABEL)).toHaveValue('');
    expect(screen.getByText(ko('pages.self_hint'))).toBeInTheDocument();
    expect(usage() - before).toBe(0);
  });

  it('shows a friendly notice on a quota error', async () => {
    window.history.pushState({}, '', '/?mockfail=quota');
    prepare_store();
    render(<PagesScreen />);
    expect(await screen.findByText(/오늘 쓸 수 있는 횟수를 다 썼어요/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ko('plot.self') })).toBeInTheDocument();
  });

  it('"split again" makes one more call and replaces the text', async () => {
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

// Finish screen tests: viewer, AI notice, author, downloads, demo.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import { export_image_zip, export_pdf } from '../export/export_book';
import { translate } from '../i18n';
import { download_blob } from '../storage/book_file';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import type { Book } from '../types';
import { FinishScreen } from './FinishScreen';

vi.mock('../export/export_book', () => ({
  export_pdf: vi.fn(),
  export_image_zip: vi.fn(),
}));
vi.mock('../storage/book_file', async (orig) => ({
  ...(await orig<typeof import('../storage/book_file')>()),
  download_blob: vi.fn(),
}));

const t = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);
/** Demo book pages: cover + 8 story pages + credits. */
const TOTAL_PAGES = 10;
const PROGRESS_DONE = 3;

function setup(book: Book, is_demo = false) {
  useSettings.setState({ lang: 'ko' });
  useBook.setState({ book, is_demo, screen: 'finish' });
  return render(<FinishScreen />);
}

function click_next(times: number) {
  for (let i = 0; i < times; i += 1) fireEvent.click(screen.getByRole('button', { name: t('finish.next_page') }));
}

describe('FinishScreen', () => {
  beforeEach(() => {
    vi.mocked(export_pdf).mockReset();
    vi.mocked(export_image_zip).mockReset();
    vi.mocked(download_blob).mockReset();
  });
  afterEach(() => cleanup());

  it('viewer starts at 1 / 10 and ends on the credits page', () => {
    setup(build_demo_book('ko'));
    expect(screen.getByText(`1 / ${TOTAL_PAGES}`)).toBeInTheDocument();
    click_next(TOTAL_PAGES - 1);
    expect(screen.getByText(`${TOTAL_PAGES} / ${TOTAL_PAGES}`)).toBeInTheDocument();
    expect(screen.getByText(t('credits.heading'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('finish.next_page') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('finish.prev_page') })).toBeEnabled();
  });

  it('arrow keys turn pages', () => {
    setup(build_demo_book('ko'));
    const viewer = screen.getByRole('region', { name: t('finish.viewer_aria') });
    fireEvent.keyDown(viewer, { key: 'ArrowRight' });
    expect(screen.getByText(`2 / ${TOTAL_PAGES}`)).toBeInTheDocument();
    fireEvent.keyDown(viewer, { key: 'ArrowLeft' });
    expect(screen.getByText(`1 / ${TOTAL_PAGES}`)).toBeInTheDocument();
  });

  it('AI notice is hidden with only uploaded images and shown when an AI image exists', () => {
    const book = build_demo_book('ko');
    const { unmount } = setup(book);
    click_next(TOTAL_PAGES - 1);
    expect(screen.queryByTestId('ai-notice')).toBeNull();
    unmount();

    const pages = book.pages.map((page, index) =>
      index === 1 && page.image
        ? { ...page, image: { data_url: page.image.data_url, source: 'ai' as const, model_name: 'mock-image' } }
        : page,
    );
    setup({ ...book, pages });
    click_next(TOTAL_PAGES - 1);
    expect(screen.getByTestId('ai-notice')).toHaveTextContent(t('credits.ai_notice', { name: t('credits.practice_name') }));
  });

  it('book pages contain neither DI Lab nor the app name', () => {
    setup(build_demo_book('ko'));
    for (let i = 0; i < TOTAL_PAGES; i += 1) {
      const text = document.querySelector('.book-page')?.textContent ?? '';
      expect(text).not.toContain('DI Lab');
      expect(text).not.toContain(t('app.name'));
      if (i < TOTAL_PAGES - 1) click_next(1);
    }
  });

  it('author updates the book and appears on the credits page; the demo has no author field', () => {
    const { unmount } = setup(build_demo_book('ko'));
    fireEvent.change(screen.getByLabelText(t('finish.author_label')), { target: { value: '토리' } });
    expect(useBook.getState().book?.author).toBe('토리');
    click_next(TOTAL_PAGES - 1);
    expect(screen.getByText(t('credits.author', { author: '토리' }))).toBeInTheDocument();
    unmount();
    setup(build_demo_book('ko'), true);
    expect(screen.queryByLabelText(t('finish.author_label'))).toBeNull();
  });

  it('PDF download: name ends in .pdf and the done notice shows', async () => {
    vi.mocked(export_pdf).mockResolvedValue(new Blob(['x']));
    setup(build_demo_book('ko'));
    fireEvent.click(screen.getByTestId('download-pdf'));
    expect(await screen.findByText(t('finish.done'))).toBeInTheDocument();
    expect(vi.mocked(export_pdf).mock.calls[0]?.[1]).toBe(false);
    expect(vi.mocked(download_blob).mock.calls[0]?.[1]).toMatch(/\.pdf$/);
  });

  it('print PDF uses print=true and the image bundle gets a zip name', async () => {
    vi.mocked(export_pdf).mockResolvedValue(new Blob(['x']));
    vi.mocked(export_image_zip).mockResolvedValue(new Blob(['x']));
    setup(build_demo_book('ko'));
    fireEvent.click(screen.getByTestId('download-print'));
    await waitFor(() => expect(download_blob).toHaveBeenCalledTimes(1));
    expect(vi.mocked(export_pdf).mock.calls[0]?.[1]).toBe(true);
    expect(vi.mocked(download_blob).mock.calls[0]?.[1]).toMatch(/-print\.pdf$/);
    fireEvent.click(screen.getByTestId('download-zip'));
    await waitFor(() => expect(download_blob).toHaveBeenCalledTimes(2));
    expect(vi.mocked(download_blob).mock.calls[1]?.[1]).toMatch(/-pages\.zip$/);
  });

  it('disables buttons and shows progress while exporting', async () => {
    let finish: (blob: Blob) => void = () => undefined;
    vi.mocked(export_pdf).mockImplementation((_book, _print, on_progress) => {
      on_progress?.(PROGRESS_DONE, TOTAL_PAGES);
      return new Promise<Blob>((resolve) => {
        finish = resolve;
      });
    });
    setup(build_demo_book('ko'));
    fireEvent.click(screen.getByTestId('download-pdf'));
    expect(screen.getByTestId('download-zip')).toBeDisabled();
    expect(await screen.findByText(t('finish.working', { n: PROGRESS_DONE, total: TOTAL_PAGES }))).toBeInTheDocument();
    await act(async () => finish(new Blob(['x'])));
    expect(screen.getByTestId('download-zip')).toBeEnabled();
  });

  it('shows an error when export fails', async () => {
    vi.mocked(export_pdf).mockRejectedValue(new Error('fail'));
    setup(build_demo_book('ko'));
    fireEvent.click(screen.getByTestId('download-pdf'));
    expect(await screen.findByRole('alert')).toHaveTextContent(t('finish.error'));
    expect(download_blob).not.toHaveBeenCalled();
  });

  it('downloads the project file as .storybook.json', async () => {
    setup(build_demo_book('ko'));
    fireEvent.click(screen.getByTestId('download-file'));
    expect(await screen.findByText(t('finish.done'))).toBeInTheDocument();
    expect(vi.mocked(download_blob).mock.calls[0]?.[1]).toMatch(/\.storybook\.json$/);
  });

  it('demo shows a notice and its start button returns to the start screen', async () => {
    setup(build_demo_book('ko'), true);
    const notice = screen.getByText(t('finish.demo_badge')).closest('.notice') as HTMLElement;
    fireEvent.click(within(notice).getByRole('button', { name: t('finish.demo_start') }));
    await waitFor(() => expect(useBook.getState().screen).toBe('start'));
  });
});

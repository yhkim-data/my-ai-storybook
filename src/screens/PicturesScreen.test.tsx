// Step 6 pictures screen tests: AI image, upload, copy, make all, errors and retry.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import * as make_image from '../providers/make_image';
import { ProviderError } from '../providers/types';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import type { Book } from '../types';
import { PicturesScreen } from './PicturesScreen';

// jsdom cannot decode images, so upload resizing is stubbed.
vi.mock('../utils/image', async (orig) => ({
  ...(await orig<typeof import('../utils/image')>()),
  prepare_upload_image: vi.fn(async () => 'data:image/png;base64,AAAA'),
}));
// Wrap image generation so tests can inject failures; it behaves normally otherwise.
vi.mock('../providers/make_image', async (orig) => {
  const original = await orig<typeof import('../providers/make_image')>();
  return { ...original, generate_page_image: vi.fn(original.generate_page_image) };
});

const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);

/** Story pages in the demo book. */
const STORY_PAGES = 8;
/** Max wait in ms for the retry button to enable. */
const RETRY_WAIT_MS = 4000;
/** Pages that already have images; "make all" must skip them. */
const EXISTING_INDEXES = [2, 5];

function make_empty_book(): Book {
  const book = build_demo_book('ko');
  return { ...book, pages: book.pages.map((page) => ({ ...page, image: null })) };
}

function image_indexes(): number[] {
  const pages = useBook.getState().book?.pages ?? [];
  return pages.flatMap((page, index) => (page.image ? [index] : []));
}

beforeEach(() => {
  localStorage.clear();
  useSettings.setState({ lang: 'ko', practice: true, text_key: '', image_key: '', usage_count: 0 });
  useBook.setState({ book: make_empty_book(), is_demo: false, screen: 'pictures', current_page: 0 });
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(async () => undefined) },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.mocked(make_image.generate_page_image).mockClear();
});

describe('PicturesScreen', () => {
  it('page list has the cover and 8 pages and marks the current page', async () => {
    const user = userEvent.setup();
    render(<PicturesScreen />);
    const list = screen.getByRole('navigation', { name: ko('pictures.list') });
    expect(within(list).getAllByRole('button').filter((button) => button.className.includes('pic-item'))).toHaveLength(STORY_PAGES + 1);
    expect(within(list).getByRole('button', { name: new RegExp(ko('common.cover')) })).toHaveAttribute('aria-current', 'true');
    await user.click(within(list).getByRole('button', { name: new RegExp(`^${ko('common.page_n', { n: 3 })}`) }));
    expect(useBook.getState().current_page).toBe(3);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(ko('common.page_n', { n: 3 }));
  });

  it('in practice mode, AI image fills only that page and adds 1 to usage', async () => {
    const user = userEvent.setup();
    useBook.getState().set_current_page(2);
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.ai.title')) }));
    await waitFor(() => expect(useBook.getState().book?.pages[2]?.image?.source).toBe('ai'));
    expect(image_indexes()).toEqual([2]);
    expect(useSettings.getState().usage_count).toBe(1);
    expect(make_image.generate_page_image).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('img', { name: ko('pictures.image_alt', { name: ko('common.page_n', { n: 2 }) }) })).toBeInTheDocument();
  });

  it('without a connection shows a notice and does not call the AI', async () => {
    const user = userEvent.setup();
    useSettings.setState({ practice: false, text_key: '', image_key: '' });
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.ai.title')) }));
    expect(screen.getByText(ko('pictures.need_connect'))).toBeInTheDocument();
    expect(make_image.generate_page_image).not.toHaveBeenCalled();
    expect(useSettings.getState().usage_count).toBe(0);
    await user.click(screen.getByRole('button', { name: ko('pictures.connect_link') }));
    expect(useBook.getState().screen).toBe('connect');
  });

  it('an uploaded image is stored with source upload', async () => {
    render(<PicturesScreen />);
    const input = screen.getByTestId('upload-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    await waitFor(() => expect(useBook.getState().book?.pages[0]?.image?.source).toBe('upload'));
    expect(useBook.getState().book?.pages[0]?.image?.data_url).toBe('data:image/png;base64,AAAA');
  });

  it('copy prompt includes the hero card and the style sentence', async () => {
    const user = userEvent.setup();
    // userEvent.setup() replaces the clipboard, so the test clipboard is attached afterwards.
    const write_text = vi.fn(async (_text: string) => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write_text }, configurable: true });
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.copy.title')) }));
    expect(write_text).toHaveBeenCalledTimes(1);
    const copied = String(write_text.mock.calls[0]?.[0]);
    const book = useBook.getState().book;
    expect(copied).toContain(book?.seed.hero_name ?? '?');
    expect(copied).toContain('수채화');
    expect(await screen.findByText(ko('pictures.copied'))).toBeInTheDocument();
  });

  it('shows text for manual copying when the clipboard fails', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) },
      configurable: true,
    });
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.copy.title')) }));
    expect(await screen.findByText(ko('pictures.copy_manual'))).toBeInTheDocument();
    expect((screen.getByTestId('copy-fallback') as HTMLTextAreaElement).value).toContain('수채화');
  });

  it('make all generates each missing image exactly once', async () => {
    const user = userEvent.setup();
    const book = make_empty_book();
    const existing_url = 'data:image/png;base64,BBBB';
    useBook.setState({
      book: {
        ...book,
        pages: book.pages.map((page, index) =>
          EXISTING_INDEXES.includes(index) ? { ...page, image: { data_url: existing_url, source: 'upload' as const } } : page,
        ),
      },
    });
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: ko('pictures.make_all') }));
    await waitFor(() => expect(image_indexes()).toHaveLength(STORY_PAGES + 1), { timeout: RETRY_WAIT_MS });
    const missing_count = STORY_PAGES + 1 - EXISTING_INDEXES.length;
    expect(make_image.generate_page_image).toHaveBeenCalledTimes(missing_count);
    expect(useSettings.getState().usage_count).toBe(missing_count);
    for (const index of EXISTING_INDEXES) {
      expect(useBook.getState().book?.pages[index]?.image?.data_url).toBe(existing_url);
    }
    expect(await screen.findByRole('button', { name: ko('pictures.make_all') })).toBeEnabled();
  });

  it('on a rate limit shows a notice, and retry after the wait makes the image', async () => {
    const user = userEvent.setup();
    vi.mocked(make_image.generate_page_image).mockRejectedValueOnce(new ProviderError('rate', Date.now() + 1000));
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.ai.title')) }));
    expect(await screen.findByText(/조금 뒤에 다시 해 볼게요/)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: new RegExp(ko('error.retry')) });
    await waitFor(() => expect(retry).toBeEnabled(), { timeout: RETRY_WAIT_MS });
    await user.click(retry);
    await waitFor(() => expect(useBook.getState().book?.pages[0]?.image?.source).toBe('ai'));
  });

  it('shows a friendly notice when blocked', async () => {
    const user = userEvent.setup();
    vi.mocked(make_image.generate_page_image).mockRejectedValueOnce(new ProviderError('blocked'));
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.ai.title')) }));
    expect(await screen.findByText(ko('error.blocked'))).toBeInTheDocument();
    expect(image_indexes()).toEqual([]);
  });

  it('changing page clears notices and errors', async () => {
    const user = userEvent.setup();
    useSettings.setState({ practice: false });
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.ai.title')) }));
    expect(screen.getByText(ko('pictures.need_connect'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: new RegExp(`^${ko('common.page_n', { n: 1 })}`) }));
    expect(screen.queryByText(ko('pictures.need_connect'))).not.toBeInTheDocument();
  });

  it('editing the image description updates the book', async () => {
    const user = userEvent.setup();
    render(<PicturesScreen />);
    const box = screen.getByLabelText(ko('pictures.desc_label'));
    await user.clear(box);
    await user.type(box, '새 설명');
    expect(useBook.getState().book?.pages[0]?.image_prompt).toBe('새 설명');
  });
});

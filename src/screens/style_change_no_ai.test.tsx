// With a real AI connected, changing a page's art style or the book's art style sends no AI request:
// the picture stays and the user decides when to redraw. The style list says so in a short note.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { EditorScreen } from './EditorScreen';
import { PicturesScreen } from './PicturesScreen';
import { StyleScreen } from './StyleScreen';

const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);
const FAKE_KEY = 'test-key-0000';

let fetch_mock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.scrollTo = vi.fn();
  fetch_mock = vi.fn(async () => new Response('{}', { status: 500 }));
  vi.stubGlobal('fetch', fetch_mock);
  useSettings.setState({ lang: 'ko', practice: false, text_key: FAKE_KEY, image_key: '', usage_count: 0 });
  const book = build_demo_book('ko');
  // Demo pictures count as AI pictures drawn in the book's style.
  const pages = book.pages.map((page) => (page.image ? { ...page, image: { ...page.image, source: 'ai' as const, style_key: book.style_id } } : page));
  useBook.setState({ book: { ...book, pages }, is_demo: false, screen: 'pictures', current_page: 1, undo_stack: [], redo_stack: [], last_change_key: null });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Opens the page style list and picks a style by its name. */
function pick_page_style(name: string): void {
  fireEvent.click(document.querySelector<HTMLButtonElement>('.style-menu-button')!);
  const list = screen.getByRole('group', { name: ko('style.page.label') });
  expect(within(list).getByText(ko('style.page.note_ai'))).toBeInTheDocument();
  fireEvent.click(within(list).getByRole('button', { name }));
}

describe('changing the art style with AI connected', () => {
  it('pictures screen: a page style change keeps the picture and makes no AI request', async () => {
    render(<PicturesScreen />);
    const before = useBook.getState().book!.pages[1]!.image;
    pick_page_style(ko('style.name.crayon'));
    await Promise.resolve();
    expect(useBook.getState().book!.pages[1]!.style).toBe('crayon');
    expect(useBook.getState().book!.pages[1]!.image).toBe(before);
    expect(screen.getByRole('button', { name: new RegExp(ko('pictures.redo_style')) })).toBeInTheDocument();
    expect(fetch_mock).not.toHaveBeenCalled();
    expect(useSettings.getState().usage_count).toBe(0);
  });

  it('editor: a page style change makes no AI request', async () => {
    useBook.setState({ screen: 'editor' });
    render(<EditorScreen />);
    fireEvent.click(screen.getByRole('tab', { name: ko('editor.tab.image') }));
    pick_page_style(ko('style.name.pixel'));
    await Promise.resolve();
    expect(useBook.getState().book!.pages[1]!.style).toBe('pixel');
    expect(fetch_mock).not.toHaveBeenCalled();
  });

  it('style screen: a book style change makes no AI request', () => {
    useBook.setState({ screen: 'style' });
    render(<StyleScreen />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(ko('style.name.clay')) }));
    expect(useBook.getState().book!.style_id).toBe('clay');
    expect(fetch_mock).not.toHaveBeenCalled();
    expect(useSettings.getState().usage_count).toBe(0);
  });

  it('practice mode shows the practice note instead', () => {
    useSettings.setState({ practice: true, text_key: '' });
    render(<PicturesScreen />);
    fireEvent.click(document.querySelector<HTMLButtonElement>('.style-menu-button')!);
    expect(screen.getByText(ko('style.page.note_practice'))).toBeInTheDocument();
    expect(screen.queryByText(ko('style.page.note_ai'))).not.toBeInTheDocument();
  });
});

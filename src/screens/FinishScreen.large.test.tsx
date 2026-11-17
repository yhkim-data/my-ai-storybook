// A work file past the size limit asks first; "only pictures in use" leaves the fixed versions out.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import * as book_file from '../storage/book_file';
import { useBook } from '../store/book_store';
import { add_fixed_version } from '../store/image_versions';
import { useSettings } from '../store/settings_store';
import type { Book } from '../types';
import { FinishScreen } from './FinishScreen';

// Any real book counts as "large" here, so the choice shows without building an 80 MB file.
vi.mock('../constants', async (orig) => ({ ...(await orig<typeof import('../constants')>()), WORK_FILE_LARGE_BYTES: 10 }));
vi.mock('../storage/book_file', async (orig) => ({ ...(await orig<typeof import('../storage/book_file')>()), download_blob: vi.fn() }));

const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);

function book_with_fix(): Book {
  const book = build_demo_book('ko');
  const page = add_fixed_version(book.pages[1]!, { data_url: 'data:image/png;base64,RklY', source: 'ai', edit_note: 'fix', created_at: 1 });
  return { ...book, pages: book.pages.map((item, index) => (index === 1 ? page : item)) };
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  useSettings.setState({ lang: 'ko' });
  useBook.setState({ book: book_with_fix(), is_demo: false, screen: 'finish' });
});
afterEach(() => {
  cleanup();
  vi.mocked(book_file.download_blob).mockClear();
});

describe('large work file', () => {
  it('asks first, and "only pictures in use" downloads a file without the fixed versions', async () => {
    render(<FinishScreen />);
    fireEvent.click(screen.getByTestId('download-file'));
    expect(book_file.download_blob).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: ko('finish.file_in_use') }));
    expect(book_file.download_blob).toHaveBeenCalledTimes(1);
    const blob = vi.mocked(book_file.download_blob).mock.calls[0]![0];
    const saved = book_file.parse_book_file(await blob.text());
    expect(saved.pages[1]!.image_versions).toBeUndefined();
    expect(saved.pages[1]!.image?.edit_note).toBe('fix');
  });

  it('"put in everything" keeps the versions', async () => {
    render(<FinishScreen />);
    fireEvent.click(screen.getByTestId('download-file'));
    fireEvent.click(screen.getByRole('button', { name: ko('finish.file_all') }));
    const blob = vi.mocked(book_file.download_blob).mock.calls[0]![0];
    expect(book_file.parse_book_file(await blob.text()).pages[1]!.image_versions).toHaveLength(2);
  });
});

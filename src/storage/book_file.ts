// Save and load the work file (.storybook.json), images included.
import { BOOK_FILE_EXTENSION, LAYOUT_IDS, STEP_SCREENS } from '../constants';
import { get_book_title, normalize_book } from '../store/book_model';
import type { Book, BookPage } from '../types';
import { is_safe_image_url } from '../utils/image';

/** Characters not allowed in file names (whitespace too). */
const UNSAFE_FILE_CHARS = /[\\/:*?"<>|\s]+/g;
const FALLBACK_FILE_NAME = 'storybook';
const FILE_NAME_MAX_LENGTH = 40;
/** Larger files are refused before they are read. */
export const WORK_FILE_MAX_BYTES = 300 * 1024 * 1024;

export function serialize_book(book: Book): string {
  return JSON.stringify(book);
}

function is_book_page(value: unknown): value is BookPage {
  if (typeof value !== 'object' || value === null) return false;
  const page = value as Partial<BookPage>;
  return (
    typeof page.id === 'string' &&
    (page.kind === 'cover' || page.kind === 'story') &&
    typeof page.text === 'string' &&
    typeof page.image_prompt === 'string' &&
    typeof page.layout === 'string' &&
    LAYOUT_IDS.includes(page.layout) &&
    typeof page.text_box === 'object' &&
    page.text_box !== null &&
    (page.image === null || (typeof page.image === 'object' && is_safe_image_url(page.image.data_url))) &&
    (page.image_versions === undefined ||
      // Broken entries are dropped later by normalize_book; an entry with an unsafe address refuses the file.
      (Array.isArray(page.image_versions) &&
        page.image_versions.every((version) => typeof version?.data_url !== 'string' || is_safe_image_url(version.data_url))))
  );
}

/** Parses a work file; throws if it is too big, is not a storybook file, or holds a picture that is not an inline image. */
export function parse_book_file(raw: string): Book {
  if (raw.length > WORK_FILE_MAX_BYTES) throw new Error('file too big');
  const data = JSON.parse(raw) as Partial<Book>;
  const is_valid =
    data.format_version === 1 &&
    typeof data.id === 'string' &&
    (data.lang === 'ko' || data.lang === 'en') &&
    typeof data.seed === 'object' &&
    data.seed !== null &&
    Array.isArray(data.pages) &&
    data.pages.every(is_book_page) &&
    typeof data.step === 'string' &&
    STEP_SCREENS.includes(data.step);
  if (!is_valid) throw new Error('not a storybook file');
  return normalize_book(data as Book);
}

/** File name stem derived from the book title. */
export function book_file_stem(book: Book): string {
  const stem = get_book_title(book).replace(UNSAFE_FILE_CHARS, '_').slice(0, FILE_NAME_MAX_LENGTH);
  return stem.replace(/^_+|_+$/g, '') || FALLBACK_FILE_NAME;
}

export function book_file_name(book: Book): string {
  return `${book_file_stem(book)}${BOOK_FILE_EXTENSION}`;
}

/** Triggers a browser download of blob. */
export function download_blob(blob: Blob, file_name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file_name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  const REVOKE_DELAY_MS = 10000;
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

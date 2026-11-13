// 작업 파일(.storybook.json) 내보내기와 불러오기. 그림까지 한 파일에 담는다.
import { BOOK_FILE_EXTENSION, LAYOUT_IDS, STEP_SCREENS } from '../constants';
import { get_book_title } from '../store/book_model';
import type { Book, BookPage } from '../types';

/** 파일 이름에 쓰지 못하는 글자 */
const UNSAFE_FILE_CHARS = /[\\/:*?"<>|\s]+/g;
/** 제목이 없을 때 쓰는 파일 이름 */
const FALLBACK_FILE_NAME = 'storybook';
const FILE_NAME_MAX_LENGTH = 40;

/**
 * 책을 작업 파일 글로 바꾼다.
 */
export function serialize_book(book: Book): string {
  return JSON.stringify(book);
}

/**
 * 값이 쪽 모양인지 본다.
 */
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
    (page.image === null || (typeof page.image === 'object' && typeof page.image.data_url === 'string'))
  );
}

/**
 * 작업 파일 글을 책으로 읽는다. 이 도구의 파일이 아니면 오류를 던진다.
 */
export function parse_book_file(raw: string): Book {
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
  return data as Book;
}

/**
 * 책 제목으로 파일 이름의 앞부분을 만든다.
 */
export function book_file_stem(book: Book): string {
  const stem = get_book_title(book).replace(UNSAFE_FILE_CHARS, '_').slice(0, FILE_NAME_MAX_LENGTH);
  return stem.replace(/^_+|_+$/g, '') || FALLBACK_FILE_NAME;
}

/**
 * 작업 파일 이름을 만든다.
 */
export function book_file_name(book: Book): string {
  return `${book_file_stem(book)}${BOOK_FILE_EXTENSION}`;
}

/**
 * Blob을 파일로 내려받게 한다.
 */
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

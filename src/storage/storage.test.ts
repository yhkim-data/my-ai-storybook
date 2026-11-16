import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BOOK_FILE_EXTENSION } from '../constants';
import { build_demo_book } from '../data/demo_book';
import { useBook } from '../store/book_store';
import type { Book } from '../types';
import { flush_autosave, start_autosave } from './autosave';
import { book_file_name, book_file_stem, parse_book_file, serialize_book } from './book_file';
import { delete_current_book, load_current_book, save_current_book } from './db';

/** Characters that must not appear in file names. */
const UNSAFE_CHARS = /[\\/:*?"<>|\s]/;

describe('work file', () => {
  it('serialize_book -> parse_book_file round-trips the same book (including image data URLs)', () => {
    const book = build_demo_book('ko');
    expect(book.pages[1]?.image?.data_url.startsWith('data:image/')).toBe(true);
    const restored = parse_book_file(serialize_book(book));
    expect(restored).toEqual(book);
    expect(restored.pages[1]?.image?.data_url).toBe(book.pages[1]?.image?.data_url);
  });

  it('round-trips an English book', () => {
    const book = build_demo_book('en');
    expect(parse_book_file(serialize_book(book))).toEqual(book);
  });

  it('rejects unrelated JSON', () => {
    expect(() => parse_book_file('{"hello":1}')).toThrow();
    expect(() => parse_book_file('not json')).toThrow();
    expect(() => parse_book_file('[]')).toThrow();
  });

  it('rejects a different format version', () => {
    const book = { ...build_demo_book('ko'), format_version: 2 };
    expect(() => parse_book_file(JSON.stringify(book))).toThrow();
  });

  it('rejects broken pages', () => {
    const book = build_demo_book('ko');
    expect(() => parse_book_file(JSON.stringify({ ...book, pages: 'x' }))).toThrow();
    expect(() => parse_book_file(JSON.stringify({ ...book, pages: [{}] }))).toThrow();
    expect(() => parse_book_file(JSON.stringify({ ...book, pages: [{ ...book.pages[0], layout: 'nope' }] }))).toThrow();
    const { pages: _removed, ...without_pages } = book;
    expect(() => parse_book_file(JSON.stringify(without_pages))).toThrow();
  });

  it('book_file_name ends with .storybook.json and has no unsafe characters', () => {
    const book = build_demo_book('ko');
    const dirty: Book = { ...book, pages: [{ ...book.pages[0]!, text: 'a/b:c*d?e"f<g>h|i \\ j' }, ...book.pages.slice(1)] };
    const name = book_file_name(dirty);
    expect(name.endsWith(BOOK_FILE_EXTENSION)).toBe(true);
    expect(UNSAFE_CHARS.test(name)).toBe(false);
    expect(book_file_name(book).endsWith(BOOK_FILE_EXTENSION)).toBe(true);
  });

  it('falls back to storybook without a title', () => {
    const book = { ...build_demo_book('ko'), chosen_plot: null, pages: [] };
    expect(book_file_stem(book)).toBe('storybook');
    expect(book_file_name(book)).toBe(`storybook${BOOK_FILE_EXTENSION}`);
  });
});

describe('IndexedDB storage', () => {
  beforeEach(async () => {
    await delete_current_book();
  });

  it('save then load returns the same book; delete gives null', async () => {
    expect(await load_current_book()).toBeNull();
    const book = build_demo_book('ko');
    await save_current_book(book);
    expect(await load_current_book()).toEqual(book);
    await delete_current_book();
    expect(await load_current_book()).toBeNull();
  });

  it('saving again replaces the book', async () => {
    await save_current_book(build_demo_book('ko'));
    const english = build_demo_book('en');
    await save_current_book(english);
    expect(await load_current_book()).toEqual(english);
  });
});

describe('autosave', () => {
  beforeAll(() => {
    start_autosave();
  });
  beforeEach(async () => {
    await flush_autosave();
    await delete_current_book();
  });

  it('after a change, flush_autosave stores that book', async () => {
    const book = build_demo_book('ko');
    useBook.setState({ book, is_demo: false });
    await flush_autosave();
    expect(await load_current_book()).toEqual(book);
    expect(useBook.getState().has_saved_book).toBe(true);
  });

  it('does not save the demo book (is_demo)', async () => {
    useBook.setState({ book: build_demo_book('en'), is_demo: true });
    await flush_autosave();
    expect(await load_current_book()).toBeNull();
  });
});

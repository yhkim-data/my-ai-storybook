// 저장 검사: 작업 파일 왕복, 잘못된 파일, 파일 이름, IndexedDB 저장·읽기·지우기, 자동 저장.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BOOK_FILE_EXTENSION } from '../constants';
import { build_demo_book } from '../data/demo_book';
import { useBook } from '../store/book_store';
import type { Book } from '../types';
import { flush_autosave, start_autosave } from './autosave';
import { book_file_name, book_file_stem, parse_book_file, serialize_book } from './book_file';
import { delete_current_book, load_current_book, save_current_book } from './db';

/** 파일 이름에 있으면 안 되는 글자 */
const UNSAFE_CHARS = /[\\/:*?"<>|\s]/;

describe('작업 파일', () => {
  it('serialize_book → parse_book_file 왕복이 같은 책이다 (그림 data URL 포함)', () => {
    const book = build_demo_book('ko');
    expect(book.pages[1]?.image?.data_url.startsWith('data:image/')).toBe(true);
    const restored = parse_book_file(serialize_book(book));
    expect(restored).toEqual(book);
    expect(restored.pages[1]?.image?.data_url).toBe(book.pages[1]?.image?.data_url);
  });

  it('영어 책도 왕복한다', () => {
    const book = build_demo_book('en');
    expect(parse_book_file(serialize_book(book))).toEqual(book);
  });

  it('엉뚱한 JSON은 오류다', () => {
    expect(() => parse_book_file('{"hello":1}')).toThrow();
    expect(() => parse_book_file('not json')).toThrow();
    expect(() => parse_book_file('[]')).toThrow();
  });

  it('버전이 다르면 오류다', () => {
    const book = { ...build_demo_book('ko'), format_version: 2 };
    expect(() => parse_book_file(JSON.stringify(book))).toThrow();
  });

  it('pages가 깨지면 오류다', () => {
    const book = build_demo_book('ko');
    expect(() => parse_book_file(JSON.stringify({ ...book, pages: 'x' }))).toThrow();
    expect(() => parse_book_file(JSON.stringify({ ...book, pages: [{}] }))).toThrow();
    expect(() => parse_book_file(JSON.stringify({ ...book, pages: [{ ...book.pages[0], layout: 'nope' }] }))).toThrow();
    const { pages: _removed, ...without_pages } = book;
    expect(() => parse_book_file(JSON.stringify(without_pages))).toThrow();
  });

  it('book_file_name이 .storybook.json으로 끝나고 못 쓰는 글자가 없다', () => {
    const book = build_demo_book('ko');
    const dirty: Book = { ...book, pages: [{ ...book.pages[0]!, text: 'a/b:c*d?e"f<g>h|i \\ j' }, ...book.pages.slice(1)] };
    const name = book_file_name(dirty);
    expect(name.endsWith(BOOK_FILE_EXTENSION)).toBe(true);
    expect(UNSAFE_CHARS.test(name)).toBe(false);
    expect(book_file_name(book).endsWith(BOOK_FILE_EXTENSION)).toBe(true);
  });

  it('제목이 없으면 storybook이다', () => {
    const book = { ...build_demo_book('ko'), chosen_plot: null, pages: [] };
    expect(book_file_stem(book)).toBe('storybook');
    expect(book_file_name(book)).toBe(`storybook${BOOK_FILE_EXTENSION}`);
  });
});

describe('IndexedDB 저장', () => {
  beforeEach(async () => {
    await delete_current_book();
  });

  it('저장 → 읽기가 같은 책이고 지우면 null이다', async () => {
    expect(await load_current_book()).toBeNull();
    const book = build_demo_book('ko');
    await save_current_book(book);
    expect(await load_current_book()).toEqual(book);
    await delete_current_book();
    expect(await load_current_book()).toBeNull();
  });

  it('다시 저장하면 새 책으로 바뀐다', async () => {
    await save_current_book(build_demo_book('ko'));
    const english = build_demo_book('en');
    await save_current_book(english);
    expect(await load_current_book()).toEqual(english);
  });
});

describe('자동 저장', () => {
  beforeAll(() => {
    start_autosave();
  });
  beforeEach(async () => {
    await flush_autosave();
    await delete_current_book();
  });

  it('책이 바뀌면 flush_autosave 뒤 저장된 책이 그 책이다', async () => {
    const book = build_demo_book('ko');
    useBook.setState({ book, is_demo: false });
    await flush_autosave();
    expect(await load_current_book()).toEqual(book);
    expect(useBook.getState().has_saved_book).toBe(true);
  });

  it('체험판(is_demo)은 저장하지 않는다', async () => {
    useBook.setState({ book: build_demo_book('en'), is_demo: true });
    await flush_autosave();
    expect(await load_current_book()).toBeNull();
  });
});

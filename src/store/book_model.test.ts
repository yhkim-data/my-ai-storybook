// Book data helpers: page count limits and filling in older saved books.
import { describe, expect, it } from 'vitest';
import { CUSTOM_STYLE_MAX_LENGTH, DEFAULT_PAGE_COUNT, PAGE_COUNT_MAX, PAGE_COUNT_MIN } from '../constants';
import { build_demo_book } from '../data/demo_book';
import { parse_book_file, serialize_book } from '../storage/book_file';
import type { Book } from '../types';
import { clamp_page_count, clean_custom_style, normalize_book } from './book_model';

describe('clamp_page_count', () => {
  it('keeps counts in range and rounds them', () => {
    expect(clamp_page_count(12)).toBe(12);
    expect(clamp_page_count(5.4)).toBe(5);
    expect(clamp_page_count(0)).toBe(PAGE_COUNT_MIN);
    expect(clamp_page_count(-3)).toBe(PAGE_COUNT_MIN);
    expect(clamp_page_count(99)).toBe(PAGE_COUNT_MAX);
  });

  it('anything that is not a number becomes the default', () => {
    expect(clamp_page_count('12')).toBe(DEFAULT_PAGE_COUNT);
    expect(clamp_page_count(Number.NaN)).toBe(DEFAULT_PAGE_COUNT);
    expect(clamp_page_count(undefined)).toBe(DEFAULT_PAGE_COUNT);
  });
});

describe('normalize_book', () => {
  it('leaves a current book unchanged', () => {
    const book = build_demo_book('ko');
    expect(normalize_book(book)).toEqual(book);
  });

  it('fixes an out-of-range page count when a work file is loaded', () => {
    const book = build_demo_book('ko');
    const broken = { ...book, seed: { ...book.seed, page_count: 50 } };
    expect(parse_book_file(serialize_book(broken)).seed.page_count).toBe(PAGE_COUNT_MAX);
    const too_small = { ...book, seed: { ...book.seed, page_count: 1 } } as Book;
    expect(normalize_book(too_small).seed.page_count).toBe(PAGE_COUNT_MIN);
  });
});

describe('style fields', () => {
  it('an older book without custom_style opens with an empty description', () => {
    const { custom_style: _removed, ...older } = build_demo_book('ko');
    const opened = parse_book_file(JSON.stringify(older));
    expect(opened.custom_style).toBe('');
    expect(opened.style_id).toBe('watercolor');
  });

  it('an unknown style becomes the default, and descriptions are cleaned', () => {
    const book = build_demo_book('ko');
    const odd = { ...book, style_id: 'oil' as unknown as Book['style_id'], custom_style: `a\nb${'x'.repeat(300)}` };
    const opened = normalize_book(odd);
    expect(opened.style_id).toBe('watercolor');
    expect(opened.custom_style.startsWith('a b')).toBe(true);
    expect(opened.custom_style).toHaveLength(CUSTOM_STYLE_MAX_LENGTH);
  });

  it('clean_custom_style keeps one line', () => {
    expect(clean_custom_style('따뜻한\r\n  파스텔')).toBe('따뜻한 파스텔');
    expect(clean_custom_style(3)).toBe('');
  });
});

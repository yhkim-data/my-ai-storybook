// Book data helpers: page count limits and filling in older saved books.
import { describe, expect, it } from 'vitest';
import { CUSTOM_STYLE_MAX_LENGTH, DEFAULT_PAGE_COUNT, LAYOUT_IMAGE_RECT, LAYOUT_TEXT_RECT, PAGE_COUNT_MAX, PAGE_COUNT_MIN } from '../constants';
import { build_demo_book } from '../data/demo_book';
import { parse_book_file, serialize_book } from '../storage/book_file';
import type { Book } from '../types';
import {
  apply_layout,
  clamp_page_count,
  clean_custom_style,
  effective_style,
  make_story_page,
  normalize_book,
  page_aspect,
  reshape_pages,
  style_key,
} from './book_model';

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

describe('page styles', () => {
  it('a page style is kept through save and load; a broken one is dropped', () => {
    const book = build_demo_book('ko');
    const styled = {
      ...book,
      pages: book.pages.map((page, index) =>
        index === 1 ? { ...page, style: 'custom' as const, custom_style: '수묵화\n느낌' } : index === 2 ? { ...page, style: 'oil' as unknown as 'clay' } : page,
      ),
    };
    const opened = parse_book_file(serialize_book(styled));
    expect(opened.pages[1]?.style).toBe('custom');
    expect(opened.pages[1]?.custom_style).toBe('수묵화 느낌');
    expect(opened.pages[2]?.style).toBeUndefined();
    expect(opened.pages[3]?.style).toBeUndefined();
  });

  it('effective_style uses the page style first, then the book style', () => {
    const book = { ...build_demo_book('ko'), style_id: 'crayon' as const };
    expect(effective_style(book, book.pages[1])).toEqual({ style_id: 'crayon', custom_style: '' });
    expect(effective_style(book, { ...book.pages[1]!, style: 'pixel' })).toEqual({ style_id: 'pixel', custom_style: '' });
    expect(style_key({ style_id: 'custom', custom_style: ' 파스텔 ' })).toBe('custom:파스텔');
  });
});

describe('picture boxes', () => {
  it('an older book without picture boxes gets them from its layouts, text in front, proportions kept', () => {
    const book = build_demo_book('ko');
    const older = {
      ...book,
      pages: book.pages.map((page, index) => {
        const { image_box: _box, front: _front, image_lock: _lock, ...rest } = page;
        return index === 2 ? { ...rest, layout: 'image_left' as const } : rest;
      }),
    };
    expect(older.format_version).toBe(1);
    const opened = parse_book_file(JSON.stringify(older));
    expect(opened.pages[0]?.image_box).toEqual(LAYOUT_IMAGE_RECT.full);
    expect(opened.pages[1]?.image_box).toEqual(LAYOUT_IMAGE_RECT.image_top);
    expect(opened.pages[2]?.image_box).toEqual(LAYOUT_IMAGE_RECT.image_left);
    for (const page of opened.pages) {
      expect(page.front).toBe('text');
      expect(page.image_lock).toBe(true);
    }
  });

  it('a moved picture, its order and the proportions setting survive save and load', () => {
    const book = build_demo_book('ko');
    const moved = {
      ...book,
      pages: book.pages.map((page, index) => (index === 1 ? { ...page, image_box: { x: 12, y: 8, w: 33, h: 44 }, front: 'image' as const, image_lock: false } : page)),
    };
    const opened = parse_book_file(serialize_book(moved));
    expect(opened.pages[1]?.image_box).toEqual({ x: 12, y: 8, w: 33, h: 44 });
    expect(opened.pages[1]?.front).toBe('image');
    expect(opened.pages[1]?.image_lock).toBe(false);
  });

  it('a layout places both boxes at once', () => {
    const page = { ...make_story_page('글'), image_box: { x: 1, y: 2, w: 30, h: 30 } };
    const placed = apply_layout(page, 'text_left');
    expect(placed.image_box).toEqual(LAYOUT_IMAGE_RECT.text_left);
    expect(placed.text_box).toMatchObject(LAYOUT_TEXT_RECT.text_left);
  });
});

describe('book shape', () => {
  it('older books open as square; the shape survives save and load', () => {
    const { page_shape: _shape, ...older } = build_demo_book('ko');
    expect(parse_book_file(JSON.stringify(older)).page_shape).toBe('square');
    const tall = { ...build_demo_book('ko'), page_shape: 'portrait' as const };
    expect(parse_book_file(serialize_book(tall)).page_shape).toBe('portrait');
    expect(normalize_book({ ...tall, page_shape: 'round' as unknown as 'square' }).page_shape).toBe('square');
  });

  it('a picture that keeps its shape gets a new height so it looks the same on the new page', () => {
    const page = { ...make_story_page(), image_box: { x: 10, y: 10, w: 60, h: 40 } };
    const [tall] = reshape_pages([page], 'square', 'portrait');
    const on_screen = (box: { w: number; h: number }, shape: 'square' | 'portrait') => box.w / (box.h * page_aspect(shape));
    expect(on_screen(tall!.image_box, 'portrait')).toBeCloseTo(on_screen(page.image_box, 'square'));
    expect(tall!.image_box.w).toBe(60);
  });

  it('a picture filling the page, a free picture, and text boxes keep their percent boxes', () => {
    const full = { ...make_story_page(), image_box: { x: 0, y: 0, w: 100, h: 100 } };
    const free = { ...make_story_page(), image_box: { x: 10, y: 10, w: 60, h: 40 }, image_lock: false };
    const [full_after, free_after] = reshape_pages([full, free], 'square', 'landscape');
    expect(full_after!.image_box).toEqual(full.image_box);
    expect(free_after!.image_box).toEqual(free.image_box);
    expect(free_after!.text_box).toEqual(free.text_box);
  });

  it('a picture that would grow past the page shrinks and stays on the page', () => {
    const page = { ...make_story_page(), image_box: { x: 5, y: 20, w: 90, h: 80 } };
    const [wide] = reshape_pages([page], 'portrait', 'landscape');
    const box = wide!.image_box;
    expect(box.y + box.h).toBeLessThanOrEqual(100 + 1e-9);
    expect(box.x + box.w).toBeLessThanOrEqual(100 + 1e-9);
    expect(box.w / (box.h * page_aspect('landscape'))).toBeCloseTo(90 / (80 * page_aspect('portrait')));
  });
});

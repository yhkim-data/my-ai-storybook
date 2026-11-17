// Work file import refuses pictures that are not inline images of an allowed type, also inside picture versions.
import { describe, expect, it } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import type { Book } from '../types';
import { is_safe_image_url } from '../utils/image';
import { parse_book_file, serialize_book } from './book_file';

function with_picture(data_url: string, in_versions = false): string {
  const book: Book = build_demo_book('ko');
  const image = { data_url, source: 'upload' as const };
  book.pages[1] = in_versions ? { ...book.pages[1]!, image_versions: [book.pages[1]!.image!, image], active_version: 0 } : { ...book.pages[1]!, image };
  return serialize_book(book);
}

describe('work file pictures', () => {
  it('accepts png, jpeg, webp, gif and svg data URLs', () => {
    for (const type of ['png', 'jpeg', 'webp', 'gif', 'svg+xml']) {
      expect(is_safe_image_url(`data:image/${type};base64,QUJD`)).toBe(true);
      expect(() => parse_book_file(with_picture(`data:image/${type};base64,QUJD`))).not.toThrow();
    }
  });

  it('refuses web addresses, scripts and other types, in the picture and in its versions', () => {
    for (const url of ['https://example.com/a.png', 'javascript:alert(1)', 'data:text/html;base64,PGI+', 'blob:https://x/y']) {
      expect(is_safe_image_url(url)).toBe(false);
      expect(() => parse_book_file(with_picture(url))).toThrow();
      expect(() => parse_book_file(with_picture(url, true))).toThrow();
    }
  });
});

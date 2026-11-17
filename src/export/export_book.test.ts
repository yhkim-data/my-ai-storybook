// Exported pages belong to the author: no DI Lab mark or name may be drawn into them.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toCanvas } from 'html-to-image';
import { build_demo_book } from '../data/demo_book';
import { serialize_book } from '../storage/book_file';
import type { Book } from '../types';
import { export_image_zip } from './export_book';

vi.mock('html-to-image', () => ({ toCanvas: vi.fn() }));

/** Traces of the DI Lab mark or name that must not appear in a book. */
const BRAND_TRACES = [/dilab/i, /di_lab/i, /DI Lab/, /Data Insight Lab/];

/** Demo book without images, so the off-screen render does not wait for image loading in jsdom. */
function book_without_images(): Book {
  const book = build_demo_book('ko');
  return { ...book, author: '토리 작가', pages: book.pages.map((page) => ({ ...page, image: null })) };
}

describe('exports carry no DI Lab mark', () => {
  const rendered: string[] = [];

  beforeEach(() => {
    rendered.length = 0;
    vi.mocked(toCanvas).mockImplementation(async (node: HTMLElement) => {
      rendered.push(node.outerHTML);
      return { toBlob: (done: (blob: Blob) => void) => done(new Blob([new Uint8Array([1])])) } as unknown as HTMLCanvasElement;
    });
    // A plain object, not a Response: jsdom's Blob cannot go into Node's Response on every Node version.
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob([new Uint8Array([0])]) })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('every rendered page (cover, story, credits) is free of the mark', async () => {
    const book = book_without_images();
    await export_image_zip(book);
    expect(rendered).toHaveLength(book.pages.length + 1);
    for (const html of rendered) {
      for (const trace of BRAND_TRACES) expect(html).not.toMatch(trace);
    }
  });

  it('the work file is free of the mark', () => {
    const text = serialize_book(book_without_images());
    for (const trace of BRAND_TRACES) expect(text).not.toMatch(trace);
  });
});

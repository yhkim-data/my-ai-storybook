// Picture versions: adding fixed pictures, the six-picture limit, switching, starting over, undo and the work file.
import { beforeEach, describe, expect, it } from 'vitest';
import { IMAGE_VERSIONS_MAX } from '../constants';
import { build_demo_book } from '../data/demo_book';
import { parse_book_file, serialize_book } from '../storage/book_file';
import type { BookPage, PageImage } from '../types';
import { useBook } from './book_store';
import {
  active_index,
  add_fixed_version,
  before_newest_index,
  is_versions_full,
  newest_fixed_index,
  use_version,
  versions_of,
  with_new_image,
  without_unused_versions,
} from './image_versions';

const ORIGINAL: PageImage = { data_url: 'data:image/png;base64,T1JJ', source: 'ai', model_name: 'm', created_at: 100 };

/** A fixed picture made from `base`. */
function fixed(n: number, base: PageImage = ORIGINAL): PageImage {
  return { data_url: `data:image/png;base64,Rk${n}`, source: 'ai', model_name: 'm', edit_note: `fix ${n}`, created_at: 100 + n, based_on: base.created_at };
}

function page_with_original(): BookPage {
  return { ...build_demo_book('ko').pages[1]!, image: ORIGINAL };
}

describe('picture versions', () => {
  it('the first fix keeps the original as version 0 and puts the fixed picture in use', () => {
    const page = add_fixed_version(page_with_original(), fixed(1));
    expect(page.image_versions?.map((version) => version.data_url)).toEqual([ORIGINAL.data_url, fixed(1).data_url]);
    expect(page.active_version).toBe(1);
    expect(page.image).toEqual(fixed(1));
    expect(newest_fixed_index(page)).toBe(1);
  });

  it('keeps at most six pictures: the original stays and the oldest fixed picture goes', () => {
    let page = page_with_original();
    for (let n = 1; n <= IMAGE_VERSIONS_MAX - 1; n += 1) page = add_fixed_version(page, fixed(n));
    expect(versions_of(page)).toHaveLength(IMAGE_VERSIONS_MAX);
    expect(is_versions_full(page)).toBe(true);
    page = add_fixed_version(page, fixed(IMAGE_VERSIONS_MAX));
    const notes = versions_of(page).map((version) => version.edit_note ?? 'original');
    expect(notes).toEqual(['original', 'fix 2', 'fix 3', 'fix 4', 'fix 5', 'fix 6']);
    expect(page.image?.edit_note).toBe('fix 6');
  });

  it('the switch goes between the newest fix and the picture it was made from', () => {
    let page = add_fixed_version(page_with_original(), fixed(1));
    page = add_fixed_version(page, fixed(2, fixed(1)));
    expect(before_newest_index(page)).toBe(1);
    page = use_version(page, before_newest_index(page));
    expect(page.image?.edit_note).toBe('fix 1');
    expect(active_index(page)).toBe(1);
    // A fix made from the original goes back to the original.
    page = add_fixed_version(use_version(page, 0), fixed(3));
    expect(before_newest_index(page)).toBe(0);
  });

  it('a new picture (drawn again or uploaded) starts the list over', () => {
    const page = with_new_image(add_fixed_version(page_with_original(), fixed(1)), { data_url: 'data:image/png;base64,TkVX', source: 'upload' });
    expect(page.image_versions).toBeUndefined();
    expect(page.active_version).toBeUndefined();
    expect(versions_of(page)).toHaveLength(1);
  });
});

describe('versions in the book', () => {
  beforeEach(() => {
    const book = build_demo_book('ko');
    book.pages[1] = page_with_original();
    useBook.setState({ book, undo_stack: [], redo_stack: [], last_change_key: null, current_page: 1 });
  });

  it('undo brings back the earlier list after a fix, a switch and a new picture', () => {
    const { edit_pages, undo } = useBook.getState();
    const on_page = (mutate: (page: BookPage) => BookPage) => edit_pages((pages) => pages.map((page, index) => (index === 1 ? mutate(page) : page)));
    on_page((page) => add_fixed_version(page, fixed(1)));
    on_page((page) => use_version(page, 0));
    on_page((page) => with_new_image(page, { data_url: 'data:image/png;base64,TkVX', source: 'ai' }));
    const now = () => useBook.getState().book!.pages[1]!;
    expect(now().image_versions).toBeUndefined();
    undo();
    expect(now().image_versions).toHaveLength(2);
    expect(now().image).toEqual(ORIGINAL);
    undo();
    expect(now().image).toEqual(fixed(1));
    undo();
    expect(now().image_versions).toBeUndefined();
    expect(now().image).toEqual(ORIGINAL);
  });

  it('the work file keeps every version and which one is in use; "only pictures in use" leaves them out', () => {
    const book = useBook.getState().book!;
    let page = add_fixed_version(book.pages[1]!, fixed(1));
    page = use_version(page, 0);
    const with_versions = { ...book, pages: book.pages.map((item, index) => (index === 1 ? page : item)) };
    const loaded = parse_book_file(serialize_book(with_versions));
    expect(loaded.pages[1]!.image_versions).toHaveLength(2);
    expect(loaded.pages[1]!.active_version).toBe(0);
    expect(loaded.pages[1]!.image).toEqual(ORIGINAL);
    const small = parse_book_file(serialize_book(without_unused_versions(with_versions)));
    expect(small.pages[1]!.image_versions).toBeUndefined();
    expect(small.pages[1]!.image).toEqual(ORIGINAL);
  });

  it('broken versions in a file are dropped and the picture in use stays', () => {
    const book = useBook.getState().book!;
    const broken = { ...book.pages[1]!, image_versions: [{ nope: 1 }] as unknown as PageImage[], active_version: 3 };
    const loaded = parse_book_file(serialize_book({ ...book, pages: book.pages.map((item, index) => (index === 1 ? broken : item)) }));
    expect(loaded.pages[1]!.image_versions).toBeUndefined();
    expect(loaded.pages[1]!.image).toEqual(ORIGINAL);
  });
});

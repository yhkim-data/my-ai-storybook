// Picture versions for "Fix the picture": add a fixed picture, switch between versions, start over with a new picture.
// page.image is always the version in use, so preview, finish and export code only ever read page.image.
import { IMAGE_VERSIONS_MAX } from '../constants';
import type { Book, BookPage, PageImage } from '../types';

/** True for an object that can be a page picture. */
export function is_page_image(value: unknown): value is PageImage {
  if (typeof value !== 'object' || value === null) return false;
  const image = value as Partial<PageImage>;
  return typeof image.data_url === 'string' && (image.source === 'ai' || image.source === 'upload');
}

/** The page's versions; a page never fixed has just its picture (or none). */
export function versions_of(page: BookPage): PageImage[] {
  if (page.image_versions && page.image_versions.length > 0) return page.image_versions;
  return page.image ? [page.image] : [];
}

/** Index of the version in use. */
export function active_index(page: BookPage): number {
  return page.image_versions ? (page.active_version ?? 0) : 0;
}

/** A page whose picture is replaced by a new one (drawn again or uploaded): the version list starts over. */
export function with_new_image(page: BookPage, image: PageImage | null): BookPage {
  const { image_versions: _versions, active_version: _active, ...rest } = page;
  return { ...rest, image };
}

/** True when a new fixed picture would push out the oldest fixed one. */
export function is_versions_full(page: BookPage): boolean {
  return versions_of(page).length >= IMAGE_VERSIONS_MAX;
}

/** Adds a fixed picture and puts it in use. When full, the oldest fixed picture is dropped; the original always stays. */
export function add_fixed_version(page: BookPage, fixed: PageImage): BookPage {
  const current = versions_of(page);
  const kept = current.length >= IMAGE_VERSIONS_MAX ? [...current.slice(0, 1), ...current.slice(2)] : current;
  const list = [...kept, fixed];
  return { ...page, image_versions: list, active_version: list.length - 1, image: fixed };
}

/** Puts version `index` in use. */
export function use_version(page: BookPage, index: number): BookPage {
  const image = page.image_versions?.[index];
  if (!image || index === page.active_version) return page;
  return { ...page, active_version: index, image };
}

/** Index of the newest fixed picture, or null when the picture was never fixed. */
export function newest_fixed_index(page: BookPage): number | null {
  const count = page.image_versions?.length ?? 0;
  return count >= 2 ? count - 1 : null;
}

/** Index of the picture the newest fixed picture was made from; the original when that one is gone. */
export function before_newest_index(page: BookPage): number {
  const list = page.image_versions ?? [];
  const newest = list[list.length - 1];
  if (newest?.based_on === undefined) return 0;
  const found = list.findIndex((version) => version.created_at === newest.based_on);
  return found >= 0 && found < list.length - 1 ? found : 0;
}

/** The same book with only the pictures in use, for a smaller work file. */
export function without_unused_versions(book: Book): Book {
  return { ...book, pages: book.pages.map((page) => with_new_image(page, page.image)) };
}

/**
 * Checks versions read from a saved book: drops them when they do not hold together, keeps at most
 * IMAGE_VERSIONS_MAX (the original and the newest fixed ones), and makes `image` the version in use.
 */
export function normalize_versions(page: BookPage): BookPage {
  const list: unknown = page.image_versions;
  if (list === undefined && page.active_version === undefined) return page;
  if (!Array.isArray(list) || list.length === 0 || !list.every(is_page_image) || !page.image) return with_new_image(page, page.image);
  const kept = list.length > IMAGE_VERSIONS_MAX ? [...list.slice(0, 1), ...list.slice(1 - IMAGE_VERSIONS_MAX)] : list;
  const saved_index = page.active_version;
  const by_picture = kept.findIndex((version) => version.data_url === page.image?.data_url);
  const index =
    typeof saved_index === 'number' && Number.isInteger(saved_index) && kept[saved_index]?.data_url === page.image.data_url
      ? saved_index
      : by_picture >= 0
        ? by_picture
        : kept.length - 1;
  return { ...page, image_versions: kept, active_version: index, image: kept[index] ?? page.image };
}

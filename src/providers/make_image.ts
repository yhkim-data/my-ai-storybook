// Generates one page's image with the AI. Shared by the image screen and the editor's "redo this image".
// A page's own art style, if it has one, is used instead of the book's style.
import { effective_style, style_key } from '../store/book_model';
import { useSettings } from '../store/settings_store';
import type { Book, PageImage, PageShape } from '../types';
import { blob_to_data_url } from '../utils/image';
import { get_image_provider } from './index';
import { build_hero_card, build_image_prompt } from './prompts';

/** Finds the first AI image to use as a reference, skipping the page being generated. */
function find_reference_image(book: Book, page_index: number): string | null {
  const first = book.pages.find((page, index) => index !== page_index && page.image?.source === 'ai');
  return first?.image?.data_url ?? null;
}

/**
 * Generates the image for a page with one AI call. Returns null if no AI is connected;
 * throws ProviderError on failure.
 */
export async function generate_page_image(book: Book, page_index: number): Promise<PageImage | null> {
  const provider = get_image_provider();
  const page = book.pages[page_index];
  if (!provider || !page) return null;
  const style = effective_style(book, page);
  const blob = await provider.generate({
    description: page.image_prompt || page.text,
    style_id: style.style_id,
    custom_style: style.custom_style,
    hero_card: build_hero_card(book.seed, book.lang),
    reference_image: provider.supportsReferenceImage ? find_reference_image(book, page_index) : null,
    page_index,
    lang: book.lang,
    shape: request_shape(book, page_index),
  });
  return { data_url: await blob_to_data_url(blob), source: 'ai', model_name: provider.model_name, style_key: style_key(style) };
}

/** A full-page picture is asked for in the book's shape; other pictures are square. */
export function request_shape(book: Book, page_index: number): PageShape | undefined {
  return book.pages[page_index]?.layout === 'full' ? book.page_shape : undefined;
}

/** True when the page has an AI image made in a different style than the page now uses. */
export function needs_style_redraw(book: Book, page_index: number): boolean {
  const page = book.pages[page_index];
  if (page?.image?.source !== 'ai' || page.image.style_key === undefined) return false;
  return page.image.style_key !== style_key(effective_style(book, page));
}

/** Builds a page's full image prompt for "copy image prompt". */
export function full_image_prompt(book: Book, page_index: number): string {
  const page = book.pages[page_index];
  if (!page) return '';
  const style = effective_style(book, page);
  return build_image_prompt(page.image_prompt || page.text, style.style_id, build_hero_card(book.seed, book.lang), book.lang, style.custom_style);
}

/**
 * Practice mode only: after a page's style changes, gives its practice picture in the new style right away
 * (practice pictures cost nothing). Returns the new image, or null when nothing needs to change.
 */
export async function practice_restyle(book: Book, page_index: number): Promise<PageImage | null> {
  const page = book.pages[page_index];
  const image = page?.image;
  if (!useSettings.getState().practice || !page || !image || !needs_style_redraw(book, page_index)) return null;
  const style = effective_style(book, page);
  // A practice picture in "my own style" is the plain scene whatever the words, so only its label changes.
  if (style.style_id === 'custom' && image.style_key?.startsWith('custom:')) return { ...image, style_key: style_key(style) };
  return generate_page_image(book, page_index);
}

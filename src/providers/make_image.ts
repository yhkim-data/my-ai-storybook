// Generates one page's image with the AI. Shared by the image screen and the editor's "redo this image".
import type { Book, PageImage } from '../types';
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
  const blob = await provider.generate({
    description: page.image_prompt || page.text,
    style_id: book.style_id,
    hero_card: build_hero_card(book.seed, book.lang),
    reference_image: provider.supportsReferenceImage ? find_reference_image(book, page_index) : null,
    page_index,
    lang: book.lang,
  });
  return { data_url: await blob_to_data_url(blob), source: 'ai', model_name: provider.model_name };
}

/** Builds a page's full image prompt for "copy image prompt". */
export function full_image_prompt(book: Book, page_index: number): string {
  const page = book.pages[page_index];
  if (!page) return '';
  return build_image_prompt(page.image_prompt || page.text, book.style_id, build_hero_card(book.seed, book.lang), book.lang);
}

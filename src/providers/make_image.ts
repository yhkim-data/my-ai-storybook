// 쪽 하나의 그림을 AI로 만든다. 그림 화면과 꾸미기 화면의 "이 그림만 다시 만들기"가 함께 쓴다.
import type { Book, PageImage } from '../types';
import { blob_to_data_url } from '../utils/image';
import { get_image_provider } from './index';
import { build_hero_card, build_image_prompt } from './prompts';

/**
 * 참고 그림으로 쓸 첫 AI 그림을 찾는다. 지금 만드는 쪽의 그림은 빼고 찾는다.
 */
function find_reference_image(book: Book, page_index: number): string | null {
  const first = book.pages.find((page, index) => index !== page_index && page.image?.source === 'ai');
  return first?.image?.data_url ?? null;
}

/**
 * 주어진 쪽의 그림을 AI로 만들어 돌려준다. AI가 연결되어 있지 않으면 null이다.
 * 실패하면 ProviderError를 던진다. 호출은 쪽당 한 번이다.
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

/**
 * 쪽의 완성된 그림 설명 글을 만든다. "그림 설명 복사"에서 쓴다.
 */
export function full_image_prompt(book: Book, page_index: number): string {
  const page = book.pages[page_index];
  if (!page) return '';
  return build_image_prompt(page.image_prompt || page.text, book.style_id, build_hero_card(book.seed, book.lang), book.lang);
}

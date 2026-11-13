// 지금 설정에 맞는 AI 연결부를 골라 주는 곳. 연결부를 더하려면 여기에 한 갈래를 더한다.
import { effective_image_key, useSettings } from '../store/settings_store';
import { create_gemini_image } from './gemini_image';
import { create_gemini_text } from './gemini_text';
import { create_mock_image } from './mock_image';
import { create_mock_text } from './mock_text';
import type { ImageProvider, TextProvider } from './types';

/**
 * 호출할 때마다 "오늘 쓴 횟수"를 하나 올린다.
 */
function count_usage(): void {
  useSettings.getState().add_usage();
}

/**
 * 글 연결부의 모든 호출에 횟수 세기를 붙인다.
 */
function with_text_usage(provider: TextProvider): TextProvider {
  return {
    id: provider.id,
    suggestPlots: (seed, lang) => {
      count_usage();
      return provider.suggestPlots(seed, lang);
    },
    splitIntoPages: (plot, seed, lang) => {
      count_usage();
      return provider.splitIntoPages(plot, seed, lang);
    },
    testConnection: () => {
      count_usage();
      return provider.testConnection();
    },
  };
}

/**
 * 그림 연결부의 모든 호출에 횟수 세기를 붙인다.
 */
function with_image_usage(provider: ImageProvider): ImageProvider {
  return {
    id: provider.id,
    model_name: provider.model_name,
    supportsReferenceImage: provider.supportsReferenceImage,
    generate: (req) => {
      count_usage();
      return provider.generate(req);
    },
    testConnection: () => {
      count_usage();
      return provider.testConnection();
    },
  };
}

/**
 * 지금 쓸 글 연결부를 돌려준다. 연결되어 있지 않으면 null이다.
 */
export function get_text_provider(): TextProvider | null {
  const settings = useSettings.getState();
  if (settings.practice) return with_text_usage(create_mock_text());
  if (!settings.text_key) return null;
  return with_text_usage(create_gemini_text(settings.text_key, settings.text_model));
}

/**
 * 지금 쓸 그림 연결부를 돌려준다. 연결되어 있지 않으면 null이다.
 */
export function get_image_provider(): ImageProvider | null {
  const settings = useSettings.getState();
  if (settings.practice) return with_image_usage(create_mock_image());
  const image_key = effective_image_key(settings);
  if (!image_key) return null;
  return with_image_usage(create_gemini_image(image_key, settings.image_model));
}

/**
 * 주어진 키로 연결 확인용 글 연결부를 만든다. "AI 연결하기" 화면에서 쓴다.
 */
export function create_text_provider_for_key(api_key: string): TextProvider {
  const settings = useSettings.getState();
  if (settings.practice) return with_text_usage(create_mock_text());
  return with_text_usage(create_gemini_text(api_key, settings.text_model));
}

export { ProviderError } from './types';
export type { ConnectionResult, ImageProvider, ImageRequest, ProviderErrorKind, TextProvider } from './types';

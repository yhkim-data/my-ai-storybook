// 지금 설정에 맞는 AI 연결부를 골라 주는 곳. 연결부를 더하려면 여기에 한 갈래를 더한다.
import { effective_image_key, useSettings } from '../store/settings_store';
import { create_claude_text } from './claude_text';
import { create_gemini_image } from './gemini_image';
import { create_gemini_text } from './gemini_text';
import { create_mock_image } from './mock_image';
import { create_mock_text } from './mock_text';
import { create_openai_image } from './openai_image';
import { create_openai_text } from './openai_text';
import { detect_provider, resolve_image_model, resolve_text_model } from './provider_kinds';
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
 * 키 모양에 맞는 회사의 글 연결부를 만든다. 저장된 AI 종류가 그 회사 것이 아니면 회사 기본값을 쓴다.
 */
function create_text_for_key(api_key: string, saved_model: string): TextProvider {
  const kind = detect_provider(api_key);
  const model = resolve_text_model(kind, saved_model);
  if (kind === 'claude') return create_claude_text(api_key, model);
  if (kind === 'openai') return create_openai_text(api_key, model);
  return create_gemini_text(api_key, model);
}

/**
 * 키 모양에 맞는 회사의 그림 연결부를 만든다. 그림을 만들지 못하는 회사의 키면 null이다.
 */
function create_image_for_key(api_key: string, saved_model: string): ImageProvider | null {
  const kind = detect_provider(api_key);
  const model = resolve_image_model(kind, saved_model);
  if (model === null) return null;
  if (kind === 'openai') return create_openai_image(api_key, model);
  return create_gemini_image(api_key, model);
}

/**
 * 지금 쓸 글 연결부를 돌려준다. 연결되어 있지 않으면 null이다.
 */
export function get_text_provider(): TextProvider | null {
  const settings = useSettings.getState();
  if (settings.practice) return with_text_usage(create_mock_text());
  if (!settings.text_key) return null;
  return with_text_usage(create_text_for_key(settings.text_key, settings.text_model));
}

/**
 * 지금 쓸 그림 연결부를 돌려준다. 연결되어 있지 않거나 그림을 만들지 못하는 회사의 키면 null이다.
 */
export function get_image_provider(): ImageProvider | null {
  const settings = useSettings.getState();
  if (settings.practice) return with_image_usage(create_mock_image());
  const image_key = effective_image_key(settings);
  if (!image_key) return null;
  const provider = create_image_for_key(image_key, settings.image_model);
  return provider ? with_image_usage(provider) : null;
}

/**
 * 주어진 키로 연결 확인용 글 연결부를 만든다. "AI 연결하기" 화면에서 쓴다.
 */
export function create_text_provider_for_key(api_key: string): TextProvider {
  const settings = useSettings.getState();
  if (settings.practice) return with_text_usage(create_mock_text());
  return with_text_usage(create_text_for_key(api_key, settings.text_model));
}

export { ProviderError } from './types';
export type { ConnectionResult, ImageProvider, ImageRequest, ProviderErrorKind, TextProvider } from './types';

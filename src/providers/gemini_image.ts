// Gemini 그림 연결부. 정사각형 그림 한 장을 받아 Blob으로 돌려준다.
import { base64_to_blob, split_data_url } from '../utils/image';
import { call_interactions, check_api_key } from './gemini_client';
import {
  IMAGE_ASPECT_RATIO,
  IMAGE_MIME_TYPE,
  IMAGE_SIZE,
  REFERENCE_IMAGE_MODELS,
  SAFETY_SETTINGS,
} from './gemini_config';
import { build_image_prompt } from './prompts';
import { ProviderError, type ImageProvider, type ImageRequest } from './types';

/** 참고 그림으로 보낼 수 있는 파일 종류 */
const REFERENCE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
/** 안전 설정 때문에 요청이 거절됐는지 알아보는 낱말 */
const SAFETY_SETTINGS_FIELD = 'safety_settings';

/**
 * 요청 본문의 input 배열을 만든다. 참고 그림은 지원하는 AI에서만 넣는다.
 */
function build_input(req: ImageRequest, use_reference: boolean): object[] {
  const input: object[] = [
    { type: 'text', text: build_image_prompt(req.description, req.style_id, req.hero_card, req.lang) },
  ];
  if (use_reference && req.reference_image) {
    const parts = split_data_url(req.reference_image);
    if (parts && REFERENCE_MIME_TYPES.includes(parts.mime_type)) {
      input.push({ type: 'image', mime_type: parts.mime_type, data: parts.base64 });
    }
  }
  return input;
}

/**
 * 주어진 키와 AI 종류로 Gemini 그림 연결부를 만든다.
 */
export function create_gemini_image(api_key: string, model: string): ImageProvider {
  const supports_reference = REFERENCE_IMAGE_MODELS.includes(model);

  /**
   * 그림 요청을 한 번 보낸다. Api-Revision 머리글은 붙이지 않는다.
   * Google이 브라우저의 사전 확인(CORS)에서 이 머리글을 거절하고, 2026-06-08부터는 서버가 무시하는 값이다.
   */
  const request_image = (req: ImageRequest, with_safety_settings: boolean) =>
    call_interactions(api_key, {
      model,
      input: build_input(req, supports_reference),
      response_format: {
        type: 'image',
        mime_type: IMAGE_MIME_TYPE,
        aspect_ratio: IMAGE_ASPECT_RATIO,
        image_size: IMAGE_SIZE,
      },
      ...(with_safety_settings ? { safety_settings: SAFETY_SETTINGS } : {}),
      store: false,
    });

  return {
    id: 'gemini-image',
    model_name: model,
    supportsReferenceImage: supports_reference,
    generate: async (req: ImageRequest): Promise<Blob> => {
      let blocks;
      try {
        blocks = await request_image(req, true);
      } catch (cause) {
        // 그림 AI가 안전 설정 값을 받지 않는 경우에만, 그 값을 빼고(제공사 기본값) 한 번 다시 보낸다.
        const rejected_field = cause instanceof ProviderError && cause.message.includes(SAFETY_SETTINGS_FIELD);
        if (!rejected_field) throw cause;
        blocks = await request_image(req, false);
      }
      const image_block = blocks.filter((block) => block.type === 'image' && block.data).pop();
      if (!image_block?.data) throw new ProviderError('blocked', null, 'no image');
      return base64_to_blob(image_block.data, image_block.mime_type ?? IMAGE_MIME_TYPE);
    },
    testConnection: () => check_api_key(api_key),
  };
}

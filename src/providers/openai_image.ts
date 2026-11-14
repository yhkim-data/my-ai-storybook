// OpenAI 그림 연결부. 정사각형 그림 한 장을 받아 Blob으로 돌려준다. 참고 그림은 보내지 않는다.
import { base64_to_blob } from '../utils/image';
import { OPENAI_IMAGES_URL, check_openai_key, post_openai } from './openai_client';
import { build_image_prompt } from './prompts';
import { ProviderError, type ImageProvider, type ImageRequest } from './types';

/** 그림 크기, 품질, 파일 종류 */
const IMAGE_SIZE = '1024x1024';
const IMAGE_QUALITY = 'medium';
const IMAGE_FORMAT = 'png';
const IMAGE_MIME_TYPE = 'image/png';
/** 제공사의 안전 검사 세기. auto가 가장 엄격한 기본값이다. */
const MODERATION_LEVEL = 'auto';

/** 그림 응답에서 쓰는 부분 */
interface ImagesBody {
  data?: { b64_json?: string }[];
}

/**
 * 주어진 키와 AI 종류로 OpenAI 그림 연결부를 만든다.
 */
export function create_openai_image(api_key: string, model: string): ImageProvider {
  return {
    id: 'openai-image',
    model_name: model,
    supportsReferenceImage: false,
    generate: async (req: ImageRequest): Promise<Blob> => {
      const body = await post_openai<ImagesBody>(OPENAI_IMAGES_URL, api_key, {
        model,
        prompt: build_image_prompt(req.description, req.style_id, req.hero_card, req.lang),
        size: IMAGE_SIZE,
        quality: IMAGE_QUALITY,
        output_format: IMAGE_FORMAT,
        moderation: MODERATION_LEVEL,
      });
      const base64 = body.data?.[0]?.b64_json;
      if (!base64) throw new ProviderError('blocked', null, 'no image');
      return base64_to_blob(base64, IMAGE_MIME_TYPE);
    },
    testConnection: () => check_openai_key(api_key),
  };
}

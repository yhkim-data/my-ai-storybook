// OpenAI image provider. Returns one square image as a Blob. Reference images are not sent.
import { base64_to_blob } from '../utils/image';
import { OPENAI_IMAGES_URL, check_openai_key, post_openai } from './openai_client';
import { build_image_prompt } from './prompts';
import { ProviderError, type ImageProvider, type ImageRequest } from './types';

const IMAGE_SIZE = '1024x1024';
const IMAGE_QUALITY = 'medium';
const IMAGE_FORMAT = 'png';
const IMAGE_MIME_TYPE = 'image/png';
/** Provider moderation level; 'auto' is the stricter default. */
const MODERATION_LEVEL = 'auto';

interface ImagesBody {
  data?: { b64_json?: string }[];
}

/** Creates an OpenAI image provider for the given key and model. */
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

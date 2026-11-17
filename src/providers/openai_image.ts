// OpenAI image provider. Returns one image as a Blob, square or in the page's shape. Reference images are not sent.
import { base64_to_blob } from '../utils/image';
import { OPENAI_IMAGES_URL, OPENAI_IMAGE_EDITS_URL, check_openai_key, post_openai } from './openai_client';
import { build_edit_prompt, build_image_prompt } from './prompts';
import type { PageShape } from '../types';
import { ProviderError, type ImageEditRequest, type ImageProvider, type ImageRequest } from './types';

/** Picture size for each book shape; a square page, or no shape, gets a square picture. */
const IMAGE_SIZES: Record<PageShape, string> = { square: '1024x1024', portrait: '1024x1536', landscape: '1536x1024' };
const IMAGE_QUALITY = 'medium';
const IMAGE_FORMAT = 'png';
const IMAGE_MIME_TYPE = 'image/png';
/** Provider moderation level; 'auto' is the stricter default. */
const MODERATION_LEVEL = 'auto';

interface ImagesBody {
  data?: { b64_json?: string }[];
}

/** The first picture in a response, or a 'blocked' error when there is none. */
function read_picture(body: ImagesBody): Blob {
  const base64 = body.data?.[0]?.b64_json;
  if (!base64) throw new ProviderError('blocked', null, 'no image');
  return base64_to_blob(base64, IMAGE_MIME_TYPE);
}

/** Creates an OpenAI image provider for the given key and model. */
export function create_openai_image(api_key: string, model: string): ImageProvider {
  return {
    id: 'openai-image',
    model_name: model,
    supportsReferenceImage: false,
    supportsEdit: true,
    generate: async (req: ImageRequest): Promise<Blob> => {
      const body = await post_openai<ImagesBody>(OPENAI_IMAGES_URL, api_key, {
        model,
        prompt: build_image_prompt(req.description, req.style_id, req.hero_card, req.lang, req.custom_style),
        size: IMAGE_SIZES[req.shape ?? 'square'],
        quality: IMAGE_QUALITY,
        output_format: IMAGE_FORMAT,
        moderation: MODERATION_LEVEL,
      });
      return read_picture(body);
    },
    // The edit endpoint takes the picture in use as a base64 data URL in a JSON body (images[].image_url).
    edit: async (req: ImageEditRequest): Promise<Blob> => {
      const body = await post_openai<ImagesBody>(OPENAI_IMAGE_EDITS_URL, api_key, {
        model,
        images: [{ image_url: req.image }],
        prompt: build_edit_prompt(req.note, req.style_id, req.hero_card, req.lang, req.custom_style),
        size: IMAGE_SIZES[req.shape ?? 'square'],
        quality: IMAGE_QUALITY,
        output_format: IMAGE_FORMAT,
      });
      return read_picture(body);
    },
    testConnection: () => check_openai_key(api_key),
  };
}

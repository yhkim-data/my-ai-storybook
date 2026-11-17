// Gemini image provider. Returns one square image as a Blob.
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

/** MIME types accepted as a reference image. */
const REFERENCE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
/** If an error message contains this, the request was rejected because of the safety settings field. */
const SAFETY_SETTINGS_FIELD = 'safety_settings';

/**
 * Builds the request input array. The reference image is included only for models that support it.
 */
function build_input(req: ImageRequest, use_reference: boolean): object[] {
  const input: object[] = [
    { type: 'text', text: build_image_prompt(req.description, req.style_id, req.hero_card, req.lang, req.custom_style) },
  ];
  if (use_reference && req.reference_image) {
    const parts = split_data_url(req.reference_image);
    if (parts && REFERENCE_MIME_TYPES.includes(parts.mime_type)) {
      input.push({ type: 'image', mime_type: parts.mime_type, data: parts.base64 });
    }
  }
  return input;
}

/** Creates a Gemini image provider for the given key and model. */
export function create_gemini_image(api_key: string, model: string): ImageProvider {
  const supports_reference = REFERENCE_IMAGE_MODELS.includes(model);

  /**
   * Sends one image request without the Api-Revision header: Google rejects it in the browser's
   * CORS preflight, and the server has ignored it since 2026-06-08.
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
        // Only if the model rejects the safety settings field, retry once without it (provider defaults).
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

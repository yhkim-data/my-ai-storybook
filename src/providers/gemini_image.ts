// Gemini image provider. Returns one image as a Blob: square, or in the page's shape on models that support it.
import { base64_to_blob, split_data_url } from '../utils/image';
import { call_interactions, check_api_key } from './gemini_client';
import {
  EDIT_IMAGE_MODELS,
  IMAGE_ASPECT_RATIO,
  IMAGE_MIME_TYPE,
  IMAGE_SIZE,
  REFERENCE_IMAGE_MODELS,
  SAFETY_SETTINGS,
  SHAPE_ASPECT_MODELS,
  SHAPE_ASPECT_RATIOS,
} from './gemini_config';
import { build_edit_prompt, build_image_prompt } from './prompts';
import { ProviderError, type ImageEditRequest, type ImageProvider, type ImageRequest } from './types';

/** MIME types accepted as a reference image. */
const REFERENCE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
/** If an error message contains this, the request was rejected because of the safety settings field. */
const SAFETY_SETTINGS_FIELD = 'safety_settings';

/** The picture as an input block, or null when its type cannot be sent. */
function image_block(data_url: string | null): object | null {
  const parts = data_url ? split_data_url(data_url) : null;
  if (!parts || !REFERENCE_MIME_TYPES.includes(parts.mime_type)) return null;
  return { type: 'image', mime_type: parts.mime_type, data: parts.base64 };
}

/** "Fix the picture" input: the instruction, then the picture in use, sent like a reference picture. */
function build_edit_input(req: ImageEditRequest): object[] {
  const picture = image_block(req.image);
  if (!picture) throw new ProviderError('unknown', null, 'picture type cannot be sent');
  return [{ type: 'text', text: build_edit_prompt(req.note, req.style_id, req.hero_card, req.lang, req.custom_style) }, picture];
}

/**
 * Builds the request input array. The reference image is included only for models that support it.
 */
function build_input(req: ImageRequest, use_reference: boolean): object[] {
  const input: object[] = [
    { type: 'text', text: build_image_prompt(req.description, req.style_id, req.hero_card, req.lang, req.custom_style) },
  ];
  const reference = use_reference ? image_block(req.reference_image) : null;
  if (reference) input.push(reference);
  return input;
}

/** Creates a Gemini image provider for the given key and model. */
export function create_gemini_image(api_key: string, model: string): ImageProvider {
  const supports_reference = REFERENCE_IMAGE_MODELS.includes(model);
  const supports_shape = SHAPE_ASPECT_MODELS.includes(model);
  const supports_edit = EDIT_IMAGE_MODELS.includes(model);

  /**
   * Sends one image request without the Api-Revision header: Google rejects it in the browser's
   * CORS preflight, and the server has ignored it since 2026-06-08.
   */
  const request_image = (input: object[], shape: ImageRequest['shape'], with_safety_settings: boolean) =>
    call_interactions(api_key, {
      model,
      input,
      response_format: {
        type: 'image',
        mime_type: IMAGE_MIME_TYPE,
        aspect_ratio: supports_shape && shape ? SHAPE_ASPECT_RATIOS[shape] : IMAGE_ASPECT_RATIO,
        image_size: IMAGE_SIZE,
      },
      ...(with_safety_settings ? { safety_settings: SAFETY_SETTINGS } : {}),
      store: false,
    });

  /** One picture request; if the model rejects the safety settings field, retries once without it (provider defaults). */
  const draw = async (input: object[], shape: ImageRequest['shape']): Promise<Blob> => {
    let blocks;
    try {
      blocks = await request_image(input, shape, true);
    } catch (cause) {
      const rejected_field = cause instanceof ProviderError && cause.message.includes(SAFETY_SETTINGS_FIELD);
      if (!rejected_field) throw cause;
      blocks = await request_image(input, shape, false);
    }
    const picture = blocks.filter((block) => block.type === 'image' && block.data).pop();
    if (!picture?.data) throw new ProviderError('blocked', null, 'no image');
    return base64_to_blob(picture.data, picture.mime_type ?? IMAGE_MIME_TYPE);
  };

  return {
    id: 'gemini-image',
    model_name: model,
    supportsReferenceImage: supports_reference,
    supportsEdit: supports_edit,
    generate: (req: ImageRequest) => draw(build_input(req, supports_reference), req.shape),
    edit: async (req: ImageEditRequest) => {
      if (!supports_edit) throw new ProviderError('unknown', null, 'this model cannot fix pictures');
      return draw(build_edit_input(req), req.shape);
    },
    testConnection: () => check_api_key(api_key),
  };
}

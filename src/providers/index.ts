// Picks the AI provider for the current settings. To add a provider, add a branch here.
import { mark_activity } from '../store/idle';
import { effective_image_key, image_limit_reached, useSettings } from '../store/settings_store';
import { create_claude_text } from './claude_text';
import { create_gemini_image } from './gemini_image';
import { create_gemini_text } from './gemini_text';
import { create_mock_image } from './mock_image';
import { create_mock_text } from './mock_text';
import { create_openai_image } from './openai_image';
import { create_openai_text } from './openai_text';
import { detect_provider, resolve_image_model, resolve_text_model } from './provider_kinds';
import { ProviderError, type ImageProvider, type TextProvider } from './types';

/** Counts one request: a text request, or one picture (a fix counts as a picture). */
function count_usage(kind: 'text' | 'image' = 'text'): void {
  // An AI request counts as using the app, so a long picture batch does not run into the away timer.
  mark_activity();
  useSettings.getState().add_usage(kind);
}

/** Wraps every text provider call so it counts toward usage. */
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
    assist: (req) => {
      count_usage();
      return provider.assist(req);
    },
    testConnection: () => {
      count_usage();
      return provider.testConnection();
    },
  };
}

/** Stops a picture request when today's picture limit on this computer is used up. */
function check_image_limit(): void {
  if (image_limit_reached(useSettings.getState())) throw new ProviderError('limit', null, 'picture limit reached');
}

/** Wraps every image provider call so it counts toward usage and keeps to the picture limit. */
function with_image_usage(provider: ImageProvider): ImageProvider {
  return {
    id: provider.id,
    model_name: provider.model_name,
    supportsReferenceImage: provider.supportsReferenceImage,
    supportsEdit: provider.supportsEdit,
    generate: async (req) => {
      check_image_limit();
      count_usage('image');
      return provider.generate(req);
    },
    edit: async (req) => {
      check_image_limit();
      count_usage('image');
      return provider.edit(req);
    },
    testConnection: () => {
      count_usage();
      return provider.testConnection();
    },
  };
}

/**
 * Creates the text provider that matches the key's prefix. Falls back to that provider's
 * default model if the saved model belongs to another provider.
 */
function create_text_for_key(api_key: string, saved_model: string): TextProvider {
  const kind = detect_provider(api_key);
  const model = resolve_text_model(kind, saved_model);
  if (kind === 'claude') return create_claude_text(api_key, model);
  if (kind === 'openai') return create_openai_text(api_key, model);
  return create_gemini_text(api_key, model);
}

/**
 * Creates the image provider that matches the key's prefix, or null if that provider cannot make images.
 */
function create_image_for_key(api_key: string, saved_model: string): ImageProvider | null {
  const kind = detect_provider(api_key);
  const model = resolve_image_model(kind, saved_model);
  if (model === null) return null;
  if (kind === 'openai') return create_openai_image(api_key, model);
  return create_gemini_image(api_key, model);
}

/** Returns the current text provider, or null if none is connected. */
export function get_text_provider(): TextProvider | null {
  const settings = useSettings.getState();
  if (settings.practice) return with_text_usage(create_mock_text());
  if (!settings.text_key) return null;
  return with_text_usage(create_text_for_key(settings.text_key, settings.text_model));
}

/**
 * Returns the current image provider, or null if none is connected or the key's provider cannot make images.
 */
export function get_image_provider(): ImageProvider | null {
  const settings = useSettings.getState();
  if (settings.practice) return with_image_usage(create_mock_image());
  const image_key = effective_image_key(settings);
  if (!image_key) return null;
  const provider = create_image_for_key(image_key, settings.image_model);
  return provider ? with_image_usage(provider) : null;
}

/** Creates a text provider for checking a key on the "Connect AI" screen. */
export function create_text_provider_for_key(api_key: string): TextProvider {
  const settings = useSettings.getState();
  if (settings.practice) return with_text_usage(create_mock_text());
  return with_text_usage(create_text_for_key(api_key, settings.text_model));
}

export { ProviderError };
export type {
  AssistKind,
  AssistRequest,
  AssistResult,
  ConnectionResult,
  ImageEditRequest,
  ImageProvider,
  ImageRequest,
  ProviderErrorKind,
  TextProvider,
} from './types';

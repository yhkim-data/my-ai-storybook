// Detects the AI provider from a key's prefix and holds each provider's defaults.
// Sources for these values are in docs/PROVIDER_NOTES.md.
import {
  DEFAULT_IMAGE_MODEL as GEMINI_IMAGE_MODEL,
  DEFAULT_TEXT_MODEL as GEMINI_TEXT_MODEL,
  GEMINI_KEY_PAGE_URL,
  IMAGE_MODEL_CHOICES as GEMINI_IMAGE_CHOICES,
  TEXT_MODEL_CHOICES as GEMINI_TEXT_CHOICES,
} from './gemini_config';

export type ProviderKind = 'gemini' | 'claude' | 'openai';

/** Check the longer prefix first: Claude keys also start with sk-. */
const CLAUDE_KEY_PREFIX = 'sk-ant-';
const OPENAI_KEY_PREFIX = 'sk-';

export const CLAUDE_TEXT_MODEL = 'claude-haiku-5-5';
export const CLAUDE_TEXT_CHOICES = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'];
export const CLAUDE_KEY_PAGE_URL = 'https://platform.claude.com/settings/keys';

export const OPENAI_TEXT_MODEL = 'gpt-6-luna';
export const OPENAI_TEXT_CHOICES = ['gpt-6-luna', 'gpt-6.1-terra', 'gpt-6.1-sol'];
export const OPENAI_IMAGE_MODEL = 'gpt-image-2.6-flare';
export const OPENAI_IMAGE_CHOICES = ['gpt-image-2.6-flare', 'gpt-image-2.6-sunburst'];
export const OPENAI_KEY_PAGE_URL = 'https://platform.openai.com/api-keys';

export interface ProviderInfo {
  kind: ProviderKind;
  /** Display name. */
  label: string;
  key_page_url: string;
  text_model: string;
  text_choices: string[];
  /** null for providers that cannot make images. */
  image_model: string | null;
  image_choices: string[];
}

export const PROVIDER_INFO: Record<ProviderKind, ProviderInfo> = {
  gemini: {
    kind: 'gemini',
    label: 'Google Gemini',
    key_page_url: GEMINI_KEY_PAGE_URL,
    text_model: GEMINI_TEXT_MODEL,
    text_choices: GEMINI_TEXT_CHOICES,
    image_model: GEMINI_IMAGE_MODEL,
    image_choices: GEMINI_IMAGE_CHOICES,
  },
  claude: {
    kind: 'claude',
    label: 'Claude',
    key_page_url: CLAUDE_KEY_PAGE_URL,
    text_model: CLAUDE_TEXT_MODEL,
    text_choices: CLAUDE_TEXT_CHOICES,
    image_model: null,
    image_choices: [],
  },
  openai: {
    kind: 'openai',
    label: 'OpenAI',
    key_page_url: OPENAI_KEY_PAGE_URL,
    text_model: OPENAI_TEXT_MODEL,
    text_choices: OPENAI_TEXT_CHOICES,
    image_model: OPENAI_IMAGE_MODEL,
    image_choices: OPENAI_IMAGE_CHOICES,
  },
};

/** Display order on screen. */
export const PROVIDER_ORDER: ProviderKind[] = ['gemini', 'claude', 'openai'];

/**
 * Detects the provider from the key prefix. Unknown prefixes are treated as Gemini.
 */
export function detect_provider(api_key: string): ProviderKind {
  const key = api_key.trim();
  if (key.startsWith(CLAUDE_KEY_PREFIX)) return 'claude';
  if (key.startsWith(OPENAI_KEY_PREFIX)) return 'openai';
  return 'gemini';
}

/**
 * Returns the saved text model if it belongs to this provider, otherwise the provider default.
 */
export function resolve_text_model(kind: ProviderKind, saved_model: string): string {
  const info = PROVIDER_INFO[kind];
  return info.text_choices.includes(saved_model) ? saved_model : info.text_model;
}

/**
 * Returns the saved image model if it belongs to this provider, otherwise the provider default.
 * Returns null for providers that cannot make images.
 */
export function resolve_image_model(kind: ProviderKind, saved_model: string): string | null {
  const info = PROVIDER_INFO[kind];
  if (info.image_model === null) return null;
  return info.image_choices.includes(saved_model) ? saved_model : info.image_model;
}

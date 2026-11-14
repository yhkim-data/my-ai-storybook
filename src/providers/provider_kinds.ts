// 키 모양을 보고 어느 AI 회사의 키인지 알아내고, 회사별 기본 설정을 모아 둔 곳.
// 값의 근거는 docs/PROVIDER_NOTES.md 에 있다.
import {
  DEFAULT_IMAGE_MODEL as GEMINI_IMAGE_MODEL,
  DEFAULT_TEXT_MODEL as GEMINI_TEXT_MODEL,
  GEMINI_KEY_PAGE_URL,
  IMAGE_MODEL_CHOICES as GEMINI_IMAGE_CHOICES,
  TEXT_MODEL_CHOICES as GEMINI_TEXT_CHOICES,
} from './gemini_config';

/** 지원하는 AI 회사 */
export type ProviderKind = 'gemini' | 'claude' | 'openai';

/** 키 앞머리. 긴 것부터 견준다 (Claude 키도 sk- 로 시작한다). */
const CLAUDE_KEY_PREFIX = 'sk-ant-';
const OPENAI_KEY_PREFIX = 'sk-';

/** Claude 설정 */
export const CLAUDE_TEXT_MODEL = 'claude-haiku-5-5';
export const CLAUDE_TEXT_CHOICES = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'];
export const CLAUDE_KEY_PAGE_URL = 'https://platform.claude.com/settings/keys';

/** OpenAI 설정 */
export const OPENAI_TEXT_MODEL = 'gpt-6-luna';
export const OPENAI_TEXT_CHOICES = ['gpt-6-luna', 'gpt-6.1-terra', 'gpt-6.1-sol'];
export const OPENAI_IMAGE_MODEL = 'gpt-image-2.6-flare';
export const OPENAI_IMAGE_CHOICES = ['gpt-image-2.6-flare', 'gpt-image-2.6-sunburst'];
export const OPENAI_KEY_PAGE_URL = 'https://platform.openai.com/api-keys';

/** 회사별 설정 모양 */
export interface ProviderInfo {
  kind: ProviderKind;
  /** 화면에 보여 주는 이름 */
  label: string;
  key_page_url: string;
  text_model: string;
  text_choices: string[];
  /** 그림을 만들지 못하는 회사는 null */
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

/** 화면에 회사를 늘어놓는 순서 */
export const PROVIDER_ORDER: ProviderKind[] = ['gemini', 'claude', 'openai'];

/**
 * 키 앞머리를 보고 어느 회사의 키인지 알아낸다. 모르는 모양이면 Gemini로 본다.
 */
export function detect_provider(api_key: string): ProviderKind {
  const key = api_key.trim();
  if (key.startsWith(CLAUDE_KEY_PREFIX)) return 'claude';
  if (key.startsWith(OPENAI_KEY_PREFIX)) return 'openai';
  return 'gemini';
}

/**
 * 저장된 글 AI 종류가 이 회사 것이면 그대로, 아니면 회사 기본값을 돌려준다.
 */
export function resolve_text_model(kind: ProviderKind, saved_model: string): string {
  const info = PROVIDER_INFO[kind];
  return info.text_choices.includes(saved_model) ? saved_model : info.text_model;
}

/**
 * 저장된 그림 AI 종류가 이 회사 것이면 그대로, 아니면 회사 기본값을 돌려준다. 그림을 못 만드는 회사는 null이다.
 */
export function resolve_image_model(kind: ProviderKind, saved_model: string): string | null {
  const info = PROVIDER_INFO[kind];
  if (info.image_model === null) return null;
  return info.image_choices.includes(saved_model) ? saved_model : info.image_model;
}

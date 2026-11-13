// Gemini 글 연결부. 구조화된 JSON으로 받고, 형식이 어긋나면 한 번만 다시 요청한다.
import type { Lang, PageDraft, Plot, StorySeed } from '../types';
import { call_interactions, check_api_key } from './gemini_client';
import { SAFETY_SETTINGS } from './gemini_config';
import {
  PLOTS_SCHEMA,
  build_pages_prompt,
  build_pages_schema,
  build_plots_prompt,
  parse_pages,
  parse_plots,
  text_system_instruction,
} from './prompts';
import { ProviderError, type TextProvider } from './types';

/** 형식이 어긋났을 때를 포함해 요청을 보내는 최대 횟수 */
const MAX_FORMAT_ATTEMPTS = 2;

/**
 * JSON 글을 요청하고 읽는다. 읽지 못하면 한 번만 다시 요청한다.
 */
async function request_json<T>(
  api_key: string,
  model: string,
  prompt: string,
  schema: object,
  lang: Lang,
  parse: (raw: string) => T | null,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_FORMAT_ATTEMPTS; attempt += 1) {
    const blocks = await call_interactions(api_key, {
      model,
      input: prompt,
      system_instruction: text_system_instruction(lang),
      response_format: { type: 'text', mime_type: 'application/json', schema },
      safety_settings: SAFETY_SETTINGS,
      store: false,
    });
    const raw = blocks
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');
    const parsed = parse(raw);
    if (parsed !== null) return parsed;
  }
  throw new ProviderError('unknown', null, 'bad format');
}

/**
 * 주어진 키와 AI 종류로 Gemini 글 연결부를 만든다.
 */
export function create_gemini_text(api_key: string, model: string): TextProvider {
  return {
    id: 'gemini-text',
    suggestPlots: (seed: StorySeed, lang: Lang): Promise<Plot[]> =>
      request_json(api_key, model, build_plots_prompt(seed, lang), PLOTS_SCHEMA, lang, parse_plots),
    splitIntoPages: (plot: Plot, seed: StorySeed, lang: Lang): Promise<PageDraft[]> =>
      request_json(
        api_key,
        model,
        build_pages_prompt(plot, seed, lang),
        build_pages_schema(seed.page_count),
        lang,
        (raw) => parse_pages(raw, seed.page_count),
      ),
    testConnection: () => check_api_key(api_key),
  };
}

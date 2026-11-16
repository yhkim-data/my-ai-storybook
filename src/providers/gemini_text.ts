// Gemini text provider. Asks for structured JSON and retries once if the format is wrong.
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

/** Total attempts, including the one retry after a malformed response. */
const MAX_FORMAT_ATTEMPTS = 2;

/** Requests and parses JSON text; retries once if it cannot be parsed. */
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

/** Creates a Gemini text provider for the given key and model. */
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

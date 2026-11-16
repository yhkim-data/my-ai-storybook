// OpenAI text provider. Asks the Responses API for structured JSON and retries once if the format is wrong.
import type { Lang, PageDraft, Plot, StorySeed } from '../types';
import { OPENAI_RESPONSES_URL, check_openai_key, post_openai } from './openai_client';
import {
  PLOTS_SCHEMA,
  build_pages_prompt,
  build_pages_schema,
  build_plots_prompt,
  parse_pages,
  parse_plots,
  text_system_instruction,
} from './prompts';
import { to_strict_schema } from './strict_schema';
import { ProviderError, type TextProvider } from './types';

/** Total attempts, including the one retry after a malformed response. */
const MAX_FORMAT_ATTEMPTS = 2;
const FORMAT_NAME = 'storybook';
/** incomplete_details.reason when the safety filter cut the response off. */
const CONTENT_FILTER_REASON = 'content_filter';

/** The parts of the Responses API response that we read. */
interface ResponsesBody {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: { type?: string; content?: { type?: string; text?: string; refusal?: string }[] }[];
}

/**
 * Extracts the output text. Throws a blocked error on a refusal or a safety-filter cutoff.
 */
export function read_output_text(body: ResponsesBody): string {
  if (body.incomplete_details?.reason === CONTENT_FILTER_REASON) throw new ProviderError('blocked', null, 'content filter');
  const parts = (body.output ?? []).filter((item) => item.type === 'message').flatMap((item) => item.content ?? []);
  if (parts.some((part) => part.type === 'refusal')) throw new ProviderError('blocked', null, 'refusal');
  return parts
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text ?? '')
    .join('');
}

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
    const body = await post_openai<ResponsesBody>(OPENAI_RESPONSES_URL, api_key, {
      model,
      input: [
        { role: 'system', content: text_system_instruction(lang) },
        { role: 'user', content: prompt },
      ],
      text: { format: { type: 'json_schema', name: FORMAT_NAME, schema: to_strict_schema(schema, true), strict: true } },
      store: false,
    });
    const parsed = parse(read_output_text(body));
    if (parsed !== null) return parsed;
  }
  throw new ProviderError('unknown', null, 'bad format');
}

/** Creates an OpenAI text provider for the given key and model. */
export function create_openai_text(api_key: string, model: string): TextProvider {
  return {
    id: 'openai-text',
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
    testConnection: () => check_openai_key(api_key),
  };
}

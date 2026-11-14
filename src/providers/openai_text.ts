// OpenAI 글 연결부. Responses API에 구조화된 JSON을 요청하고, 형식이 어긋나면 한 번만 다시 요청한다.
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

/** 형식이 어긋났을 때를 포함해 요청을 보내는 최대 횟수 */
const MAX_FORMAT_ATTEMPTS = 2;
/** 응답 형식에 붙이는 이름 */
const FORMAT_NAME = 'storybook';
/** 안전 장치에 걸려 응답이 끊겼을 때의 이유 */
const CONTENT_FILTER_REASON = 'content_filter';

/** Responses API 응답에서 쓰는 부분 */
interface ResponsesBody {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: { type?: string; content?: { type?: string; text?: string; refusal?: string }[] }[];
}

/**
 * 응답에서 글을 꺼낸다. 거절했거나 안전 장치에 걸렸으면 blocked 오류를 던진다.
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

/**
 * 주어진 키와 AI 종류로 OpenAI 글 연결부를 만든다.
 */
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

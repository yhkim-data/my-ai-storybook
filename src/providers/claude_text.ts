// Claude 글 연결부. 공식 SDK로 브라우저에서 직접 부른다. Claude는 그림을 만들지 않으므로 글 연결부만 있다.
// SDK는 Claude 키를 쓸 때만 내려받는다.
import type Anthropic from '@anthropic-ai/sdk';
import { RATE_LIMIT_WAIT_SECONDS } from '../constants';
import type { Lang, PageDraft, Plot, StorySeed } from '../types';
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
import { ProviderError, type ConnectionResult, type TextProvider } from './types';

const MS_PER_SECOND = 1000;
/** 형식이 어긋났을 때를 포함해 요청을 보내는 최대 횟수 */
const MAX_FORMAT_ATTEMPTS = 2;
/** 응답 글 길이 한도(토큰). 생각하는 데 쓰는 양도 여기에 들어간다. */
const MAX_OUTPUT_TOKENS = 16000;
/** 일시적인 오류일 때 SDK가 스스로 다시 보내는 횟수 */
const SDK_MAX_RETRIES = 2;
/** 키 확인 때 조회하는 목록 길이 */
const KEY_CHECK_LIST_LIMIT = 1;
/** 요청이 거절되면 다른 Claude가 이어받게 하는 기능의 꼬리표와, 그 기능을 받는 AI 종류 */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const FALLBACK_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5'];
/** 돈 문제를 알리는 HTTP 상태 */
const HTTP_PAYMENT_REQUIRED = 402;
/** 서버가 붐빌 때의 HTTP 상태 */
const HTTP_OVERLOADED = 529;

type AnthropicModule = typeof import('@anthropic-ai/sdk');

/**
 * SDK를 내려받고, 주어진 키로 브라우저용 클라이언트를 만든다.
 */
async function load_client(api_key: string): Promise<{ sdk: AnthropicModule['default']; client: Anthropic }> {
  const sdk = (await import('@anthropic-ai/sdk')).default;
  // 서버가 없는 도구라서 각자의 키를 자기 브라우저에서 바로 쓴다.
  const client = new sdk({ apiKey: api_key, dangerouslyAllowBrowser: true, maxRetries: SDK_MAX_RETRIES });
  return { sdk, client };
}

/**
 * 다시 해 볼 수 있는 시각(ms)을 응답 머리글에서 읽는다. 없으면 기본 기다림 시간을 쓴다.
 */
function read_retry_at(headers: Headers | undefined): number {
  const seconds = Number(headers?.get('retry-after'));
  const wait_seconds = Number.isFinite(seconds) && seconds > 0 ? seconds : RATE_LIMIT_WAIT_SECONDS;
  return Date.now() + wait_seconds * MS_PER_SECOND;
}

/**
 * SDK 오류를 쉬운 오류 종류로 바꾼다.
 */
export function to_claude_error(sdk: AnthropicModule['default'], cause: unknown): ProviderError {
  if (cause instanceof ProviderError) return cause;
  if (cause instanceof sdk.AuthenticationError) return new ProviderError('bad_key', null, cause.message);
  if (cause instanceof sdk.PermissionDeniedError) return new ProviderError('no_permission', null, cause.message);
  if (cause instanceof sdk.RateLimitError) return new ProviderError('rate', read_retry_at(cause.headers), cause.message);
  if (cause instanceof sdk.APIConnectionError) return new ProviderError('network', null, cause.message);
  if (cause instanceof sdk.APIError) {
    if (cause.status === HTTP_PAYMENT_REQUIRED) return new ProviderError('no_permission', null, cause.message);
    if (cause.status === HTTP_OVERLOADED) return new ProviderError('rate', read_retry_at(cause.headers), cause.message);
    return new ProviderError('unknown', null, cause.message);
  }
  return new ProviderError('unknown', null, String(cause));
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
  const { sdk, client } = await load_client(api_key);
  const use_fallback = FALLBACK_MODELS.includes(model);
  for (let attempt = 0; attempt < MAX_FORMAT_ATTEMPTS; attempt += 1) {
    let message;
    try {
      message = await client.beta.messages.create({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: text_system_instruction(lang),
        messages: [{ role: 'user', content: prompt }],
        // Claude는 배열 길이 제한을 받지 않는다. 개수는 지시문에 적혀 있고 읽을 때 다시 확인한다.
        output_config: { format: { type: 'json_schema', schema: to_strict_schema(schema, false) } },
        ...(use_fallback ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {}),
      });
    } catch (cause) {
      throw to_claude_error(sdk, cause);
    }
    if (message.stop_reason === 'refusal') throw new ProviderError('blocked', null, 'refusal');
    const raw = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
    const parsed = parse(raw);
    if (parsed !== null) return parsed;
  }
  throw new ProviderError('unknown', null, 'bad format');
}

/**
 * 키가 맞는지 확인한다. 글을 만들지 않고 목록만 조회한다.
 */
async function check_claude_key(api_key: string): Promise<ConnectionResult> {
  const { sdk, client } = await load_client(api_key);
  try {
    await client.models.list({ limit: KEY_CHECK_LIST_LIMIT });
    return { ok: true };
  } catch (cause) {
    return { ok: false, reason: to_claude_error(sdk, cause).kind };
  }
}

/**
 * 주어진 키와 AI 종류로 Claude 글 연결부를 만든다.
 */
export function create_claude_text(api_key: string, model: string): TextProvider {
  return {
    id: 'claude-text',
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
    testConnection: () => check_claude_key(api_key),
  };
}

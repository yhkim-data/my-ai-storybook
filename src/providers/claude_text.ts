// Claude text provider, called from the browser through the official SDK. Claude makes no images, so there is no image provider.
// The SDK is downloaded only when a Claude key is used.
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
/** Total attempts, including the one retry after a malformed response. */
const MAX_FORMAT_ATTEMPTS = 2;
/** Output token limit; thinking tokens count toward it too. */
const MAX_OUTPUT_TOKENS = 16000;
/** Retries the SDK makes on its own for transient errors. */
const SDK_MAX_RETRIES = 2;
const KEY_CHECK_LIST_LIMIT = 1;
/** Beta flag that lets another Claude model take over a refused request, and the models that accept it. */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const FALLBACK_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5'];
/** Text in the 401 response when the organization has disabled browser access. */
const BROWSER_BLOCKED_TEXT = 'CORS requests are not allowed';
const HTTP_PAYMENT_REQUIRED = 402;
/** Anthropic's "overloaded" status. */
const HTTP_OVERLOADED = 529;

type AnthropicModule = typeof import('@anthropic-ai/sdk');

/** Lazily loads the SDK and creates a browser client for the key. */
async function load_client(api_key: string): Promise<{ sdk: AnthropicModule['default']; client: Anthropic }> {
  const sdk = (await import('@anthropic-ai/sdk')).default;
  // There is no backend: each user's own key is used directly in their own browser.
  const client = new sdk({ apiKey: api_key, dangerouslyAllowBrowser: true, maxRetries: SDK_MAX_RETRIES });
  return { sdk, client };
}

/**
 * Reads the retry time (epoch ms) from the retry-after header, or uses the default wait.
 */
function read_retry_at(headers: Headers | undefined): number {
  const seconds = Number(headers?.get('retry-after'));
  const wait_seconds = Number.isFinite(seconds) && seconds > 0 ? seconds : RATE_LIMIT_WAIT_SECONDS;
  return Date.now() + wait_seconds * MS_PER_SECOND;
}

/**
 * Maps an SDK error to a simple error kind.
 */
export function to_claude_error(sdk: AnthropicModule['default'], cause: unknown): ProviderError {
  if (cause instanceof ProviderError) return cause;
  if (cause instanceof sdk.AuthenticationError) {
    // A 401 with this text means the organization disabled browser access, not a wrong key.
    const kind = cause.message.includes(BROWSER_BLOCKED_TEXT) ? 'browser_blocked' : 'bad_key';
    return new ProviderError(kind, null, cause.message);
  }
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

/** Requests and parses JSON text; retries once if it cannot be parsed. */
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
        // Claude rejects array length limits. The count is stated in the prompt and checked again when parsing.
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

/** Checks the key by listing models, so no text is generated. */
async function check_claude_key(api_key: string): Promise<ConnectionResult> {
  const { sdk, client } = await load_client(api_key);
  try {
    await client.models.list({ limit: KEY_CHECK_LIST_LIMIT });
    return { ok: true };
  } catch (cause) {
    return { ok: false, reason: to_claude_error(sdk, cause).kind };
  }
}

/** Creates a Claude text provider for the given key and model. */
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

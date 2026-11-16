// Thin layer that calls the Gemini Interactions API straight from the browser. Requests go only to the provider's origin.
import { RATE_LIMIT_WAIT_SECONDS } from '../constants';
import {
  BLOCKED_ERROR_CODES,
  DAILY_QUOTA_ERROR_CODES,
  GEMINI_INTERACTIONS_URL,
  GEMINI_MODELS_URL,
  QUOTA_RESET_TIME_ZONE,
  RATE_ERROR_CODES,
} from './gemini_config';
import { ProviderError, type ConnectionResult } from './types';

const MS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_PAYMENT_REQUIRED = 402;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY = 429;

/** One piece of response content: text or an image. */
interface ContentBlock {
  type?: string;
  text?: string;
  data?: string;
  mime_type?: string;
}

/** The parts of the Interactions API response that we read. */
interface InteractionResponse {
  status?: string;
  steps?: { type?: string; content?: ContentBlock[] }[];
  error?: { code?: string | number; message?: string };
}

/**
 * Returns the next daily quota reset (midnight Pacific time) as epoch ms.
 */
export function next_quota_reset(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: QUOTA_RESET_TIME_ZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hours = read('hour') % 24;
  const elapsed = hours * SECONDS_PER_HOUR + read('minute') * SECONDS_PER_MINUTE + read('second');
  return now.getTime() + (SECONDS_PER_DAY - elapsed) * MS_PER_SECOND;
}

/**
 * Maps an HTTP status and error code to a simple error kind.
 */
export function to_provider_error(http_status: number, code: string, message: string): ProviderError {
  const lower_code = code.toLowerCase();
  if (BLOCKED_ERROR_CODES.includes(lower_code)) return new ProviderError('blocked', null, message);
  if (http_status === HTTP_TOO_MANY) {
    if (DAILY_QUOTA_ERROR_CODES.includes(lower_code)) {
      return new ProviderError('quota_daily', next_quota_reset(), message);
    }
    if (RATE_ERROR_CODES.includes(lower_code) || lower_code === '' || lower_code === 'resource_exhausted') {
      return new ProviderError('rate', Date.now() + RATE_LIMIT_WAIT_SECONDS * MS_PER_SECOND, message);
    }
    return new ProviderError('rate', Date.now() + RATE_LIMIT_WAIT_SECONDS * MS_PER_SECOND, message);
  }
  if (http_status === HTTP_UNAUTHORIZED || lower_code === 'authentication') {
    return new ProviderError('bad_key', null, message);
  }
  if (http_status === HTTP_BAD_REQUEST && /api key/i.test(message)) {
    return new ProviderError('bad_key', null, message);
  }
  if (http_status === HTTP_PAYMENT_REQUIRED || http_status === HTTP_FORBIDDEN) {
    return new ProviderError('no_permission', null, message);
  }
  return new ProviderError('unknown', null, message);
}

async function read_error_body(response: Response): Promise<{ code: string; message: string }> {
  try {
    const body = (await response.json()) as InteractionResponse & { error?: { status?: string } };
    const code = body.error?.code;
    return {
      code: typeof code === 'string' ? code : (body.error?.status ?? ''),
      message: body.error?.message ?? '',
    };
  } catch {
    return { code: '', message: '' };
  }
}

/** Calls fetch and turns a dropped connection into a network error. */
async function safe_fetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    throw new ProviderError('network', null, String(cause));
  }
}

/**
 * Calls the Interactions API and returns the content blocks the model produced.
 */
export async function call_interactions(
  api_key: string,
  body: Record<string, unknown>,
  extra_headers: Record<string, string> = {},
): Promise<ContentBlock[]> {
  const response = await safe_fetch(GEMINI_INTERACTIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': api_key, ...extra_headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const { code, message } = await read_error_body(response);
    throw to_provider_error(response.status, code, message);
  }
  const data = (await response.json()) as InteractionResponse;
  if (data.error) {
    throw to_provider_error(response.status, String(data.error.code ?? ''), data.error.message ?? '');
  }
  const blocks = (data.steps ?? [])
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? []);
  if (blocks.length === 0) {
    throw new ProviderError(data.status === 'failed' ? 'blocked' : 'unknown', null, `status: ${data.status ?? ''}`);
  }
  return blocks;
}

/**
 * Checks the key by listing models, so no text or image is generated.
 */
export async function check_api_key(api_key: string): Promise<ConnectionResult> {
  try {
    const response = await safe_fetch(GEMINI_MODELS_URL, { headers: { 'x-goog-api-key': api_key } });
    if (response.ok) return { ok: true };
    const { code, message } = await read_error_body(response);
    const error = to_provider_error(response.status, code, message);
    // During a key check, a 400 or 403 almost always means a wrong key.
    const reason = error.kind === 'unknown' || error.kind === 'no_permission' ? 'bad_key' : error.kind;
    return { ok: false, reason };
  } catch (cause) {
    return { ok: false, reason: cause instanceof ProviderError ? cause.kind : 'unknown' };
  }
}

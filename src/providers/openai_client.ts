// Thin layer that calls OpenAI straight from the browser. Requests go only to the provider's origin.
import { RATE_LIMIT_WAIT_SECONDS } from '../constants';
import { ProviderError, type ConnectionResult } from './types';

export const OPENAI_ORIGIN = 'https://api.openai.com';
export const OPENAI_RESPONSES_URL = `${OPENAI_ORIGIN}/v1/responses`;
export const OPENAI_IMAGES_URL = `${OPENAI_ORIGIN}/v1/images/generations`;
export const OPENAI_MODELS_URL = `${OPENAI_ORIGIN}/v1/models`;

const MS_PER_SECOND = 1000;
const HTTP_UNAUTHORIZED = 401;
const HTTP_PAYMENT_REQUIRED = 402;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY = 429;

const BLOCKED_ERROR_CODES = ['moderation_blocked', 'content_policy_violation', 'content_filter'];
/** Credit used up or billing not set up. */
const BILLING_ERROR_CODES = ['insufficient_quota', 'billing_hard_limit_reached', 'billing_not_active'];
const BAD_KEY_ERROR_CODES = ['invalid_api_key'];

interface OpenAiErrorBody {
  error?: { code?: string | null; type?: string | null; message?: string | null };
}

/**
 * Maps an HTTP status and error code to a simple error kind.
 */
export function to_openai_error(http_status: number, code: string, message: string, retry_after: string | null): ProviderError {
  const lower_code = code.toLowerCase();
  if (BLOCKED_ERROR_CODES.includes(lower_code)) return new ProviderError('blocked', null, message);
  if (http_status === HTTP_UNAUTHORIZED || BAD_KEY_ERROR_CODES.includes(lower_code)) {
    return new ProviderError('bad_key', null, message);
  }
  if (BILLING_ERROR_CODES.includes(lower_code) || http_status === HTTP_PAYMENT_REQUIRED || http_status === HTTP_FORBIDDEN) {
    return new ProviderError('no_permission', null, message);
  }
  if (http_status === HTTP_TOO_MANY) {
    const seconds = Number(retry_after);
    const wait_seconds = Number.isFinite(seconds) && seconds > 0 ? seconds : RATE_LIMIT_WAIT_SECONDS;
    return new ProviderError('rate', Date.now() + wait_seconds * MS_PER_SECOND, message);
  }
  return new ProviderError('unknown', null, message);
}

async function read_error(response: Response): Promise<ProviderError> {
  let code = '';
  let message = '';
  try {
    const body = (await response.json()) as OpenAiErrorBody;
    code = body.error?.code ?? body.error?.type ?? '';
    message = body.error?.message ?? '';
  } catch {
    // Unreadable body: decide from the HTTP status alone.
  }
  return to_openai_error(response.status, code, message, response.headers.get('retry-after'));
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
 * Posts a JSON body and returns the JSON response. Error responses are thrown as ProviderError.
 */
export async function post_openai<T>(url: string, api_key: string, body: Record<string, unknown>): Promise<T> {
  const response = await safe_fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api_key}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await read_error(response);
  return (await response.json()) as T;
}

/**
 * Checks the key by listing models, so no text or image is generated.
 */
export async function check_openai_key(api_key: string): Promise<ConnectionResult> {
  try {
    const response = await safe_fetch(OPENAI_MODELS_URL, { headers: { Authorization: `Bearer ${api_key}` } });
    if (response.ok) return { ok: true };
    return { ok: false, reason: (await read_error(response)).kind };
  } catch (cause) {
    return { ok: false, reason: cause instanceof ProviderError ? cause.kind : 'unknown' };
  }
}

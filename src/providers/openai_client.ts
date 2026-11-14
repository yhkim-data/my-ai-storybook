// OpenAI를 브라우저에서 직접 부르는 얇은 층. 제공사 주소 외에는 요청을 보내지 않는다.
import { RATE_LIMIT_WAIT_SECONDS } from '../constants';
import { ProviderError, type ConnectionResult } from './types';

/** 제공사 주소 */
export const OPENAI_ORIGIN = 'https://api.openai.com';
export const OPENAI_RESPONSES_URL = `${OPENAI_ORIGIN}/v1/responses`;
export const OPENAI_IMAGES_URL = `${OPENAI_ORIGIN}/v1/images/generations`;
export const OPENAI_MODELS_URL = `${OPENAI_ORIGIN}/v1/models`;

const MS_PER_SECOND = 1000;
const HTTP_UNAUTHORIZED = 401;
const HTTP_PAYMENT_REQUIRED = 402;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY = 429;

/** 오류 코드 묶음 */
const BLOCKED_ERROR_CODES = ['moderation_blocked', 'content_policy_violation', 'content_filter'];
/** 충전한 돈을 다 썼거나 결제가 연결되지 않았을 때의 코드 */
const BILLING_ERROR_CODES = ['insufficient_quota', 'billing_hard_limit_reached', 'billing_not_active'];
const BAD_KEY_ERROR_CODES = ['invalid_api_key'];

/** 오류 응답 본문에서 쓰는 부분 */
interface OpenAiErrorBody {
  error?: { code?: string | null; type?: string | null; message?: string | null };
}

/**
 * HTTP 상태와 오류 코드를 보고 쉬운 오류 종류로 바꾼다.
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

/**
 * 오류 응답을 읽어 ProviderError로 바꾼다.
 */
async function read_error(response: Response): Promise<ProviderError> {
  let code = '';
  let message = '';
  try {
    const body = (await response.json()) as OpenAiErrorBody;
    code = body.error?.code ?? body.error?.type ?? '';
    message = body.error?.message ?? '';
  } catch {
    // 본문을 읽지 못하면 HTTP 상태만으로 판단한다.
  }
  return to_openai_error(response.status, code, message, response.headers.get('retry-after'));
}

/**
 * fetch를 부르고, 연결이 끊겼으면 network 오류로 바꾼다.
 */
async function safe_fetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    throw new ProviderError('network', null, String(cause));
  }
}

/**
 * JSON 본문을 보내고 JSON 응답을 돌려준다. 오류 응답은 ProviderError로 던진다.
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
 * 키가 맞는지 확인한다. 글이나 그림을 만들지 않고 목록만 조회한다.
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

// Gemini provider tests with a fake fetch: request shape, key placement, retries, error mapping, key check, quota reset time.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RATE_LIMIT_WAIT_SECONDS } from '../constants';
import { check_api_key, next_quota_reset, to_provider_error } from './gemini_client';
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL, GEMINI_MODELS_URL, GEMINI_ORIGIN, QUOTA_RESET_TIME_ZONE } from './gemini_config';
import { create_gemini_image } from './gemini_image';
import { create_gemini_text } from './gemini_text';
import { ProviderError, type ImageRequest, type ProviderErrorKind } from './types';
import type { StorySeed } from '../types';

/** Fake key, not a real one. */
const TEST_KEY = 'test-key-0000';
const MS_PER_SECOND = 1000;
const HOURS_24_MS = 24 * 60 * 60 * 1000;
const RATE_TOLERANCE_MS = 5000;
const SEED: StorySeed = { age_band: '8-10', topic: '우정', hero_name: '보리', hero_look: '작은 곰', page_count: 4 };
const IMAGE_REQ: ImageRequest = {
  description: '숲속 길',
  style_id: 'watercolor',
  custom_style: '',
  hero_card: '',
  reference_image: null,
  page_index: 1,
  lang: 'ko',
};
const PLOTS_BODY = {
  status: 'completed',
  steps: [
    {
      type: 'model_output',
      content: [{ type: 'text', text: JSON.stringify({ plots: [1, 2, 3].map((n) => ({ title: `제목${n}`, summary: `요약${n}` })) }) }],
    },
  ],
};
const IMAGE_BODY = {
  status: 'completed',
  steps: [{ type: 'model_output', content: [{ type: 'image', data: 'AAAA', mime_type: 'image/png' }] }],
};

/** The request body fields these tests check. */
interface RequestBody {
  model?: string;
  store?: boolean;
  system_instruction?: string;
  response_format: { type?: string; mime_type?: string; aspect_ratio?: string };
  safety_settings?: { threshold: string }[];
  input?: { type: string }[];
}

type FetchMock = ReturnType<typeof vi.fn>;
type FetchCall = [string, RequestInit & { headers: Record<string, string>; body?: string }];

function json_response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function error_body(code: string, message = 'error'): unknown {
  return { error: { code, message } };
}

/** Installs a global fake fetch that returns the given responses in order. */
function stub_fetch(...responses: (Response | Error)[]): FetchMock {
  const mock = vi.fn();
  for (const item of responses) {
    if (item instanceof Error) mock.mockRejectedValueOnce(item);
    else mock.mockResolvedValueOnce(item);
  }
  vi.stubGlobal('fetch', mock);
  return mock;
}

function body_of(mock: FetchMock, index: number): RequestBody {
  const call = mock.mock.calls[index] as FetchCall;
  return JSON.parse(call[1].body ?? '{}');
}

/** Asserts every request goes only to the provider origin and carries the key only in a header. */
function expect_safe_calls(mock: FetchMock) {
  expect(mock.mock.calls.length).toBeGreaterThan(0);
  for (const call of mock.mock.calls as FetchCall[]) {
    const [url, init] = call;
    expect(url.startsWith(`${GEMINI_ORIGIN}/`)).toBe(true);
    expect(url).not.toContain(TEST_KEY);
    expect(init.headers['x-goog-api-key']).toBe(TEST_KEY);
    expect(init.body ?? '').not.toContain(TEST_KEY);
  }
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('text provider', () => {
  it('request shape: JSON response, 4 safety settings, store false, system_instruction, provider URL and key header', async () => {
    const mock = stub_fetch(json_response(PLOTS_BODY));
    const plots = await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL).suggestPlots(SEED, 'ko');
    expect(plots).toHaveLength(3);
    expect(plots[0]?.title).toBe('제목1');
    expect(mock).toHaveBeenCalledTimes(1);
    expect_safe_calls(mock);
    const body = body_of(mock, 0);
    expect(body.response_format.mime_type).toBe('application/json');
    expect(body.safety_settings).toHaveLength(4);
    expect(body.safety_settings?.every((item: { threshold: string }) => item.threshold === 'block_low_and_above')).toBe(true);
    expect(body.store).toBe(false);
    expect(typeof body.system_instruction).toBe('string');
    expect(body.system_instruction?.length).toBeGreaterThan(0);
    expect(body.model).toBe(DEFAULT_TEXT_MODEL);
  });

  it('page split uses the same safety rules', async () => {
    const pages = Array.from({ length: SEED.page_count }, (_, n) => ({ text: `글${n}`, image_prompt: `그림${n}` }));
    const body = { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify({ pages }) }] }] };
    const mock = stub_fetch(json_response(body));
    const drafts = await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL).splitIntoPages({ id: 'p', title: 't', summary: 's' }, SEED, 'ko');
    expect(drafts).toHaveLength(SEED.page_count);
    expect_safe_calls(mock);
    expect(body_of(mock, 0).store).toBe(false);
  });

  it('retries exactly once on a malformed response and succeeds if the second is valid', async () => {
    const broken = { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: '깨진 글' }] }] };
    const mock = stub_fetch(json_response(broken), json_response(PLOTS_BODY));
    const plots = await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL).suggestPlots(SEED, 'ko');
    expect(plots).toHaveLength(3);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('throws ProviderError(unknown) after two malformed responses, with 2 requests total', async () => {
    const broken = { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: '깨진 글' }] }] };
    const mock = stub_fetch(json_response(broken), json_response(broken), json_response(PLOTS_BODY));
    const error = await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL)
      .suggestPlots(SEED, 'ko')
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe('unknown');
    expect(mock).toHaveBeenCalledTimes(2);
  });
});

describe('image provider', () => {
  it('request shape and response Blob', async () => {
    const mock = stub_fetch(json_response(IMAGE_BODY));
    const blob = await create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL).generate(IMAGE_REQ);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect_safe_calls(mock);
    const body = body_of(mock, 0);
    expect(body.response_format.type).toBe('image');
    expect(body.response_format.aspect_ratio).toBe('1:1');
    expect(body.store).toBe(false);
    const call = mock.mock.calls[0] as FetchCall;
    // No headers that Google rejects in the browser's CORS preflight.
    expect(Object.keys(call[1].headers).map((name) => name.toLowerCase()).sort()).toEqual(['content-type', 'x-goog-api-key']);
  });

  it('the default image model does not support reference images and leaves them out of input', async () => {
    const mock = stub_fetch(json_response(IMAGE_BODY));
    const provider = create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL);
    expect(provider.supportsReferenceImage).toBe(false);
    await provider.generate({ ...IMAGE_REQ, reference_image: 'data:image/png;base64,AAAA' });
    const input = body_of(mock, 0).input as { type: string }[];
    expect(input.some((part) => part.type === 'image')).toBe(false);
  });

  it('gemini-nano-banana-2.1 puts the reference image in input', async () => {
    const mock = stub_fetch(json_response(IMAGE_BODY));
    const provider = create_gemini_image(TEST_KEY, 'gemini-nano-banana-2.1');
    expect(provider.supportsReferenceImage).toBe(true);
    await provider.generate({ ...IMAGE_REQ, reference_image: 'data:image/png;base64,AAAA' });
    const input = body_of(mock, 0).input as object[];
    expect(input).toContainEqual({ type: 'image', mime_type: 'image/png', data: 'AAAA' });
  });

  it('on a 400 rejecting safety_settings, retries once without it', async () => {
    const mock = stub_fetch(json_response(error_body('invalid_request', 'Unknown field: safety_settings'), 400), json_response(IMAGE_BODY));
    const blob = await create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL).generate(IMAGE_REQ);
    expect(blob.type).toBe('image/png');
    expect(mock).toHaveBeenCalledTimes(2);
    expect(body_of(mock, 0).safety_settings).toBeDefined();
    expect(body_of(mock, 1).safety_settings).toBeUndefined();
    expect_safe_calls(mock);
  });

  it('does not retry a 400 unrelated to safety settings', async () => {
    const mock = stub_fetch(json_response(error_body('invalid_request', 'bad size'), 400), json_response(IMAGE_BODY));
    await expect(create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL).generate(IMAGE_REQ)).rejects.toBeInstanceOf(ProviderError);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('throws when the response has no image', async () => {
    stub_fetch(json_response({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: '말뿐' }] }] }));
    await expect(create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL).generate(IMAGE_REQ)).rejects.toBeInstanceOf(ProviderError);
  });
});

/** [HTTP status, error code, expected kind] */
const ERROR_CASES: [number, string, ProviderErrorKind][] = [
  [401, '', 'bad_key'],
  [400, 'authentication', 'bad_key'],
  [403, '', 'no_permission'],
  [429, 'quota_exceeded', 'quota_daily'],
  [429, 'rate_limit_exceeded', 'rate'],
  [429, 'too_many_requests', 'rate'],
  [400, 'safety', 'blocked'],
  [400, 'image_safety', 'blocked'],
  [400, 'prohibited_content', 'blocked'],
  [500, '', 'unknown'],
];

describe('to_provider_error', () => {
  it.each(ERROR_CASES)('status %i, code "%s" -> %s', (status, code, kind) => {
    const before = Date.now();
    const error = to_provider_error(status, code, 'message');
    expect(error.kind).toBe(kind);
    if (kind === 'quota_daily') expect(error.retry_at).toBeGreaterThan(before);
    else if (kind === 'rate') {
      expect(error.retry_at).toBeGreaterThanOrEqual(before + RATE_LIMIT_WAIT_SECONDS * MS_PER_SECOND - RATE_TOLERANCE_MS);
      expect(error.retry_at).toBeLessThanOrEqual(Date.now() + RATE_LIMIT_WAIT_SECONDS * MS_PER_SECOND + RATE_TOLERANCE_MS);
    } else expect(error.retry_at).toBeNull();
  });
});

describe('error mapping through real calls', () => {
  it.each(ERROR_CASES)('text: status %i, code "%s" -> %s', async (status, code, kind) => {
    const mock = stub_fetch(json_response(code ? error_body(code) : {}, status));
    const error = await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL)
      .suggestPlots(SEED, 'ko')
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe(kind);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it.each(ERROR_CASES)('image: status %i, code "%s" -> %s', async (status, code, kind) => {
    stub_fetch(json_response(code ? error_body(code) : {}, status));
    const error = await create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL)
      .generate(IMAGE_REQ)
      .catch((cause: unknown) => cause);
    expect((error as ProviderError).kind).toBe(kind);
  });

  it('daily quota has a future retry_at; rate limit is about now + 60s', async () => {
    stub_fetch(json_response(error_body('quota_exceeded'), 429));
    const quota = (await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL)
      .suggestPlots(SEED, 'ko')
      .catch((cause: unknown) => cause)) as ProviderError;
    expect(quota.retry_at).toBeGreaterThan(Date.now());
    stub_fetch(json_response(error_body('rate_limit_exceeded'), 429));
    const rate = (await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL)
      .suggestPlots(SEED, 'ko')
      .catch((cause: unknown) => cause)) as ProviderError;
    expect(Math.abs((rate.retry_at ?? 0) - (Date.now() + RATE_LIMIT_WAIT_SECONDS * MS_PER_SECOND))).toBeLessThan(RATE_TOLERANCE_MS);
  });

  it('a fetch TypeError is network', async () => {
    stub_fetch(new TypeError('Failed to fetch'));
    const error = await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL)
      .suggestPlots(SEED, 'ko')
      .catch((cause: unknown) => cause);
    expect((error as ProviderError).kind).toBe('network');
    stub_fetch(new TypeError('Failed to fetch'));
    const image_error = await create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL)
      .generate(IMAGE_REQ)
      .catch((cause: unknown) => cause);
    expect((image_error as ProviderError).kind).toBe('network');
  });
});

describe('check_api_key', () => {
  it('200 is ok, the URL is /v1beta/models, and the key is only in a header', async () => {
    const mock = stub_fetch(json_response({ models: [] }));
    expect(await check_api_key(TEST_KEY)).toEqual({ ok: true });
    const call = mock.mock.calls[0] as FetchCall;
    expect(call[0]).toBe(GEMINI_MODELS_URL);
    expect(new URL(call[0]).pathname).toBe('/v1beta/models');
    expect_safe_calls(mock);
  });

  it('401 is bad_key', async () => {
    stub_fetch(json_response(error_body('authentication'), 401));
    expect(await check_api_key(TEST_KEY)).toEqual({ ok: false, reason: 'bad_key' });
  });

  it('a failed fetch is network', async () => {
    stub_fetch(new TypeError('Failed to fetch'));
    expect(await check_api_key(TEST_KEY)).toEqual({ ok: false, reason: 'network' });
  });

  it('provider testConnection also calls only that URL', async () => {
    const mock = stub_fetch(json_response({}), json_response({}));
    expect(await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL).testConnection()).toEqual({ ok: true });
    expect(await create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL).testConnection()).toEqual({ ok: true });
    expect_safe_calls(mock);
  });
});

describe('next_quota_reset', () => {
  it('is later than now, within 24 hours, and at 00:00 Pacific time', () => {
    const now = new Date('2026-11-14T12:00:00Z');
    const reset = next_quota_reset(now);
    expect(reset).toBeGreaterThan(now.getTime());
    expect(reset - now.getTime()).toBeLessThanOrEqual(HOURS_24_MS);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: QUOTA_RESET_TIME_ZONE,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date(reset));
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    expect(read('hour')).toBe(0);
    expect(read('minute')).toBe(0);
  });
});

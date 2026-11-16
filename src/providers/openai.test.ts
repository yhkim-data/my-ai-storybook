// OpenAI provider tests with a fake fetch: request shape, response parsing, error mapping, key check.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RATE_LIMIT_WAIT_SECONDS } from '../constants';
import { OPENAI_IMAGES_URL, OPENAI_MODELS_URL, OPENAI_RESPONSES_URL } from './openai_client';
import { create_openai_image } from './openai_image';
import { create_openai_text } from './openai_text';
import { ProviderError, type ImageRequest, type ProviderErrorKind } from './types';
import type { StorySeed } from '../types';

/** Fake key, not a real one. */
const TEST_KEY = 'sk-' + 'test-fake-A1b2';
const TEXT_MODEL = 'gpt-6-luna';
const IMAGE_MODEL = 'gpt-image-2.6-flare';
const PAGE_COUNT = 4;
const MS_PER_SECOND = 1000;
const RATE_TOLERANCE_MS = 5000;
const SEED: StorySeed = { age_band: '8-10', topic: '우정', hero_name: '보리', hero_look: '작은 곰', page_count: PAGE_COUNT };
const IMAGE_REQ: ImageRequest = {
  description: '숲속 길',
  style_id: 'watercolor',
  hero_card: '',
  reference_image: null,
  page_index: 1,
  lang: 'ko',
};
const PLOTS_TEXT = JSON.stringify({ plots: [1, 2, 3].map((n) => ({ title: `제목${n}`, summary: `요약${n}` })) });
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

type FetchMock = ReturnType<typeof vi.fn>;
type FetchCall = [string, RequestInit & { headers: Record<string, string>; body?: string }];

function json_response(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function text_body(text: string): unknown {
  return { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] };
}

function error_response(status: number, code: string, headers: Record<string, string> = {}): Response {
  return json_response({ error: { code, message: 'x' } }, status, headers);
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

function read_call(mock: FetchMock, index: number) {
  const call = mock.mock.calls[index] as FetchCall;
  return { url: call[0], headers: call[1].headers, body: JSON.parse(call[1].body ?? '{}') as Record<string, unknown> };
}

/** Asserts that a plot request fails with the given error kind. */
async function expect_text_error(response: Response, kind: ProviderErrorKind): Promise<ProviderError> {
  stub_fetch(response);
  const error = await create_openai_text(TEST_KEY, TEXT_MODEL)
    .suggestPlots(SEED, 'ko')
    .then(
      () => null,
      (cause: unknown) => cause,
    );
  expect(error).toBeInstanceOf(ProviderError);
  expect((error as ProviderError).kind).toBe(kind);
  return error as ProviderError;
}

afterEach(() => vi.unstubAllGlobals());

describe('OpenAI text', () => {
  it('request shape: URL, key only in header, text.format, strict, store:false', async () => {
    const mock = stub_fetch(json_response(text_body(PLOTS_TEXT)));
    const plots = await create_openai_text(TEST_KEY, TEXT_MODEL).suggestPlots(SEED, 'ko');
    expect(plots).toHaveLength(3);
    const { url, headers, body } = read_call(mock, 0);
    expect(url).toBe(OPENAI_RESPONSES_URL);
    expect(headers.Authorization).toBe(`Bearer ${TEST_KEY}`);
    expect(JSON.stringify(body)).not.toContain(TEST_KEY);
    expect(body.model).toBe(TEXT_MODEL);
    expect(body.store).toBe(false);
    const format = (body.text as { format: { type: string; strict: boolean; schema: unknown } }).format;
    expect(format.type).toBe('json_schema');
    expect(format.strict).toBe(true);
    expect(JSON.stringify(format.schema)).toContain('"additionalProperties":false');
  });

  it('retries once on a wrong page count', async () => {
    const wrong = JSON.stringify({ pages: [{ text: 'a', image_prompt: 'b' }] });
    const right = JSON.stringify({ pages: Array.from({ length: PAGE_COUNT }, () => ({ text: 'a', image_prompt: 'b' })) });
    const mock = stub_fetch(json_response(text_body(wrong)), json_response(text_body(right)));
    const pages = await create_openai_text(TEST_KEY, TEXT_MODEL).splitIntoPages({ id: 'p', title: 't', summary: 's' }, SEED, 'ko');
    expect(pages).toHaveLength(PAGE_COUNT);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('is unknown after two malformed responses', async () => {
    stub_fetch(json_response(text_body('nope')), json_response(text_body('nope')));
    await expect(create_openai_text(TEST_KEY, TEXT_MODEL).suggestPlots(SEED, 'ko')).rejects.toMatchObject({ kind: 'unknown' });
  });

  it('a refusal is blocked', async () => {
    const body = { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] };
    await expect_text_error(json_response(body), 'blocked');
  });

  it('incomplete with reason content_filter is blocked', async () => {
    const body = { status: 'incomplete', incomplete_details: { reason: 'content_filter' }, output: [] };
    await expect_text_error(json_response(body), 'blocked');
  });
});

describe('OpenAI image', () => {
  it('sends the request shape and returns b64_json as a Blob', async () => {
    const mock = stub_fetch(json_response({ data: [{ b64_json: PNG_BASE64 }] }));
    const blob = await create_openai_image(TEST_KEY, IMAGE_MODEL).generate(IMAGE_REQ);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
    const { url, headers, body } = read_call(mock, 0);
    expect(url).toBe(OPENAI_IMAGES_URL);
    expect(headers.Authorization).toBe(`Bearer ${TEST_KEY}`);
    expect(body.model).toBe(IMAGE_MODEL);
    expect(JSON.stringify(body)).not.toContain(TEST_KEY);
  });

  it('no image is blocked', async () => {
    stub_fetch(json_response({ data: [] }));
    await expect(create_openai_image(TEST_KEY, IMAGE_MODEL).generate(IMAGE_REQ)).rejects.toMatchObject({ kind: 'blocked' });
  });

  it('moderation_blocked is blocked', async () => {
    stub_fetch(error_response(400, 'moderation_blocked'));
    await expect(create_openai_image(TEST_KEY, IMAGE_MODEL).generate(IMAGE_REQ)).rejects.toMatchObject({ kind: 'blocked' });
  });
});

describe('OpenAI error mapping', () => {
  it('401 is bad_key', async () => {
    await expect_text_error(error_response(401, 'invalid_api_key'), 'bad_key');
  });

  it('429 insufficient_quota is no_permission', async () => {
    await expect_text_error(error_response(429, 'insufficient_quota'), 'no_permission');
  });

  it('other 429s are rate and follow retry-after', async () => {
    const wait_seconds = 9;
    const before = Date.now();
    const error = await expect_text_error(
      error_response(429, 'rate_limit_exceeded', { 'retry-after': String(wait_seconds) }),
      'rate',
    );
    expect(Math.abs((error.retry_at ?? 0) - (before + wait_seconds * MS_PER_SECOND))).toBeLessThan(RATE_TOLERANCE_MS);
  });

  it('uses the default wait without retry-after', async () => {
    const before = Date.now();
    const error = await expect_text_error(error_response(429, 'rate_limit_exceeded'), 'rate');
    expect(Math.abs((error.retry_at ?? 0) - (before + RATE_LIMIT_WAIT_SECONDS * MS_PER_SECOND))).toBeLessThan(RATE_TOLERANCE_MS);
  });

  it('a throwing fetch is network', async () => {
    stub_fetch(new TypeError('fail'));
    await expect(create_openai_text(TEST_KEY, TEXT_MODEL).suggestPlots(SEED, 'ko')).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('OpenAI key check', () => {
  it('is ok when the model list succeeds', async () => {
    const mock = stub_fetch(json_response({ data: [] }));
    expect(await create_openai_text(TEST_KEY, TEXT_MODEL).testConnection()).toEqual({ ok: true });
    const { url, headers } = read_call(mock, 0);
    expect(url).toBe(OPENAI_MODELS_URL);
    expect(headers.Authorization).toBe(`Bearer ${TEST_KEY}`);
  });

  it('401 is bad_key, a dropped connection is network', async () => {
    stub_fetch(error_response(401, 'invalid_api_key'));
    expect(await create_openai_image(TEST_KEY, IMAGE_MODEL).testConnection()).toEqual({ ok: false, reason: 'bad_key' });
    stub_fetch(new TypeError('fail'));
    expect(await create_openai_text(TEST_KEY, TEXT_MODEL).testConnection()).toEqual({ ok: false, reason: 'network' });
  });
});

// Gemini 연결부 검사: 가짜 fetch로 요청 모양, 키 위치, 다시 요청, 오류 바꾸기, 키 확인, 한도 풀리는 시각을 본다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RATE_LIMIT_WAIT_SECONDS } from '../constants';
import { check_api_key, next_quota_reset, to_provider_error } from './gemini_client';
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL, GEMINI_MODELS_URL, GEMINI_ORIGIN, QUOTA_RESET_TIME_ZONE } from './gemini_config';
import { create_gemini_image } from './gemini_image';
import { create_gemini_text } from './gemini_text';
import { ProviderError, type ImageRequest, type ProviderErrorKind } from './types';
import type { StorySeed } from '../types';

/** 가짜 키. 실제 키가 아니다. */
const TEST_KEY = 'test-key-0000';
const MS_PER_SECOND = 1000;
const HOURS_24_MS = 24 * 60 * 60 * 1000;
const RATE_TOLERANCE_MS = 5000;
const SEED: StorySeed = { age_band: '8-10', topic: '우정', hero_name: '보리', hero_look: '작은 곰', page_count: 4 };
const IMAGE_REQ: ImageRequest = {
  description: '숲속 길',
  style_id: 'watercolor',
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

/** 요청 본문에서 검사하는 부분 */
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

/** JSON 응답을 만든다. */
function json_response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** 오류 응답 본문을 만든다. */
function error_body(code: string, message = 'error'): unknown {
  return { error: { code, message } };
}

/** 가짜 fetch를 전역에 둔다. 응답은 차례대로 나온다. */
function stub_fetch(...responses: (Response | Error)[]): FetchMock {
  const mock = vi.fn();
  for (const item of responses) {
    if (item instanceof Error) mock.mockRejectedValueOnce(item);
    else mock.mockResolvedValueOnce(item);
  }
  vi.stubGlobal('fetch', mock);
  return mock;
}

/** n번째 요청의 본문을 읽는다. */
function body_of(mock: FetchMock, index: number): RequestBody {
  const call = mock.mock.calls[index] as FetchCall;
  return JSON.parse(call[1].body ?? '{}');
}

/** 모든 요청이 제공사 주소로만 가고, 키가 머리글에만 있는지 본다. */
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

describe('글 연결부', () => {
  it('요청 모양: JSON 응답 지정, 안전 설정 4개, store false, system_instruction, 제공사 주소와 키 머리글', async () => {
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

  it('쪽 나누기도 같은 안전 규칙으로 요청한다', async () => {
    const pages = Array.from({ length: SEED.page_count }, (_, n) => ({ text: `글${n}`, image_prompt: `그림${n}` }));
    const body = { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify({ pages }) }] }] };
    const mock = stub_fetch(json_response(body));
    const drafts = await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL).splitIntoPages({ id: 'p', title: 't', summary: 's' }, SEED, 'ko');
    expect(drafts).toHaveLength(SEED.page_count);
    expect_safe_calls(mock);
    expect(body_of(mock, 0).store).toBe(false);
  });

  it('형식이 깨지면 정확히 한 번 더 요청하고 두 번째가 맞으면 성공한다', async () => {
    const broken = { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: '깨진 글' }] }] };
    const mock = stub_fetch(json_response(broken), json_response(PLOTS_BODY));
    const plots = await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL).suggestPlots(SEED, 'ko');
    expect(plots).toHaveLength(3);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('두 번 다 깨지면 ProviderError(unknown)이고 요청은 총 2회다', async () => {
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

describe('그림 연결부', () => {
  it('요청 모양과 응답 Blob', async () => {
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
    expect(call[1].headers['Api-Revision']).toBeTruthy();
  });

  it('기본 그림 AI는 참고 그림을 지원하지 않고 보내도 input에 image가 없다', async () => {
    const mock = stub_fetch(json_response(IMAGE_BODY));
    const provider = create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL);
    expect(provider.supportsReferenceImage).toBe(false);
    await provider.generate({ ...IMAGE_REQ, reference_image: 'data:image/png;base64,AAAA' });
    const input = body_of(mock, 0).input as { type: string }[];
    expect(input.some((part) => part.type === 'image')).toBe(false);
  });

  it('gemini-nano-banana-2.1은 참고 그림을 input에 넣는다', async () => {
    const mock = stub_fetch(json_response(IMAGE_BODY));
    const provider = create_gemini_image(TEST_KEY, 'gemini-nano-banana-2.1');
    expect(provider.supportsReferenceImage).toBe(true);
    await provider.generate({ ...IMAGE_REQ, reference_image: 'data:image/png;base64,AAAA' });
    const input = body_of(mock, 0).input as object[];
    expect(input).toContainEqual({ type: 'image', mime_type: 'image/png', data: 'AAAA' });
  });

  it('안전 설정 값을 거절하는 400이면 그 값을 빼고 한 번 다시 보낸다', async () => {
    const mock = stub_fetch(json_response(error_body('invalid_request', 'Unknown field: safety_settings'), 400), json_response(IMAGE_BODY));
    const blob = await create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL).generate(IMAGE_REQ);
    expect(blob.type).toBe('image/png');
    expect(mock).toHaveBeenCalledTimes(2);
    expect(body_of(mock, 0).safety_settings).toBeDefined();
    expect(body_of(mock, 1).safety_settings).toBeUndefined();
    expect_safe_calls(mock);
  });

  it('안전 설정과 관계없는 400은 다시 보내지 않는다', async () => {
    const mock = stub_fetch(json_response(error_body('invalid_request', 'bad size'), 400), json_response(IMAGE_BODY));
    await expect(create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL).generate(IMAGE_REQ)).rejects.toBeInstanceOf(ProviderError);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('응답에 그림이 없으면 오류다', async () => {
    stub_fetch(json_response({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: '말뿐' }] }] }));
    await expect(create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL).generate(IMAGE_REQ)).rejects.toBeInstanceOf(ProviderError);
  });
});

/** 오류 바꾸기 표: [상태, 코드, 기대 종류] */
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
  it.each(ERROR_CASES)('상태 %i, 코드 "%s" → %s', (status, code, kind) => {
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

describe('실제 호출에서 오류 바꾸기', () => {
  it.each(ERROR_CASES)('글: 상태 %i, 코드 "%s" → %s', async (status, code, kind) => {
    const mock = stub_fetch(json_response(code ? error_body(code) : {}, status));
    const error = await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL)
      .suggestPlots(SEED, 'ko')
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe(kind);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it.each(ERROR_CASES)('그림: 상태 %i, 코드 "%s" → %s', async (status, code, kind) => {
    stub_fetch(json_response(code ? error_body(code) : {}, status));
    const error = await create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL)
      .generate(IMAGE_REQ)
      .catch((cause: unknown) => cause);
    expect((error as ProviderError).kind).toBe(kind);
  });

  it('하루 한도는 retry_at이 미래이고 분당 한도는 지금+60초쯤이다', async () => {
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

  it('fetch가 TypeError로 실패하면 network이다', async () => {
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
  it('200이면 ok이고 요청 주소가 /v1beta/models이며 키는 머리글에만 있다', async () => {
    const mock = stub_fetch(json_response({ models: [] }));
    expect(await check_api_key(TEST_KEY)).toEqual({ ok: true });
    const call = mock.mock.calls[0] as FetchCall;
    expect(call[0]).toBe(GEMINI_MODELS_URL);
    expect(new URL(call[0]).pathname).toBe('/v1beta/models');
    expect_safe_calls(mock);
  });

  it('401이면 bad_key이다', async () => {
    stub_fetch(json_response(error_body('authentication'), 401));
    expect(await check_api_key(TEST_KEY)).toEqual({ ok: false, reason: 'bad_key' });
  });

  it('fetch가 실패하면 network이다', async () => {
    stub_fetch(new TypeError('Failed to fetch'));
    expect(await check_api_key(TEST_KEY)).toEqual({ ok: false, reason: 'network' });
  });

  it('연결부의 testConnection도 같은 주소로만 요청한다', async () => {
    const mock = stub_fetch(json_response({}), json_response({}));
    expect(await create_gemini_text(TEST_KEY, DEFAULT_TEXT_MODEL).testConnection()).toEqual({ ok: true });
    expect(await create_gemini_image(TEST_KEY, DEFAULT_IMAGE_MODEL).testConnection()).toEqual({ ok: true });
    expect_safe_calls(mock);
  });
});

describe('next_quota_reset', () => {
  it('지금보다 뒤이고 24시간 이내이며 태평양 시간으로 0시 0분이다', () => {
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

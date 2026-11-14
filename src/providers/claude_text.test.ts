// @vitest-environment node
// Claude 글 연결부 검사: 가짜 fetch로 SDK가 보내는 요청 모양, 오류 바꾸기, 다시 요청, 키 확인을 본다.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { create_claude_text } from './claude_text';
import { ProviderError, type ProviderErrorKind } from './types';
import type { StorySeed } from '../types';

/** 가짜 키. 실제 키가 아니다. */
const TEST_KEY = 'sk-ant-' + 'test-fake-A1b2';
const OPUS = 'claude-opus-5-5';
const SONNET = 'claude-sonnet-5-5';
const HAIKU = 'claude-haiku-5-5';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
/** 조직 설정에서 브라우저 사용이 꺼져 있을 때 Claude가 401과 함께 주는 문구 */
const BROWSER_BLOCKED_MESSAGE = 'CORS requests are not allowed for this Organization';
const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const MODELS_URL = 'https://api.anthropic.com/v1/models';
const PAGE_COUNT = 4;
const MS_PER_SECOND = 1000;
const RATE_TOLERANCE_MS = 5000;
const RETRY_AFTER_SECONDS = 7;
const SEED: StorySeed = { age_band: '8-10', topic: '우정', hero_name: '보리', hero_look: '작은 곰', page_count: PAGE_COUNT };
const PLOT = { id: 'plot-1', title: '제목', summary: '요약' };
const PLOTS_TEXT = JSON.stringify({ plots: [1, 2, 3].map((n) => ({ title: `제목${n}`, summary: `요약${n}` })) });

/** 쪽 글 JSON을 만든다. */
function pages_text(count: number): string {
  return JSON.stringify({ pages: Array.from({ length: count }, (_, i) => ({ text: `글${i}`, image_prompt: `그림${i}` })) });
}

/** 정상 응답을 만든다. */
function message_response(text: string, stop_reason = 'end_turn', model = OPUS): Response {
  return new Response(
    JSON.stringify({
      id: 'msg_x',
      type: 'message',
      role: 'assistant',
      model,
      content: [{ type: 'text', text }],
      stop_reason,
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

/** 오류 응답을 만든다. SDK가 스스로 다시 보내지 않게 한다. */
function error_response(status: number, error_type: string, extra: Record<string, string> = {}, message = 'x'): Response {
  return new Response(JSON.stringify({ type: 'error', error: { type: error_type, message } }), {
    status,
    headers: { 'content-type': 'application/json', 'x-should-retry': 'false', ...extra },
  });
}

type FetchMock = ReturnType<typeof vi.fn>;

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

/** n번째 요청의 주소, 머리글(소문자 이름), 본문을 읽는다. */
function read_call(mock: FetchMock, index: number) {
  const [input, init] = mock.mock.calls[index] as [string | URL | Request, RequestInit];
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const headers: Record<string, string> = {};
  new Headers(init.headers).forEach((value, name) => {
    headers[name.toLowerCase()] = value;
  });
  const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  return { url, headers, body };
}

/** 키가 머리글에만 실려 있는지 본다. 이 SDK 판은 Authorization: Bearer 로 보내고, 옛 판은 x-api-key 로 보낸다. */
function expect_key_header(headers: Record<string, string>): void {
  const sent = headers['x-api-key'] ?? headers.authorization?.replace(/^Bearer /, '');
  expect(sent).toBe(TEST_KEY);
}

/** 스키마 안의 모든 객체 마디를 모은다. */
function collect_objects(node: unknown, found: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(node)) node.forEach((item) => collect_objects(item, found));
  else if (typeof node === 'object' && node !== null) {
    const record = node as Record<string, unknown>;
    if (record.type === 'object') found.push(record);
    Object.values(record).forEach((value) => collect_objects(value, found));
  }
  return found;
}

/** 줄거리 요청이 주어진 오류 종류로 실패하는지 본다. */
async function expect_plot_error(responses: (Response | Error)[], kind: ProviderErrorKind): Promise<ProviderError> {
  stub_fetch(...responses);
  const error = await create_claude_text(TEST_KEY, HAIKU)
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

describe('Claude 글 요청 모양', () => {
  it('주소, 키 머리글, json_schema 형식, 엄격한 스키마를 보낸다 (haiku는 fallbacks 없음)', async () => {
    const mock = stub_fetch(message_response(PLOTS_TEXT, 'end_turn', HAIKU));
    const plots = await create_claude_text(TEST_KEY, HAIKU).suggestPlots(SEED, 'ko');
    expect(plots).toHaveLength(3);
    const { url, headers, body } = read_call(mock, 0);
    expect(url.startsWith(MESSAGES_URL)).toBe(true);
    expect_key_header(headers);
    expect(url).not.toContain(TEST_KEY);
    const format = (body.output_config as { format: { type: string; schema: unknown } }).format;
    expect(format.type).toBe('json_schema');
    const objects = collect_objects(format.schema);
    expect(objects.length).toBeGreaterThan(0);
    for (const item of objects) expect(item.additionalProperties).toBe(false);
    const schema_text = JSON.stringify(format.schema);
    expect(schema_text).not.toContain('minItems');
    expect(schema_text).not.toContain('maxItems');
    expect(body.fallbacks).toBeUndefined();
    expect(headers['anthropic-beta'] ?? '').not.toContain(FALLBACK_BETA);
  });

  it.each([OPUS, SONNET])('%s 는 fallbacks 와 베타 머리글을 보낸다', async (model) => {
    const mock = stub_fetch(message_response(PLOTS_TEXT, 'end_turn', model));
    await create_claude_text(TEST_KEY, model).suggestPlots(SEED, 'ko');
    const { headers, body } = read_call(mock, 0);
    expect(body.fallbacks).toBe('default');
    expect(headers['anthropic-beta']).toContain(FALLBACK_BETA);
  });
});

describe('Claude 응답 읽기와 다시 요청', () => {
  it('쪽 나누기: 쪽수가 맞으면 한 번에 끝난다', async () => {
    const mock = stub_fetch(message_response(pages_text(PAGE_COUNT)));
    const pages = await create_claude_text(TEST_KEY, OPUS).splitIntoPages(PLOT, SEED, 'ko');
    expect(pages).toHaveLength(PAGE_COUNT);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('쪽수가 틀리면 한 번 다시 요청한다', async () => {
    const mock = stub_fetch(message_response(pages_text(PAGE_COUNT - 1)), message_response(pages_text(PAGE_COUNT)));
    const pages = await create_claude_text(TEST_KEY, OPUS).splitIntoPages(PLOT, SEED, 'ko');
    expect(pages).toHaveLength(PAGE_COUNT);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('형식이 두 번 어긋나면 unknown', async () => {
    await expect_plot_error([message_response('not json'), message_response('still not')], 'unknown');
  });
});

describe('Claude 오류 바꾸기', () => {
  it('stop_reason refusal 은 blocked', async () => {
    await expect_plot_error([message_response('', 'refusal')], 'blocked');
  });

  it('401 은 bad_key', async () => {
    await expect_plot_error([error_response(401, 'authentication_error')], 'bad_key');
  });

  it('401 이고 문구가 CORS 막힘이면 bad_key 가 아니라 browser_blocked', async () => {
    await expect_plot_error([error_response(401, 'authentication_error', {}, BROWSER_BLOCKED_MESSAGE)], 'browser_blocked');
  });

  it('403 은 no_permission', async () => {
    await expect_plot_error([error_response(403, 'permission_error')], 'no_permission');
  });

  it('429 는 rate 이고 다시 해 볼 시각이 있다', async () => {
    const before = Date.now();
    const error = await expect_plot_error(
      [error_response(429, 'rate_limit_error', { 'retry-after': String(RETRY_AFTER_SECONDS) })],
      'rate',
    );
    expect(error.retry_at).not.toBeNull();
    expect(Math.abs((error.retry_at ?? 0) - (before + RETRY_AFTER_SECONDS * MS_PER_SECOND))).toBeLessThan(RATE_TOLERANCE_MS);
  });

  it('fetch가 던지면 network', async () => {
    // SDK가 연결 오류는 다시 보낼 수 있으므로 같은 오류를 넉넉히 준비한다.
    await expect_plot_error([new TypeError('fail'), new TypeError('fail'), new TypeError('fail')], 'network');
  });
});

describe('Claude 키 확인', () => {
  it('목록 조회가 되면 ok 이고 키는 머리글에만 있다', async () => {
    const mock = stub_fetch(
      new Response(JSON.stringify({ data: [], has_more: false, first_id: null, last_id: null }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const result = await create_claude_text(TEST_KEY, OPUS).testConnection();
    expect(result).toEqual({ ok: true });
    const { url, headers } = read_call(mock, 0);
    expect(url.startsWith(MODELS_URL)).toBe(true);
    expect(url).not.toContain(TEST_KEY);
    expect_key_header(headers);
  });

  it('401 이면 bad_key', async () => {
    stub_fetch(error_response(401, 'authentication_error'));
    expect(await create_claude_text(TEST_KEY, OPUS).testConnection()).toEqual({ ok: false, reason: 'bad_key' });
  });

  it('401 이고 문구가 CORS 막힘이면 browser_blocked', async () => {
    stub_fetch(error_response(401, 'authentication_error', {}, BROWSER_BLOCKED_MESSAGE));
    expect(await create_claude_text(TEST_KEY, HAIKU).testConnection()).toEqual({ ok: false, reason: 'browser_blocked' });
  });
});

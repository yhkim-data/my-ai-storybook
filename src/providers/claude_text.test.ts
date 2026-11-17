// @vitest-environment node
// Claude text provider tests with a fake fetch: SDK request shape, error mapping, retries, key check.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { create_claude_text } from './claude_text';
import { ProviderError, type ProviderErrorKind } from './types';
import type { StorySeed } from '../types';

/** Fake key, not a real one. */
const TEST_KEY = 'sk-ant-' + 'test-fake-A1b2';
const OPUS = 'claude-opus-5-5';
const SONNET = 'claude-sonnet-5-5';
const HAIKU = 'claude-haiku-5-5';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
/** Message Claude returns with a 401 when the organization has disabled browser access. */
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

function pages_text(count: number): string {
  return JSON.stringify({ pages: Array.from({ length: count }, (_, i) => ({ text: `글${i}`, image_prompt: `그림${i}` })) });
}

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

/** Builds an error response; x-should-retry stops the SDK from retrying on its own. */
function error_response(status: number, error_type: string, extra: Record<string, string> = {}, message = 'x'): Response {
  return new Response(JSON.stringify({ type: 'error', error: { type: error_type, message } }), {
    status,
    headers: { 'content-type': 'application/json', 'x-should-retry': 'false', ...extra },
  });
}

type FetchMock = ReturnType<typeof vi.fn>;

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

/** Reads the URL, headers (lowercased names), and body of the nth request. */
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

/** Asserts the key is in a header. This SDK version sends Authorization: Bearer; older ones sent x-api-key. */
function expect_key_header(headers: Record<string, string>): void {
  const sent = headers['x-api-key'] ?? headers.authorization?.replace(/^Bearer /, '');
  expect(sent).toBe(TEST_KEY);
}

/** Collects every object node in a schema. */
function collect_objects(node: unknown, found: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(node)) node.forEach((item) => collect_objects(item, found));
  else if (typeof node === 'object' && node !== null) {
    const record = node as Record<string, unknown>;
    if (record.type === 'object') found.push(record);
    Object.values(record).forEach((value) => collect_objects(value, found));
  }
  return found;
}

/** Asserts that a plot request fails with the given error kind. */
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

describe('Claude text request shape', () => {
  it('sends URL, key header, json_schema format, and strict schema (no fallbacks for haiku)', async () => {
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

  it.each([OPUS, SONNET])('%s sends fallbacks and the beta header', async (model) => {
    const mock = stub_fetch(message_response(PLOTS_TEXT, 'end_turn', model));
    await create_claude_text(TEST_KEY, model).suggestPlots(SEED, 'ko');
    const { headers, body } = read_call(mock, 0);
    expect(body.fallbacks).toBe('default');
    expect(headers['anthropic-beta']).toContain(FALLBACK_BETA);
  });
});

describe('Claude ask AI for help', () => {
  it('sends the assist prompt with a strict title/summary schema and reads the plot', async () => {
    const mock = stub_fetch(message_response('{"title":"곰의 하루","summary":"곰이 걷는다."}', 'end_turn', HAIKU));
    const result = await create_claude_text(TEST_KEY, HAIKU).assist({ kind: 'plot', lang: 'ko', seed: SEED, current: '', current_title: '' });
    expect(result).toEqual({ title: '곰의 하루', summary: '곰이 걷는다.' });
    const { url, headers, body } = read_call(mock, 0);
    expect(url.startsWith(MESSAGES_URL)).toBe(true);
    expect_key_header(headers);
    expect(JSON.stringify(body.messages)).toContain('제목(title)');
    expect(typeof body.system).toBe('string');
    const schema = (body.output_config as { format: { schema: unknown } }).format.schema;
    expect(JSON.stringify(schema)).toContain('summary');
    for (const item of collect_objects(schema)) expect(item.additionalProperties).toBe(false);
  });
});

describe('Claude response parsing and retry', () => {
  it('page split: finishes in one call when the page count matches', async () => {
    const mock = stub_fetch(message_response(pages_text(PAGE_COUNT)));
    const pages = await create_claude_text(TEST_KEY, OPUS).splitIntoPages(PLOT, SEED, 'ko');
    expect(pages).toHaveLength(PAGE_COUNT);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('retries once on a wrong page count', async () => {
    const mock = stub_fetch(message_response(pages_text(PAGE_COUNT - 1)), message_response(pages_text(PAGE_COUNT)));
    const pages = await create_claude_text(TEST_KEY, OPUS).splitIntoPages(PLOT, SEED, 'ko');
    expect(pages).toHaveLength(PAGE_COUNT);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('is unknown after two malformed responses', async () => {
    await expect_plot_error([message_response('not json'), message_response('still not')], 'unknown');
  });
});

describe('Claude error mapping', () => {
  it('stop_reason refusal is blocked', async () => {
    await expect_plot_error([message_response('', 'refusal')], 'blocked');
  });

  it('401 is bad_key', async () => {
    await expect_plot_error([error_response(401, 'authentication_error')], 'bad_key');
  });

  it('401 with the CORS-blocked message is browser_blocked, not bad_key', async () => {
    await expect_plot_error([error_response(401, 'authentication_error', {}, BROWSER_BLOCKED_MESSAGE)], 'browser_blocked');
  });

  it('403 is no_permission', async () => {
    await expect_plot_error([error_response(403, 'permission_error')], 'no_permission');
  });

  it('429 is rate with a retry time', async () => {
    const before = Date.now();
    const error = await expect_plot_error(
      [error_response(429, 'rate_limit_error', { 'retry-after': String(RETRY_AFTER_SECONDS) })],
      'rate',
    );
    expect(error.retry_at).not.toBeNull();
    expect(Math.abs((error.retry_at ?? 0) - (before + RETRY_AFTER_SECONDS * MS_PER_SECOND))).toBeLessThan(RATE_TOLERANCE_MS);
  });

  it('a throwing fetch is network', async () => {
    // The SDK may retry connection errors, so queue enough of them.
    await expect_plot_error([new TypeError('fail'), new TypeError('fail'), new TypeError('fail')], 'network');
  });
});

describe('Claude key check', () => {
  it('is ok when the model list succeeds, with the key only in a header', async () => {
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

  it('401 is bad_key', async () => {
    stub_fetch(error_response(401, 'authentication_error'));
    expect(await create_claude_text(TEST_KEY, OPUS).testConnection()).toEqual({ ok: false, reason: 'bad_key' });
  });

  it('401 with the CORS-blocked message is browser_blocked', async () => {
    stub_fetch(error_response(401, 'authentication_error', {}, BROWSER_BLOCKED_MESSAGE));
    expect(await create_claude_text(TEST_KEY, HAIKU).testConnection()).toEqual({ ok: false, reason: 'browser_blocked' });
  });
});

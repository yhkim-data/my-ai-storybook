// Keyless live CORS check: sends each provider's real URL and headers, with an empty key, to the real servers.
// Any HTTP status passes; a failed request (blocked at the CORS preflight) fails.
// Fake-network tests skip the preflight, so this test is needed. With no key it costs nothing.
import { expect, test, type Page } from '@playwright/test';
import { create_claude_text } from '../src/providers/claude_text';
import { create_gemini_image } from '../src/providers/gemini_image';
import { create_gemini_text } from '../src/providers/gemini_text';
import { create_openai_image } from '../src/providers/openai_image';
import { create_openai_text } from '../src/providers/openai_text';
import { PROVIDER_INFO } from '../src/providers/provider_kinds';
import type { ImageRequest } from '../src/providers/types';
import type { StorySeed } from '../src/types';
import { open_start } from './helpers';

/** Runs in one project only, since it calls real servers. */
const LIVE_PROJECT = 'tablet';
/** Used only while capturing; replaced with an empty string before sending to the real server. */
const KEY_PLACEHOLDER = 'KEYLESS-PLACEHOLDER';
/** The browser sets these itself, so they are not forwarded. */
const BROWSER_OWNED_HEADERS = ['content-length', 'user-agent', 'host', 'connection', 'accept-encoding'];
const LIVE_WAIT_MS = 60_000;
/** Retries cover brief network drops; a request blocked at preflight fails every time anyway. */
const LIVE_RETRIES = 2;
const MIN_HTTP_STATUS = 100;
const MAX_HTTP_STATUS = 599;

interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

interface LiveResult {
  status: number | null;
  error: string;
}

const SEED = {
  topic: 'adventure',
  hero_name: '토리',
  hero_look: '빨간 목도리를 한 작은 여우',
  age_band: '8-10',
  page_count: 4,
} as unknown as StorySeed;

const IMAGE_REQUEST: ImageRequest = {
  description: '숲속 오솔길을 걷는 작은 여우',
  style_id: 'watercolor' as ImageRequest['style_id'],
  custom_style: '',
  hero_card: '빨간 목도리를 한 작은 여우',
  reference_image: null,
  page_index: 1,
  lang: 'ko',
};

/** Captures the first request a provider call would send, without sending it. */
async function capture_request(run: () => Promise<unknown>): Promise<CapturedRequest> {
  const captured: CapturedRequest[] = [];
  const original_fetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const headers: Record<string, string> = {};
    request.headers.forEach((value, name) => {
      if (!BROWSER_OWNED_HEADERS.includes(name)) headers[name] = value.split(KEY_PLACEHOLDER).join('');
    });
    captured.push({ url: request.url, method: request.method, headers, body: request.method === 'GET' ? null : await request.text() });
    throw new TypeError('captured');
  };
  try {
    await run();
  } catch {
    // Expected: fetch was cut off after capture, so the provider throws.
  } finally {
    globalThis.fetch = original_fetch;
  }
  const first = captured[0];
  if (!first) throw new Error('연결부가 요청을 보내지 않았습니다');
  return first;
}

/** Sends the captured request from the browser to the real server and returns the HTTP status. */
async function send_from_browser(page: Page, request: CapturedRequest): Promise<LiveResult> {
  return page.evaluate(async ({ url, method, headers, body }) => {
    try {
      const response = await fetch(url, { method, headers, body: body ?? undefined });
      return { status: response.status, error: '' };
    } catch (cause) {
      return { status: null, error: String(cause) };
    }
  }, request);
}

const LIVE_CALLS: { name: string; run: () => Promise<unknown> }[] = [
  { name: 'Gemini key check', run: () => create_gemini_text(KEY_PLACEHOLDER, PROVIDER_INFO.gemini.text_model).testConnection() },
  { name: 'Gemini text', run: () => create_gemini_text(KEY_PLACEHOLDER, PROVIDER_INFO.gemini.text_model).suggestPlots(SEED, 'ko') },
  { name: 'Gemini image', run: () => create_gemini_image(KEY_PLACEHOLDER, PROVIDER_INFO.gemini.image_model ?? '').generate(IMAGE_REQUEST) },
  { name: 'Claude key check', run: () => create_claude_text(KEY_PLACEHOLDER, PROVIDER_INFO.claude.text_model).testConnection() },
  { name: 'Claude text', run: () => create_claude_text(KEY_PLACEHOLDER, PROVIDER_INFO.claude.text_model).suggestPlots(SEED, 'ko') },
  { name: 'Claude text (model with fallbacks)', run: () => create_claude_text(KEY_PLACEHOLDER, 'claude-opus-5-5').suggestPlots(SEED, 'ko') },
  { name: 'OpenAI key check', run: () => create_openai_text(KEY_PLACEHOLDER, PROVIDER_INFO.openai.text_model).testConnection() },
  { name: 'OpenAI text', run: () => create_openai_text(KEY_PLACEHOLDER, PROVIDER_INFO.openai.text_model).suggestPlots(SEED, 'ko') },
  { name: 'OpenAI image', run: () => create_openai_image(KEY_PLACEHOLDER, PROVIDER_INFO.openai.image_model ?? '').generate(IMAGE_REQUEST) },
];

test.describe('Keyless browser calls to the real servers', () => {
  // Serial because each test temporarily replaces the global fetch in the worker.
  test.describe.configure({ mode: 'serial', retries: LIVE_RETRIES });

  for (const call of LIVE_CALLS) {
    test(`${call.name}: the browser request reaches the server and gets an HTTP status`, async ({ page }, test_info) => {
      test.skip(test_info.project.name !== LIVE_PROJECT, 'Live server tests run in one viewport only');
      test.setTimeout(LIVE_WAIT_MS * 2);
      const request = await capture_request(call.run);
      expect(JSON.stringify(request.headers)).not.toContain(KEY_PLACEHOLDER);
      await open_start(page, 'ko');
      const result = await send_from_browser(page, request);
      test_info.annotations.push({ type: 'live', description: `${request.method} ${request.url} → ${result.status ?? result.error}` });
      expect(result.error, `${request.url} 머리글: ${Object.keys(request.headers).join(', ')}`).toBe('');
      expect(result.status).toBeGreaterThanOrEqual(MIN_HTTP_STATUS);
      expect(result.status).toBeLessThanOrEqual(MAX_HTTP_STATUS);
    });
  }
});

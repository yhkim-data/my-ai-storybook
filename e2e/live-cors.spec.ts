// 키 없이 도는 브라우저 호출 검사: 세 회사 연결부가 실제로 보내는 주소와 머리글 그대로, 키 값만 빈 문자열로 해서
// 실제 서버에 보낸다. HTTP 상태를 읽으면 통과이고, 요청 자체가 실패하면(브라우저의 사전 확인에서 막히면) 실패다.
// 가짜 네트워크 검사는 사전 확인(CORS)을 거치지 않으므로 이 검사가 따로 필요하다. 키가 없어서 돈이 들지 않는다.
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

/** 이 검사를 돌리는 화면 크기 (실제 서버를 부르므로 한 번만 돈다) */
const LIVE_PROJECT = 'tablet';
/** 요청을 기록할 때만 쓰는 자리 표시 글자. 실제 서버로 보내기 전에 빈 문자열로 바꾼다. */
const KEY_PLACEHOLDER = 'KEYLESS-PLACEHOLDER';
/** 브라우저가 스스로 정하므로 넘기지 않는 머리글 */
const BROWSER_OWNED_HEADERS = ['content-length', 'user-agent', 'host', 'connection', 'accept-encoding'];
/** 실제 서버의 응답을 기다리는 시간(ms) */
const LIVE_WAIT_MS = 60_000;
/** 인터넷이 잠깐 끊긴 경우를 위해 다시 해 보는 횟수. 사전 확인에서 막힌 요청은 다시 해도 똑같이 실패한다. */
const LIVE_RETRIES = 2;
/** HTTP 상태 범위 */
const MIN_HTTP_STATUS = 100;
const MAX_HTTP_STATUS = 599;

/** 기록한 요청 하나 */
interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

/** 브라우저에서 보낸 결과 */
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
  hero_card: '빨간 목도리를 한 작은 여우',
  reference_image: null,
  page_index: 1,
  lang: 'ko',
};

/**
 * 연결부 호출 하나가 보내려는 첫 요청을 기록한다. 실제로 보내지는 않는다.
 */
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
    // 기록만 하고 요청은 끊었으므로 연결부가 오류를 던지는 것이 맞다.
  } finally {
    globalThis.fetch = original_fetch;
  }
  const first = captured[0];
  if (!first) throw new Error('연결부가 요청을 보내지 않았습니다');
  return first;
}

/**
 * 기록한 요청을 브라우저에서 실제 서버로 보내고 HTTP 상태를 돌려준다.
 */
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

/** 검사할 호출: 이름과, 연결부를 부르는 함수 */
const LIVE_CALLS: { name: string; run: () => Promise<unknown> }[] = [
  { name: 'Gemini 키 확인', run: () => create_gemini_text(KEY_PLACEHOLDER, PROVIDER_INFO.gemini.text_model).testConnection() },
  { name: 'Gemini 글', run: () => create_gemini_text(KEY_PLACEHOLDER, PROVIDER_INFO.gemini.text_model).suggestPlots(SEED, 'ko') },
  { name: 'Gemini 그림', run: () => create_gemini_image(KEY_PLACEHOLDER, PROVIDER_INFO.gemini.image_model ?? '').generate(IMAGE_REQUEST) },
  { name: 'Claude 키 확인', run: () => create_claude_text(KEY_PLACEHOLDER, PROVIDER_INFO.claude.text_model).testConnection() },
  { name: 'Claude 글', run: () => create_claude_text(KEY_PLACEHOLDER, PROVIDER_INFO.claude.text_model).suggestPlots(SEED, 'ko') },
  { name: 'Claude 글 (이어받기 켠 종류)', run: () => create_claude_text(KEY_PLACEHOLDER, 'claude-opus-5-5').suggestPlots(SEED, 'ko') },
  { name: 'OpenAI 키 확인', run: () => create_openai_text(KEY_PLACEHOLDER, PROVIDER_INFO.openai.text_model).testConnection() },
  { name: 'OpenAI 글', run: () => create_openai_text(KEY_PLACEHOLDER, PROVIDER_INFO.openai.text_model).suggestPlots(SEED, 'ko') },
  { name: 'OpenAI 그림', run: () => create_openai_image(KEY_PLACEHOLDER, PROVIDER_INFO.openai.image_model ?? '').generate(IMAGE_REQUEST) },
];

test.describe('키 없이 실제 서버로 보내는 브라우저 호출', () => {
  // 한 작업자 안에서 전역 fetch를 잠깐 바꾸므로 차례로 돈다.
  test.describe.configure({ mode: 'serial', retries: LIVE_RETRIES });

  for (const call of LIVE_CALLS) {
    test(`${call.name}: 브라우저에서 요청이 서버까지 가고 HTTP 상태가 온다`, async ({ page }, test_info) => {
      test.skip(test_info.project.name !== LIVE_PROJECT, '실제 서버를 부르는 검사는 한 화면 크기에서만 돕니다');
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

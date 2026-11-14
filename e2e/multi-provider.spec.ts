// 여러 AI 회사 연결 검사: Claude·OpenAI 모양의 가짜 키로 연결 확인부터 줄거리·쪽 나누기·그림까지 가짜 네트워크로 본다.
// 검사용 가짜 키만 쓴다. 실제 키가 아니다.
import { expect, test, type Page, type Route } from '@playwright/test';
import {
  SETTINGS_KEY,
  TINY_PNG_BASE64,
  choose_first_plot,
  fill_seed,
  open_start,
  pass_pages,
  pass_style,
  start_new_book,
  tr,
  type Lang,
} from './helpers';

const LANG: Lang = 'ko';
/** 검사용 가짜 키. 끝 4자리는 A1b2 */
const CLAUDE_KEY = 'sk-ant-' + 'test-fake-A1b2';
const OPENAI_KEY = 'sk-' + 'test-fake-A1b2';
const KEY_TAIL = 'A1b2';
const CLAUDE_ORIGIN = 'https://api.anthropic.com';
const OPENAI_ORIGIN = 'https://api.openai.com';
const FAKE_PLOT_COUNT = 3;
const PAGE_COUNT = 4;
const FALLBACK_PAGE_COUNT = 8;
const OPENAI_IMAGE_MODEL = 'gpt-image-2.6-flare';
/** 가짜 응답에 붙이는 CORS 머리글. Authorization 은 '*' 에 들지 않으므로 따로 적는다. */
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-api-key, anthropic-version, anthropic-beta, *',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

/** 가로챈 요청 기록 */
interface RecordedRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | null;
}

/**
 * 요청 본문에서 쪽 나누기라면 본문 쪽수를, 줄거리 요청이면 null을 돌려준다.
 */
function read_requested_page_count(body: Record<string, unknown>): number | null {
  const output_format = (body.output_config as { format?: { schema?: unknown } } | undefined)?.format;
  const text_format = (body.text as { format?: { schema?: unknown } } | undefined)?.format;
  const schema = (output_format?.schema ?? text_format?.schema) as { properties?: Record<string, unknown> } | undefined;
  if (!schema?.properties || !('pages' in schema.properties)) return null;
  const match = /본문 쪽수: (\d+)쪽/.exec(JSON.stringify(body));
  return match ? Number(match[1]) : FALLBACK_PAGE_COUNT;
}

/**
 * 가짜 글(JSON 글)을 만든다.
 */
function fake_text_json(page_count: number | null): string {
  if (page_count === null) {
    const plots = Array.from({ length: FAKE_PLOT_COUNT }, (_, index) => ({
      title: `가짜 줄거리 ${index + 1}`,
      summary: `가짜 네트워크가 준 줄거리 ${index + 1}입니다.`,
    }));
    return JSON.stringify({ plots });
  }
  const pages = Array.from({ length: page_count }, (_, index) => ({
    text: `가짜 ${index + 1}쪽 글`,
    image_prompt: `가짜 ${index + 1}쪽 그림 설명`,
  }));
  return JSON.stringify({ pages });
}

/**
 * 요청을 기록하고 OPTIONS 사전 요청은 바로 답한다. 사전 요청이면 null을 돌려준다.
 */
async function record_request(route: Route, requests: RecordedRequest[]): Promise<RecordedRequest | null> {
  const request = route.request();
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return null;
  }
  const raw_body = request.postData();
  const recorded: RecordedRequest = {
    method: request.method(),
    path: new URL(request.url()).pathname,
    headers: await request.allHeaders(),
    body: raw_body ? (JSON.parse(raw_body) as Record<string, unknown>) : null,
  };
  requests.push(recorded);
  return recorded;
}

/**
 * JSON 응답을 보낸다.
 */
function reply_json(route: Route, status: number, data: unknown) {
  return route.fulfill({ status, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(data) });
}

/**
 * Claude 주소로 가는 요청을 가로채는 가짜 네트워크를 켠다.
 */
async function install_fake_claude(page: Page): Promise<RecordedRequest[]> {
  const requests: RecordedRequest[] = [];
  await page.route(`${CLAUDE_ORIGIN}/**`, async (route) => {
    const recorded = await record_request(route, requests);
    if (!recorded) return;
    if (recorded.method === 'GET' && recorded.path === '/v1/models') {
      await reply_json(route, 200, { data: [], has_more: false, first_id: null, last_id: null });
      return;
    }
    if (recorded.method === 'POST' && recorded.path === '/v1/messages') {
      const text = fake_text_json(recorded.body ? read_requested_page_count(recorded.body) : null);
      await reply_json(route, 200, {
        id: 'msg_x',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [{ type: 'text', text }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 1, output_tokens: 1 },
      });
      return;
    }
    await reply_json(route, 404, { type: 'error', error: { type: 'not_found_error', message: 'x' } });
  });
  return requests;
}

/**
 * OpenAI 주소로 가는 요청을 가로채는 가짜 네트워크를 켠다.
 */
async function install_fake_openai(page: Page): Promise<RecordedRequest[]> {
  const requests: RecordedRequest[] = [];
  await page.route(`${OPENAI_ORIGIN}/**`, async (route) => {
    const recorded = await record_request(route, requests);
    if (!recorded) return;
    if (recorded.method === 'GET' && recorded.path === '/v1/models') {
      await reply_json(route, 200, { data: [] });
      return;
    }
    if (recorded.method === 'POST' && recorded.path === '/v1/responses') {
      const text = fake_text_json(recorded.body ? read_requested_page_count(recorded.body) : null);
      await reply_json(route, 200, { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] });
      return;
    }
    if (recorded.method === 'POST' && recorded.path === '/v1/images/generations') {
      await reply_json(route, 200, { data: [{ b64_json: TINY_PNG_BASE64 }] });
      return;
    }
    await reply_json(route, 404, { error: { code: 'not_found', message: 'x' } });
  });
  return requests;
}

/**
 * 연결 화면에서 키를 넣고 확인해 "○○에 연결됐어요" 안내가 뜨는지 본다.
 */
async function connect_with_key(page: Page, key: string, name: string): Promise<void> {
  await page.getByRole('button', { name: tr(LANG, 'start.connect') }).click();
  await page.locator('#key-input').fill(key);
  await page.getByRole('button', { name: tr(LANG, 'connect.check'), exact: true }).click();
  await expect(page.getByText(tr(LANG, 'connect.ok', { name, tail: KEY_TAIL }))).toBeVisible();
  expect(await read_saved_text_key(page)).toBe(key);
  await page.getByRole('button', { name: tr(LANG, 'common.home') }).click();
}

/**
 * 저장된 글용 키를 읽는다.
 */
async function read_saved_text_key(page: Page): Promise<string> {
  return page.evaluate((settings_key) => {
    try {
      return (JSON.parse(localStorage.getItem(settings_key) ?? '{}') as { text_key?: string }).text_key ?? '';
    } catch {
      return '';
    }
  }, SETTINGS_KEY);
}

/**
 * 새 책을 시작해 줄거리 3개를 보고 하나를 골라 쪽 나누기 글이 오기까지 간다.
 */
async function walk_to_pages(page: Page): Promise<void> {
  await start_new_book(page, LANG);
  await fill_seed(page, LANG, { page_count: PAGE_COUNT });
  const cards = page.locator('button.card.selectable');
  await expect(cards).toHaveCount(FAKE_PLOT_COUNT);
  await expect(cards.first()).toContainText('가짜 줄거리 1');
  await choose_first_plot(page, LANG);
  await expect(page.locator('#page-text-1')).toHaveValue('가짜 1쪽 글');
  await expect(page.locator(`#page-text-${PAGE_COUNT}`)).toHaveValue(`가짜 ${PAGE_COUNT}쪽 글`);
  await pass_pages(page, LANG);
  await pass_style(page, LANG);
}

/**
 * 모든 요청이 키를 주소나 본문에 싣지 않았는지 본다.
 */
function expect_key_not_leaked(requests: RecordedRequest[], key: string): void {
  expect(requests.length).toBeGreaterThan(0);
  for (const request of requests) {
    expect(request.path).not.toContain(key);
    expect(JSON.stringify(request.body)).not.toContain(key);
  }
}

test.describe('여러 AI 회사 연결(가짜 네트워크)', () => {
  test('Claude 키: 연결 확인, 줄거리, 쪽 나누기까지 되고 그림은 연결 안내가 뜬다', async ({ page }) => {
    test.slow();
    const requests = await install_fake_claude(page);
    await open_start(page, LANG);
    await connect_with_key(page, CLAUDE_KEY, 'Claude');
    await walk_to_pages(page);

    // 키는 머리글에만 있다 (이 SDK 판은 Authorization, 옛 판은 x-api-key).
    const messages = requests.filter((request) => request.method === 'POST' && request.path === '/v1/messages');
    expect(messages).toHaveLength(2);
    for (const request of messages) {
      const sent = request.headers['x-api-key'] ?? request.headers.authorization?.replace(/^Bearer /, '');
      expect(sent).toBe(CLAUDE_KEY);
    }
    expect_key_not_leaked(requests, CLAUDE_KEY);

    // 그림: Claude는 그림을 못 만들므로 연결 안내가 뜬다.
    await page.getByRole('button', { name: tr(LANG, 'pictures.ai.title') }).dispatchEvent('click');
    await expect(page.getByText(tr(LANG, 'pictures.need_connect'))).toBeVisible();
  });

  test('OpenAI 키: 연결 확인, 줄거리, 쪽 나누기, 그림 한 장이 된다', async ({ page }) => {
    test.slow();
    const requests = await install_fake_openai(page);
    await open_start(page, LANG);
    await connect_with_key(page, OPENAI_KEY, 'OpenAI');
    await walk_to_pages(page);

    await page.getByRole('button', { name: tr(LANG, 'pictures.ai.title') }).dispatchEvent('click');
    await expect(page.locator('.pic-frame img')).toBeAttached();

    for (const request of requests) {
      expect(request.headers.authorization).toBe(`Bearer ${OPENAI_KEY}`);
    }
    expect_key_not_leaked(requests, OPENAI_KEY);
    const responses = requests.filter((request) => request.path === '/v1/responses');
    expect(responses).toHaveLength(2);
    for (const request of responses) expect(request.body?.store).toBe(false);
    const images = requests.filter((request) => request.path === '/v1/images/generations');
    expect(images).toHaveLength(1);
    expect(images[0]?.body?.model).toBe(OPENAI_IMAGE_MODEL);
  });
});

// Claude and OpenAI providers over a fake network: key check, plots, page split and pictures.
// Uses fake test keys only.
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
/** Fake keys ending in A1b2, split so the secret scanner does not flag them. */
const CLAUDE_KEY = 'sk-ant-' + 'test-fake-A1b2';
const OPENAI_KEY = 'sk-' + 'test-fake-A1b2';
const KEY_TAIL = 'A1b2';
const CLAUDE_ORIGIN = 'https://api.anthropic.com';
const OPENAI_ORIGIN = 'https://api.openai.com';
const FAKE_PLOT_COUNT = 3;
const PAGE_COUNT = 4;
const FALLBACK_PAGE_COUNT = 8;
const OPENAI_IMAGE_MODEL = 'gpt-image-2.6-flare';
/** Authorization is not covered by the '*' wildcard, so it is listed explicitly. */
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-api-key, anthropic-version, anthropic-beta, *',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

interface RecordedRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | null;
}

/** Returns the requested page count for a page-split request, or null for a plot request. */
function read_requested_page_count(body: Record<string, unknown>): number | null {
  const output_format = (body.output_config as { format?: { schema?: unknown } } | undefined)?.format;
  const text_format = (body.text as { format?: { schema?: unknown } } | undefined)?.format;
  const schema = (output_format?.schema ?? text_format?.schema) as { properties?: Record<string, unknown> } | undefined;
  if (!schema?.properties || !('pages' in schema.properties)) return null;
  const match = /본문 쪽수: (\d+)쪽/.exec(JSON.stringify(body));
  return match ? Number(match[1]) : FALLBACK_PAGE_COUNT;
}

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

/** Records the request. Answers OPTIONS preflights directly and returns null for them. */
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

function reply_json(route: Route, status: number, data: unknown) {
  return route.fulfill({ status, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(data) });
}

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

/** Enters and checks the key on the connect screen, expecting the "connected to <name>" message. */
async function connect_with_key(page: Page, key: string, name: string): Promise<void> {
  await page.getByRole('button', { name: tr(LANG, 'start.connect') }).click();
  await page.locator('#key-input').fill(key);
  await page.getByRole('button', { name: tr(LANG, 'connect.check'), exact: true }).click();
  await expect(page.getByText(tr(LANG, 'connect.ok', { name, tail: KEY_TAIL }))).toBeVisible();
  expect(await read_saved_text_key(page)).toBe(key);
  await page.getByRole('button', { name: tr(LANG, 'common.home') }).click();
}

async function read_saved_text_key(page: Page): Promise<string> {
  return page.evaluate((settings_key) => {
    try {
      return (JSON.parse(localStorage.getItem(settings_key) ?? '{}') as { text_key?: string }).text_key ?? '';
    } catch {
      return '';
    }
  }, SETTINGS_KEY);
}

/** Starts a new book, checks the 3 plots, picks one, and goes past the page-split screen. */
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

/** No request may carry the key in its path or body. */
function expect_key_not_leaked(requests: RecordedRequest[], key: string): void {
  expect(requests.length).toBeGreaterThan(0);
  for (const request of requests) {
    expect(request.path).not.toContain(key);
    expect(JSON.stringify(request.body)).not.toContain(key);
  }
}

test.describe('Multiple AI providers (fake network)', () => {
  test('Claude key: key check, plots and page split work; pictures show the connect prompt', async ({ page }) => {
    test.slow();
    const requests = await install_fake_claude(page);
    await open_start(page, LANG);
    await connect_with_key(page, CLAUDE_KEY, 'Claude');
    await walk_to_pages(page);

    // The key is only in a header: Authorization in this SDK version, x-api-key in older ones.
    const messages = requests.filter((request) => request.method === 'POST' && request.path === '/v1/messages');
    expect(messages).toHaveLength(2);
    for (const request of messages) {
      const sent = request.headers['x-api-key'] ?? request.headers.authorization?.replace(/^Bearer /, '');
      expect(sent).toBe(CLAUDE_KEY);
    }
    expect_key_not_leaked(requests, CLAUDE_KEY);

    // Claude cannot make images, so the connect prompt appears.
    await page.getByRole('button', { name: tr(LANG, 'pictures.ai.title') }).dispatchEvent('click');
    await expect(page.getByText(tr(LANG, 'pictures.need_connect'))).toBeVisible();
  });

  test('OpenAI key: key check, plots, page split and one picture work', async ({ page }) => {
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

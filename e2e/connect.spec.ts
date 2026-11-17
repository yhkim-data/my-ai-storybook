// Connect screen and the real provider code, with provider requests intercepted by a fake network.
// Uses fake test keys only, never real key formats.
import { expect, test, type Page } from '@playwright/test';
import {
  SETTINGS_KEY,
  TINY_PNG_BASE64,
  choose_first_plot,
  exact_button,
  fill_seed,
  flip_pages,
  open_start,
  open_story_page,
  pass_editor,
  pass_pages,
  pass_pictures,
  pass_style,
  read_saved_text_key,
  start_new_book,
  tr,
  type Lang,
} from './helpers';

const LANG: Lang = 'ko';
/** Fake test key ending in A1b2. */
const GOOD_KEY = 'test-good-key-A1b2';
const GOOD_KEY_TAIL = 'A1b2';
/** The fake key does not start with sk-, so the app treats it as a Gemini key. */
const GOOD_KEY_NAME = 'Google Gemini';
const BAD_KEY = 'test-bad-key-Z9y8';
const PROVIDER_ORIGIN = 'https://generativelanguage.googleapis.com';
const PROVIDER_HOST = 'generativelanguage.googleapis.com';
const APP_HOST = 'localhost:4173';
const FAKE_PLOT_COUNT = 3;
const PAGE_COUNT = 4;
/** Used when the page count cannot be read from a page-split request. */
const FALLBACK_PAGE_COUNT = 8;
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};
/** One plot request, one page-split request, one picture request. */
const EXPECTED_INTERACTION_COUNT = 3;

interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | null;
}

interface FakeGemini {
  requests: RecordedRequest[];
  /** When true, later text and image requests get a daily-quota error (429). */
  set_quota: (on: boolean) => void;
}

/**
 * Returns the requested page count for a page-split request, or null for a plot request.
 * Plot prompts also mention the page count, so tell them apart by the schema's property names first.
 */
function read_requested_page_count(body: Record<string, unknown>): number | null {
  const format = body.response_format as { schema?: { properties?: Record<string, { minItems?: number }> } } | undefined;
  const properties = format?.schema?.properties ?? {};
  if (!('pages' in properties)) return null;
  const from_schema = properties.pages?.minItems;
  if (typeof from_schema === 'number') return from_schema;
  const input = typeof body.input === 'string' ? body.input : '';
  const match = /본문 쪽수: (\d+)쪽/.exec(input);
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

/** Intercepts every request to the Gemini origin and answers with fake responses. */
async function install_fake_gemini(page: Page): Promise<FakeGemini> {
  const requests: RecordedRequest[] = [];
  let is_quota = false;
  await page.route(`${PROVIDER_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    const headers = await request.allHeaders();
    const raw_body = request.postData();
    const body = raw_body ? (JSON.parse(raw_body) as Record<string, unknown>) : null;
    requests.push({ method, url: request.url(), headers, body });
    const json = (status: number, data: unknown) =>
      route.fulfill({ status, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(data) });

    if (method === 'GET' && url.pathname === '/v1beta/models') {
      if (headers['x-goog-api-key'] === GOOD_KEY) await json(200, { models: [] });
      else await json(401, { error: { code: 'authentication', message: 'bad key' } });
      return;
    }
    if (method === 'POST' && url.pathname === '/v1beta/interactions') {
      if (is_quota) {
        await json(429, { error: { code: 'quota_exceeded' } });
        return;
      }
      const format = (body?.response_format ?? {}) as { type?: string };
      if (format.type === 'image') {
        await json(200, {
          status: 'completed',
          steps: [{ type: 'model_output', content: [{ type: 'image', data: TINY_PNG_BASE64, mime_type: 'image/png' }] }],
        });
        return;
      }
      const text = fake_text_json(body ? read_requested_page_count(body) : null);
      await json(200, { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text }] }] });
      return;
    }
    await json(404, { error: { code: 'not_found' } });
  });
  return {
    requests,
    set_quota: (on: boolean) => {
      is_quota = on;
    },
  };
}

/** Starts with the good fake key already saved. Must be called before open_start. */
async function preset_good_key(page: Page): Promise<void> {
  await page.addInitScript(
    ([settings_key, key]) => {
      try {
        if (!localStorage.getItem(settings_key as string)) {
          localStorage.setItem(settings_key as string, JSON.stringify({ lang: 'ko', text_key: key }));
        }
      } catch {
        // Without storage the app starts with no key.
      }
    },
    [SETTINGS_KEY, GOOD_KEY],
  );
}

/** The full key must not appear in page text or in any input value. */
async function expect_key_hidden(page: Page): Promise<void> {
  const shown = await page.evaluate(() => ({
    text: document.body.innerText,
    values: Array.from(document.querySelectorAll('input, textarea')).map((element) => (element as HTMLInputElement).value),
  }));
  expect(shown.text).not.toContain(GOOD_KEY);
  for (const value of shown.values) expect(value).not.toContain(GOOD_KEY);
}

test.describe('Connect AI', () => {
  test('enter, check, clear and skip a key, with on-screen guidance', async ({ page }) => {
    await install_fake_gemini(page);
    await open_start(page, LANG);
    await expect(page.locator('.pill', { hasText: tr(LANG, 'start.connect.off') })).toBeVisible();
    await page.getByRole('button', { name: tr(LANG, 'start.connect') }).click();
    const check = page.getByRole('button', { name: tr(LANG, 'connect.check'), exact: true });
    const key_input = page.locator('#key-input');

    await check.click();
    await expect(page.getByText(tr(LANG, 'connect.empty'))).toBeVisible();

    // Wrong key: message shown, nothing saved.
    await key_input.fill(BAD_KEY);
    await check.click();
    await expect(page.getByText('키가 맞지 않아요. 다시 복사해 볼까요?')).toBeVisible();
    expect(await read_saved_text_key(page)).toBe('');

    // Good key: only the last 4 characters are shown.
    await key_input.fill(GOOD_KEY);
    await check.click();
    await expect(page.getByText(tr(LANG, 'connect.ok', { name: GOOD_KEY_NAME, tail: GOOD_KEY_TAIL }))).toBeVisible();
    await expect_key_hidden(page);
    expect(await read_saved_text_key(page)).toBe(GOOD_KEY);

    await exact_button(page, tr(LANG, 'common.home')).click();
    await expect(page.locator('.pill.ok', { hasText: tr(LANG, 'start.connect.on') })).toBeVisible();
    await expect_key_hidden(page);

    // Reopening shows the saved key tail, today's usage, the age note and the shared-device note.
    await page.getByRole('button', { name: tr(LANG, 'start.connect') }).click();
    await expect(page.getByText(tr(LANG, 'connect.saved_tail', { name: GOOD_KEY_NAME, tail: GOOD_KEY_TAIL }))).toBeVisible();
    await expect(page.getByTestId('usage-line')).toContainText('오늘 쓴 횟수');
    await expect(page.getByTestId('usage-line')).toContainText(tr(LANG, 'connect.shared_line'));
    await expect(page.getByText(tr(LANG, 'connect.age_line'))).toBeVisible();
    await expect_key_hidden(page);

    // Advanced settings start collapsed; expanding shows the model picker.
    await expect(page.locator('#text-model-select')).toBeHidden();
    await page.locator('summary').click();
    await expect(page.locator('#text-model-select')).toBeVisible();

    await page.getByRole('button', { name: tr(LANG, 'connect.clear'), exact: true }).click();
    expect(await read_saved_text_key(page)).toBe('');
    await page.getByRole('button', { name: tr(LANG, 'connect.skip'), exact: true }).click();
    await expect(page.getByRole('button', { name: tr(LANG, 'start.new.title') })).toBeVisible();
    await expect(page.locator('.pill', { hasText: '아직 연결 안 됨' })).toBeVisible();
  });
});

test.describe('Real provider (fake network)', () => {
  test('a good key gets plots, pages and a picture, and the AI notice is added', async ({ page }) => {
    test.slow();
    const fake = await install_fake_gemini(page);
    const all_urls: string[] = [];
    page.on('request', (request) => all_urls.push(request.url()));

    await preset_good_key(page);
    await open_start(page, LANG);
    await expect(page.locator('.pill.ok', { hasText: tr(LANG, 'start.connect.on') })).toBeVisible();
    await start_new_book(page, LANG);
    await fill_seed(page, LANG, { page_count: PAGE_COUNT });

    const cards = page.locator('button.card.selectable');
    await expect(cards).toHaveCount(FAKE_PLOT_COUNT);
    await expect(cards.first()).toContainText('가짜 줄거리 1');
    await choose_first_plot(page, LANG);

    // Page split returns text for the requested page count.
    await expect(page.locator('#page-text-1')).toHaveValue('가짜 1쪽 글');
    await open_story_page(page, PAGE_COUNT);
    await expect(page.locator(`#page-text-${PAGE_COUNT}`)).toHaveValue(`가짜 ${PAGE_COUNT}쪽 글`);
    await pass_pages(page, LANG);
    await pass_style(page, LANG);

    await page.getByRole('button', { name: tr(LANG, 'pictures.ai.title') }).dispatchEvent('click');
    await expect(page.locator('.pic-frame img')).toBeAttached();
    await pass_pictures(page, LANG);
    await pass_editor(page, LANG);

    // AI notice on the credits page
    await flip_pages(page, LANG, PAGE_COUNT + 1);
    await expect(page.getByTestId('ai-notice')).toHaveText('그림 일부는 AI(gemini-3.1-flash-lite-image)로 만들었습니다');

    // Requests go only to the provider, the key is only in a header, and storage is off with safety settings sent.
    const hosts = new Set(
      all_urls.filter((url) => url.startsWith('http')).map((url) => new URL(url).host),
    );
    expect([...hosts].filter((host) => host !== APP_HOST && host !== PROVIDER_HOST)).toEqual([]);
    expect(fake.requests.length).toBeGreaterThan(0);
    for (const request of fake.requests) {
      expect(request.url).not.toContain(GOOD_KEY);
      expect(request.url).not.toContain(encodeURIComponent(GOOD_KEY));
      expect(request.headers['x-goog-api-key']).toBe(GOOD_KEY);
    }
    const interactions = fake.requests.filter((request) => request.method === 'POST' && request.url.endsWith('/v1beta/interactions'));
    expect(interactions).toHaveLength(EXPECTED_INTERACTION_COUNT);
    for (const request of interactions) {
      expect(request.body?.store).toBe(false);
      expect(Array.isArray(request.body?.safety_settings)).toBe(true);
      expect((request.body?.safety_settings as unknown[]).length).toBeGreaterThan(0);
    }
  });

  test('daily quota (429 quota_exceeded) shows the limit message on the plot screen', async ({ page }) => {
    const fake = await install_fake_gemini(page);
    fake.set_quota(true);
    await preset_good_key(page);
    await open_start(page, LANG);
    await start_new_book(page, LANG);
    await fill_seed(page, LANG);
    await expect(page.getByRole('alert')).toContainText('오늘 쓸 수 있는 횟수를 다 썼어요');
  });
});

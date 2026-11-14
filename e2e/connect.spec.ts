// AI 연결하기와 실제 연결부: 제공사 주소로 가는 요청을 가짜 네트워크로 가로채서 키 확인, 글·그림 만들기, 한도 오류를 본다.
// 검사용 가짜 키만 쓴다. 실제 키 모양은 쓰지 않는다.
import { expect, test, type Page } from '@playwright/test';
import {
  SETTINGS_KEY,
  TINY_PNG_BASE64,
  choose_first_plot,
  exact_button,
  fill_seed,
  flip_pages,
  open_start,
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
/** 검사용 가짜 키. 끝 4자리는 A1b2 */
const GOOD_KEY = 'test-good-key-A1b2';
const GOOD_KEY_TAIL = 'A1b2';
/** 이 가짜 키는 sk- 로 시작하지 않으므로 Gemini 키로 본다 */
const GOOD_KEY_NAME = 'Google Gemini';
const BAD_KEY = 'test-bad-key-Z9y8';
/** 제공사 주소 */
const PROVIDER_ORIGIN = 'https://generativelanguage.googleapis.com';
const PROVIDER_HOST = 'generativelanguage.googleapis.com';
const APP_HOST = 'localhost:4173';
/** 가짜 네트워크가 돌려줄 줄거리 수 */
const FAKE_PLOT_COUNT = 3;
/** 이 검사에서 고르는 본문 쪽수 */
const PAGE_COUNT = 4;
/** 쪽 나누기 요청에서 쪽수를 못 읽었을 때 쓰는 쪽수 */
const FALLBACK_PAGE_COUNT = 8;
/** 가짜 응답에 붙이는 CORS 머리글 */
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};
/** 이 검사에서 기대하는 글 요청 + 그림 요청 수 (줄거리 1, 쪽 나누기 1, 그림 1) */
const EXPECTED_INTERACTION_COUNT = 3;

/** 가로챈 요청 기록 */
interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | null;
}

/** 가짜 네트워크 제어 */
interface FakeGemini {
  requests: RecordedRequest[];
  /** true로 바꾸면 이후 글·그림 요청에 하루 한도 오류(429)를 돌려준다 */
  set_quota: (on: boolean) => void;
}

/**
 * 글 요청 본문에서 쪽 나누기라면 본문 쪽수를 읽는다. 줄거리 요청이면 null이다.
 * 줄거리 요청의 글에도 "본문 쪽수"가 들어 있으므로, 어떤 요청인지는 schema의 항목 이름으로 먼저 가른다.
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

/**
 * 가짜 글 응답(JSON 글)을 만든다.
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
 * 제공사 주소로 가는 모든 요청을 가로채는 가짜 네트워크를 켠다.
 */
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

/**
 * 맞는 가짜 키가 이미 저장된 상태로 시작하게 한다. open_start보다 먼저 불러야 한다.
 */
async function preset_good_key(page: Page): Promise<void> {
  await page.addInitScript(
    ([settings_key, key]) => {
      try {
        if (!localStorage.getItem(settings_key as string)) {
          localStorage.setItem(settings_key as string, JSON.stringify({ lang: 'ko', text_key: key }));
        }
      } catch {
        // 저장 공간을 못 쓰면 키 없이 시작한다.
      }
    },
    [SETTINGS_KEY, GOOD_KEY],
  );
}

/**
 * 키 전체 글자가 화면 글과 모든 입력 칸에 없는지 본다.
 */
async function expect_key_hidden(page: Page): Promise<void> {
  const shown = await page.evaluate(() => ({
    text: document.body.innerText,
    values: Array.from(document.querySelectorAll('input, textarea')).map((element) => (element as HTMLInputElement).value),
  }));
  expect(shown.text).not.toContain(GOOD_KEY);
  for (const value of shown.values) expect(value).not.toContain(GOOD_KEY);
}

test.describe('AI 연결하기', () => {
  test('키 넣기·확인·건너뛰기·지우기와 화면 안내', async ({ page }) => {
    await install_fake_gemini(page);
    await open_start(page, LANG);
    await expect(page.locator('.pill', { hasText: tr(LANG, 'start.connect.off') })).toBeVisible();
    await page.getByRole('button', { name: tr(LANG, 'start.connect') }).click();
    const check = page.getByRole('button', { name: tr(LANG, 'connect.check'), exact: true });
    const key_input = page.locator('#key-input');

    // 빈 칸으로 확인
    await check.click();
    await expect(page.getByText(tr(LANG, 'connect.empty'))).toBeVisible();

    // 틀린 키: 안내가 뜨고 저장되지 않는다.
    await key_input.fill(BAD_KEY);
    await check.click();
    await expect(page.getByText('키가 맞지 않아요. 다시 복사해 볼까요?')).toBeVisible();
    expect(await read_saved_text_key(page)).toBe('');

    // 맞는 키: 끝 4자리만 보인다.
    await key_input.fill(GOOD_KEY);
    await check.click();
    await expect(page.getByText(tr(LANG, 'connect.ok', { name: GOOD_KEY_NAME, tail: GOOD_KEY_TAIL }))).toBeVisible();
    await expect_key_hidden(page);
    expect(await read_saved_text_key(page)).toBe(GOOD_KEY);

    // 처음으로: "연결됨" 알약
    await exact_button(page, tr(LANG, 'common.home')).click();
    await expect(page.locator('.pill.ok', { hasText: tr(LANG, 'start.connect.on') })).toBeVisible();
    await expect_key_hidden(page);

    // 다시 열면 저장된 키 끝자리와 오늘 쓴 횟수, 나이 안내와 함께 쓰는 기기 안내가 보인다.
    await page.getByRole('button', { name: tr(LANG, 'start.connect') }).click();
    await expect(page.getByText(tr(LANG, 'connect.saved_tail', { name: GOOD_KEY_NAME, tail: GOOD_KEY_TAIL }))).toBeVisible();
    await expect(page.getByTestId('usage-line')).toContainText('오늘 쓴 횟수');
    await expect(page.getByTestId('usage-line')).toContainText(tr(LANG, 'connect.shared_line'));
    await expect(page.getByText(tr(LANG, 'connect.age_line'))).toBeVisible();
    await expect_key_hidden(page);

    // 자세한 설정은 접혀 있다가 누르면 AI 종류 고르기가 보인다.
    await expect(page.locator('#text-model-select')).toBeHidden();
    await page.locator('summary').click();
    await expect(page.locator('#text-model-select')).toBeVisible();

    // 키 지우기, 건너뛰기
    await page.getByRole('button', { name: tr(LANG, 'connect.clear'), exact: true }).click();
    expect(await read_saved_text_key(page)).toBe('');
    await page.getByRole('button', { name: tr(LANG, 'connect.skip'), exact: true }).click();
    await expect(page.getByRole('button', { name: tr(LANG, 'start.new.title') })).toBeVisible();
    await expect(page.locator('.pill', { hasText: '아직 연결 안 됨' })).toBeVisible();
  });
});

test.describe('실제 연결부(가짜 네트워크)', () => {
  test('맞는 키로 줄거리·쪽 나누기·그림이 오고 AI 표시가 들어간다', async ({ page }) => {
    test.slow();
    const fake = await install_fake_gemini(page);
    const all_urls: string[] = [];
    page.on('request', (request) => all_urls.push(request.url()));

    await preset_good_key(page);
    await open_start(page, LANG);
    await expect(page.locator('.pill.ok', { hasText: tr(LANG, 'start.connect.on') })).toBeVisible();
    await start_new_book(page, LANG);
    await fill_seed(page, LANG, { page_count: PAGE_COUNT });

    // 줄거리: 가짜 네트워크가 준 3개
    const cards = page.locator('button.card.selectable');
    await expect(cards).toHaveCount(FAKE_PLOT_COUNT);
    await expect(cards.first()).toContainText('가짜 줄거리 1');
    await choose_first_plot(page, LANG);

    // 쪽 나누기: 요청한 쪽수만큼 글이 온다.
    await expect(page.locator('#page-text-1')).toHaveValue('가짜 1쪽 글');
    await expect(page.locator(`#page-text-${PAGE_COUNT}`)).toHaveValue(`가짜 ${PAGE_COUNT}쪽 글`);
    await pass_pages(page, LANG);
    await pass_style(page, LANG);

    // 그림: AI로 만들기
    await page.getByRole('button', { name: tr(LANG, 'pictures.ai.title') }).dispatchEvent('click');
    await expect(page.locator('.pic-frame img')).toBeAttached();
    await pass_pictures(page, LANG);
    await pass_editor(page, LANG);

    // 만든 사람 쪽에 AI 표시
    await flip_pages(page, LANG, PAGE_COUNT + 1);
    await expect(page.getByTestId('ai-notice')).toHaveText('그림 일부는 AI(gemini-3.1-flash-lite-image)로 만들었습니다');

    // 요청 점검: 제공사 주소 외로 나가지 않고, 키는 머리글에만 있고, 저장을 끄고 안전 설정을 보낸다.
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

  test('하루 한도(429 quota_exceeded)면 줄거리 화면에 한도 안내가 뜬다', async ({ page }) => {
    const fake = await install_fake_gemini(page);
    fake.set_quota(true);
    await preset_good_key(page);
    await open_start(page, LANG);
    await start_new_book(page, LANG);
    await fill_seed(page, LANG);
    await expect(page.getByRole('alert')).toContainText('오늘 쓸 수 있는 횟수를 다 썼어요');
  });
});

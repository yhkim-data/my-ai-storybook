// AI usage chip in every header and its panel: practice mode, a connected (fake) key with counts, the picture limit,
// and the icon-only chip on a phone. Provider requests are answered by a fake network.
import { expect, test, type Page } from '@playwright/test';
import { TINY_PNG_BASE64, choose_first_plot, connect_key, fill_seed, go_to_pictures, open_start, pass_pages, pass_style, start_new_book, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';
const FAKE_KEY = 'test-good-key-A1b2';
const CORS_HEADERS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };

/** Answers the key check, text requests and picture requests to the Gemini origin. */
async function fake_gemini(page: Page): Promise<void> {
  await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
    const json = (data: unknown) => route.fulfill({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(data) });
    if (request.method() === 'GET') return json({ models: [] });
    const body = JSON.parse(request.postData() ?? '{}') as { response_format?: { type?: string; schema?: { properties?: Record<string, { minItems?: number }> } } };
    if (body.response_format?.type === 'image') {
      return json({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'image', data: TINY_PNG_BASE64, mime_type: 'image/png' }] }] });
    }
    const page_count = body.response_format?.schema?.properties?.pages?.minItems;
    const text = page_count
      ? JSON.stringify({ pages: Array.from({ length: page_count }, (_, index) => ({ text: `글 ${index + 1}`, image_prompt: `그림 ${index + 1}` })) })
      : JSON.stringify({ plots: [1, 2, 3].map((n) => ({ title: `줄거리 ${n}`, summary: `요약 ${n}` })) });
    return json({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text }] }] });
  });
}

const chip = (page: Page) => page.locator('.usage-chip');

test('practice mode: the chip says so on every screen, and the panel explains', async ({ page }) => {
  await go_to_pictures(page, LANG, 2);
  await expect(chip(page)).toHaveAccessibleName(tr(LANG, 'usage.chip_aria', { text: tr(LANG, 'usage.chip_practice') }));
  await chip(page).click();
  const panel = page.getByRole('dialog', { name: tr(LANG, 'usage.title') });
  await expect(panel).toContainText(tr(LANG, 'usage.practice'));
  await expect(panel.getByRole('link', { name: 'OpenAI' })).toHaveAttribute('href', /^https:\/\/platform\.openai\.com\//);
  const box = await panel.boundingBox();
  const view = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(view.width + 1);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('a connected key counts pictures; the limit warns and then stops AI pictures', async ({ page }, info) => {
  test.slow();
  await fake_gemini(page);
  await open_start(page, LANG);
  await expect(chip(page)).toHaveAccessibleName(tr(LANG, 'usage.chip_aria', { text: tr(LANG, 'usage.chip_off') }));
  await connect_key(page, LANG, FAKE_KEY, 'Google Gemini', 'A1b2');
  await expect(chip(page)).toHaveAccessibleName(tr(LANG, 'usage.chip_aria', { text: tr(LANG, 'usage.chip', { n: 0 }) }));
  if (info.project.name === 'phone') await expect(page.locator('.usage-chip-text')).toHaveCSS('position', 'absolute');

  await start_new_book(page, LANG);
  await fill_seed(page, LANG, { page_count: 2 });
  await choose_first_plot(page, LANG);
  await pass_pages(page, LANG);
  await pass_style(page, LANG);

  await chip(page).click();
  const panel = page.getByRole('dialog', { name: tr(LANG, 'usage.title') });
  await expect(panel).toContainText('…A1b2');
  await expect(panel).not.toContainText(FAKE_KEY);
  await panel.getByLabel(tr(LANG, 'usage.limit_label')).fill('1');
  await page.keyboard.press('Escape');
  await expect(chip(page)).toHaveAccessibleName(tr(LANG, 'usage.chip_aria', { text: tr(LANG, 'usage.chip_limit', { n: 0, max: 1 }) }));

  const ai_button = page.getByRole('button', { name: tr(LANG, 'pictures.ai.title') });
  await ai_button.dispatchEvent('click');
  await expect(page.locator('.pic-frame img')).toBeAttached();
  await expect(chip(page)).toHaveAccessibleName(tr(LANG, 'usage.chip_aria', { text: tr(LANG, 'usage.chip_limit', { n: 1, max: 1 }) }));
  await expect(chip(page)).toHaveClass(/full/);
  await expect(ai_button).toBeDisabled();
  await expect(page.getByText(tr(LANG, 'error.limit')).first()).toBeVisible();

  // Key check, plot ideas and page split are three word requests.
  await chip(page).click();
  await expect(panel).toContainText(tr(LANG, 'usage.counts', { text: 3, image: 1 }));
  await expect(panel.getByTestId('usage-cost')).toContainText('약 45원');
});

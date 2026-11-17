// Demo book, keyboard-only use, and alt text on every image.
import { expect, test, type Page } from '@playwright/test';
import {
  DEFAULT_PAGE_COUNT,
  EXTRA_PAGES,
  SAMPLE_INPUT,
  exact_button,
  flip_pages,
  go_to_finish,
  go_to_pictures,
  make_all_pictures,
  open_start,
  tab_until_focused,
  tr,
  type Lang,
} from './helpers';

const LANG: Lang = 'ko';
/** The demo book must appear within this time (ms) after opening the start screen. */
const DEMO_DEADLINE_MS = 30_000;

/** Counts images without alt text; images hidden from screen readers on purpose (the DI Lab corner mark) are skipped. */
async function count_images_without_alt(page: Page): Promise<number> {
  return page
    .locator('img:not([aria-hidden="true"])')
    .evaluateAll((images) => images.filter((image) => !(image.getAttribute('alt') ?? '').trim()).length);
}

test.describe('Demo book', () => {
  test('shows a finished sample book within 30 s, flips to the last page, and is not saved', async ({ page }) => {
    await open_start(page, LANG);
    await page.getByRole('button', { name: tr(LANG, 'start.demo.title') }).click({ timeout: DEMO_DEADLINE_MS });
    await expect(page.getByRole('heading', { name: tr(LANG, 'finish.heading') })).toBeVisible({ timeout: DEMO_DEADLINE_MS });
    await expect(page.getByText(tr(LANG, 'finish.demo_badge'))).toBeVisible();
    await expect(page.locator('.book-page img')).toBeAttached();

    // Flip to the last page (credits).
    const total_pages = DEFAULT_PAGE_COUNT + EXTRA_PAGES;
    await flip_pages(page, LANG, total_pages - 1);
    await expect(page.getByText(tr(LANG, 'finish.page_of', { n: total_pages, total: total_pages }))).toBeVisible();
    await expect(page.locator('[data-page-id="credits"]')).toContainText(tr(LANG, 'credits.heading'));

    // "Make my own" goes to the start screen; the demo is not saved, so resume stays disabled.
    await page.getByRole('button', { name: tr(LANG, 'finish.demo_start'), exact: true }).click();
    await expect(page.getByRole('button', { name: tr(LANG, 'start.new.title') })).toBeVisible();
    await expect(page.getByRole('button', { name: tr(LANG, 'start.resume.title') })).toBeDisabled();
    await expect(page.locator('body')).toHaveAttribute('data-save-state', 'idle');
  });
});

test.describe('Keyboard only', () => {
  test('reaches the plot screen from a new book using only Tab, Space, Enter and typing', async ({ page }) => {
    await open_start(page, LANG);
    const input = SAMPLE_INPUT[LANG];

    await tab_until_focused(page, page.getByRole('button', { name: tr(LANG, 'start.new.title') }));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: tr(LANG, 'seed.heading') })).toBeVisible();

    // Seed screen: Space toggles the topic chip, Enter presses Next.
    const topic_chip = exact_button(page, tr(LANG, 'seed.topic.adventure'));
    await tab_until_focused(page, topic_chip);
    await page.keyboard.press('Space');
    await expect(topic_chip).toHaveAttribute('aria-pressed', 'true');
    await tab_until_focused(page, page.locator('#hero-name'));
    await page.keyboard.type(input.hero_name);
    await expect(page.locator('#hero-name')).toHaveValue(input.hero_name);
    await tab_until_focused(page, exact_button(page, tr(LANG, 'common.next')));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: tr(LANG, 'plot.heading') })).toBeVisible();
  });
});

test.describe('Image alt text', () => {
  test('every img on the pictures screen has non-empty alt', async ({ page }) => {
    test.slow();
    await go_to_pictures(page, LANG);
    expect(await count_images_without_alt(page)).toBe(0);
    await make_all_pictures(page, LANG);
    await expect(page.locator('.pic-frame img')).toBeAttached();
    expect(await count_images_without_alt(page)).toBe(0);
  });

  test('every page image on the finish screen has non-empty alt', async ({ page }) => {
    test.slow();
    await go_to_finish(page, LANG);
    const total_pages = DEFAULT_PAGE_COUNT + EXTRA_PAGES;
    const next_button = page.getByRole('button', { name: tr(LANG, 'finish.next_page'), exact: true });
    for (let index = 0; index < total_pages; index += 1) {
      expect(await count_images_without_alt(page), `${index + 1}번째 쪽`).toBe(0);
      if (index < total_pages - 1) await next_button.click();
    }
  });
});

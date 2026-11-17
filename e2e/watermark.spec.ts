// The DI Lab corner mark is on every screen but never covers a button, an input or a link.
import { expect, test, type Page } from '@playwright/test';
import {
  choose_first_plot,
  fill_seed,
  make_all_pictures,
  open_start,
  pass_editor,
  pass_pages,
  pass_pictures,
  pass_style,
  start_new_book,
  type Lang,
} from './helpers';

const LANG: Lang = 'ko';

/** Returns the controls whose box overlaps the mark's box, described for the failure message. */
async function controls_under_mark(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const mark = document.querySelector('.dilab-watermark');
    if (!mark) return ['no mark'];
    const box = mark.getBoundingClientRect();
    const controls = Array.from(document.querySelectorAll('button, a, input, textarea, select, [tabindex="0"]'));
    return controls
      .filter((control) => {
        const rect = control.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        return rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top;
      })
      .map((control) => `${control.tagName} ${control.textContent?.trim().slice(0, 20) ?? ''}`);
  });
}

async function expect_mark_clear(page: Page): Promise<void> {
  const mark = page.locator('.dilab-watermark');
  await expect(mark).toHaveCount(1);
  await expect(mark).toHaveAttribute('aria-hidden', 'true');
  await expect(mark).toHaveAttribute('alt', '');
  // On phones the mark sits at the end of the page, so scroll there before checking.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  expect(await controls_under_mark(page)).toEqual([]);
}

test('the corner mark stays clear of controls on every step', async ({ page }) => {
  test.slow();
  await open_start(page, LANG, { mock: true });
  await expect_mark_clear(page);
  await start_new_book(page, LANG);
  await expect_mark_clear(page);
  await fill_seed(page, LANG);
  await expect_mark_clear(page);
  await choose_first_plot(page, LANG);
  await expect(page.locator('#page-text-1')).toBeVisible();
  await expect_mark_clear(page);
  await pass_pages(page, LANG);
  await expect_mark_clear(page);
  await pass_style(page, LANG);
  await make_all_pictures(page, LANG);
  await expect_mark_clear(page);
  await pass_pictures(page, LANG);
  await expect_mark_clear(page);
  await pass_editor(page, LANG);
  await expect_mark_clear(page);
});

test('the corner mark is hidden when printing', async ({ page }) => {
  await open_start(page, LANG);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.dilab-watermark')).toBeHidden();
});

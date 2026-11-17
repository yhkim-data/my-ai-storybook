// Per-page art style: practice mode swaps the picture at once, and the choice survives a reload.
import { expect, test, type Page } from '@playwright/test';
import { click_by_event, exact_button, go_to_pictures, make_all_pictures, pass_pictures, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';

function style_button(page: Page, name: string) {
  return page.getByRole('button', { name: tr(LANG, 'style.page.menu_aria', { name }) });
}

test('a page style changes that page picture right away in practice mode and is kept after a reload', async ({ page }) => {
  test.slow();
  await go_to_pictures(page, LANG);
  await make_all_pictures(page, LANG);
  await click_by_event(page.locator('.pic-item').nth(2));
  const picture = page.locator('.pic-frame img');
  const before = await picture.getAttribute('src');

  await style_button(page, tr(LANG, 'style.name.watercolor')).click();
  await exact_button(page, tr(LANG, 'style.name.pixel')).click();
  await expect(picture).not.toHaveAttribute('src', before ?? '');
  await expect(style_button(page, tr(LANG, 'style.name.pixel'))).toBeVisible();
  // Practice pictures are already redrawn, so there is nothing to redo.
  await expect(page.getByRole('button', { name: new RegExp(tr(LANG, 'pictures.redo_style')) })).toHaveCount(0);

  // Another page still follows the book style.
  await click_by_event(page.locator('.pic-item').nth(3));
  await expect(style_button(page, tr(LANG, 'style.name.watercolor'))).toBeVisible();

  await expect(page.locator('body')).toHaveAttribute('data-save-state', 'saved');
  await page.reload();
  await page.getByRole('button', { name: tr(LANG, 'start.resume.title') }).click();
  await click_by_event(page.locator('.pic-item').nth(2));
  await expect(style_button(page, tr(LANG, 'style.name.pixel'))).toBeVisible();

  // The editor shows the same page style under the picture tab.
  await pass_pictures(page, LANG);
  await page.locator('.editor-thumb').nth(2).click();
  await page.getByRole('tab', { name: tr(LANG, 'editor.tab.image') }).click();
  await expect(style_button(page, tr(LANG, 'style.name.pixel'))).toBeVisible();
});

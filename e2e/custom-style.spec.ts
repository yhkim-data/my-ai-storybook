// "My own style": typing picks the card, an empty description blocks next, and practice mode still draws pictures.
import { expect, test } from '@playwright/test';
import { choose_first_plot, exact_button, fill_seed, open_start, pass_pages, start_new_book, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';

test('my own style: written words pick the card and carry on to the pictures step', async ({ page }) => {
  await open_start(page, LANG, { mock: true });
  await start_new_book(page, LANG);
  await fill_seed(page, LANG);
  await choose_first_plot(page, LANG);
  await pass_pages(page, LANG);

  const pick = page.getByRole('button', { name: new RegExp(tr(LANG, 'style.custom.title')) });
  await pick.click();
  await expect(pick).toHaveAttribute('aria-pressed', 'true');
  await exact_button(page, tr(LANG, 'common.next')).click();
  await expect(page.getByRole('alert')).toHaveText(tr(LANG, 'style.need_custom'));
  await expect(page.getByRole('heading', { name: tr(LANG, 'style.heading') })).toBeVisible();

  await page.getByRole('button', { name: new RegExp(tr(LANG, 'style.name.crayon')) }).click();
  await expect(pick).toHaveAttribute('aria-pressed', 'false');
  await page.getByLabel(tr(LANG, 'style.custom.label')).fill('파스텔 색 크레파스로 칠한 듯 따뜻한 느낌');
  await expect(pick).toHaveAttribute('aria-pressed', 'true');

  await exact_button(page, tr(LANG, 'common.next')).click();
  await expect(page.getByText(tr(LANG, 'pictures.style', { name: tr(LANG, 'style.name.custom') }))).toBeVisible();
  await page.getByRole('button', { name: new RegExp(tr(LANG, 'pictures.ai.title')) }).click();
  await expect(page.locator('.pic-frame img')).toBeVisible();
});

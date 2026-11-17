// "Ask AI for help" in practice mode: name, look, plot and page words get sample answers, and undo works.
import { expect, test } from '@playwright/test';
import { exact_button, open_start, open_story_page, start_new_book, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';

test('practice mode: Ask AI for help fills the boxes on steps 2-4, and undo puts back the old words', async ({ page }) => {
  test.slow();
  await open_start(page, LANG, { mock: true });
  await start_new_book(page, LANG);
  const help = page.getByRole('button', { name: tr(LANG, 'assist.button') });
  const undo = page.getByRole('button', { name: tr(LANG, 'assist.undo') });

  // Step 2: hero name, then the look.
  await page.locator('#hero-name').fill('구름');
  await help.nth(0).click();
  await expect(page.locator('#hero-name')).toHaveValue('토리');
  await undo.click();
  await expect(page.locator('#hero-name')).toHaveValue('구름');
  await help.nth(1).click();
  await expect(page.locator('#hero-look')).not.toHaveValue('');
  await exact_button(page, tr(LANG, 'seed.topic.custom')).click();
  await page.getByRole('button', { name: tr(LANG, 'assist.button') }).first().click();
  await expect(page.locator('#topic-custom')).not.toHaveValue('');
  await exact_button(page, tr(LANG, 'common.next')).click();

  // Step 3: write it myself, then let the AI write the title and summary.
  await expect(page.getByRole('heading', { name: tr(LANG, 'plot.heading') })).toBeVisible();
  await exact_button(page, tr(LANG, 'plot.self')).click();
  await help.click();
  await expect(page.locator('#plot-title')).not.toHaveValue('');
  await expect(page.locator('#plot-summary')).not.toHaveValue('');
  await exact_button(page, tr(LANG, 'common.next')).click();

  // Step 4: page 2 words and picture note, each on its own.
  await open_story_page(page, 2);
  const words = page.locator('#page-text-2');
  await words.fill('');
  await help.nth(0).click();
  await expect(words).not.toHaveValue('');
  await page.locator('#page-desc-2').fill('');
  await help.nth(1).click();
  await expect(page.locator('#page-desc-2')).not.toHaveValue('');
});

test('without AI, Ask AI for help is off and says AI is needed', async ({ page }) => {
  await open_start(page, LANG);
  await start_new_book(page, LANG);
  const help = page.getByRole('button', { name: tr(LANG, 'assist.button') });
  await expect(help.first()).toBeDisabled();
  await expect(page.getByText(tr(LANG, 'assist.need_ai')).first()).toBeVisible();
});

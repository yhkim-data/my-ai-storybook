// The header logo goes back to the start screen from every step, and "Continue" reopens the same book there.
import { expect, test, type Locator, type Page } from '@playwright/test';
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
  tr,
  type Lang,
} from './helpers';

const LANG: Lang = 'ko';

function logo(page: Page): Locator {
  return page.getByRole('button', { name: tr(LANG, 'common.home_aria'), exact: true });
}

/** Clicks the logo, checks the start screen, then continues and checks that `here` is shown again. */
async function round_trip(page: Page, here: Locator): Promise<void> {
  await logo(page).click();
  const resume = page.getByRole('button', { name: tr(LANG, 'start.resume.title') });
  await expect(page.getByRole('button', { name: tr(LANG, 'start.new.title') })).toBeVisible();
  await expect(resume).toBeEnabled();
  await resume.click();
  await expect(here).toBeVisible();
}

test('logo on every step returns to the start screen, and Continue reopens the same step', async ({ page }) => {
  test.slow();
  await open_start(page, LANG, { mock: true });
  await start_new_book(page, LANG);
  await page.locator('#hero-name').fill('구름');
  await round_trip(page, page.locator('#hero-name'));
  await expect(page.locator('#hero-name')).toHaveValue('구름');

  await fill_seed(page, LANG);
  await round_trip(page, page.getByRole('heading', { name: tr(LANG, 'plot.heading') }));

  await choose_first_plot(page, LANG);
  await expect(page.locator('#page-text-1')).toBeVisible();
  await round_trip(page, page.getByRole('heading', { name: tr(LANG, 'pages.heading') }));

  await pass_pages(page, LANG);
  await round_trip(page, page.getByRole('heading', { name: tr(LANG, 'style.heading') }));

  await pass_style(page, LANG);
  await make_all_pictures(page, LANG);
  await round_trip(page, page.locator('.pic-list'));
  await expect(page.locator('.pic-none')).toHaveCount(0);

  await pass_pictures(page, LANG);
  await round_trip(page, page.getByTestId('text-box'));

  await pass_editor(page, LANG);
  await round_trip(page, page.getByRole('heading', { name: tr(LANG, 'finish.heading') }));
  await expect(page.locator('#author-input')).not.toHaveValue('');
});

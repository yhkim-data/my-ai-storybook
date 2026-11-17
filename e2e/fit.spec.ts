// Every step screen fits the window at common tablet and desktop sizes: no page scroll, nothing spilling out.
import { expect, test, type Page } from '@playwright/test';
import {
  choose_first_plot,
  exact_button,
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
const LANGS: Lang[] = ['ko', 'en'];
/** Width x height in px. */
const SIZES: [number, number][] = [
  [1280, 800],
  [1366, 768],
  [1920, 1080],
  [1024, 768],
  [768, 1024],
];
const TOLERANCE_PX = 1;

interface FitReport {
  /** Page scroll height minus the window height. */
  overflow: number;
  /** An element inside the main area that reaches past its bottom edge, if any. */
  spill: string | null;
}

async function read_fit(page: Page): Promise<FitReport> {
  return page.evaluate((tolerance) => {
    const overflow = document.documentElement.scrollHeight - window.innerHeight;
    const main = document.querySelector('.shell-main');
    let spill: string | null = null;
    if (main) {
      const limit = main.getBoundingClientRect().bottom + tolerance;
      for (const element of Array.from(main.querySelectorAll('*'))) {
        const box = element.getBoundingClientRect();
        // The page preview's own contents (text box handles) may stick out of the page by design.
        if (box.height > 0 && box.bottom > limit && !element.closest('.page-inner')) {
          spill = `${element.tagName.toLowerCase()}.${element.className}`;
          break;
        }
      }
    }
    return { overflow, spill };
  }, TOLERANCE_PX);
}

/** Resizes the window to every size and checks the current screen fits each time. */
async function expect_fits(page: Page, screen_name: string): Promise<void> {
  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height });
    // The layout settles a moment after the resize (page previews are measured), so poll.
    await expect.poll(async () => (await read_fit(page)).spill, { message: `${screen_name} ${width}x${height} spills` }).toBeNull();
    const report = await read_fit(page);
    expect(report.overflow, `${screen_name} ${width}x${height} scrolls`).toBeLessThanOrEqual(TOLERANCE_PX);
  }
}

for (const lang of LANGS) {
  test(`${lang}: each step fits the window without page scroll at tablet and desktop sizes`, async ({ page }, info) => {
    test.skip(info.project.name === 'phone', 'Phones stack the screen and scroll on purpose.');
    test.slow();
    await open_start(page, lang, { mock: true });
    await expect_fits(page, 'start');
    await start_new_book(page, lang);
    await expect_fits(page, 'seed');
    await fill_seed(page, lang);
    await page.locator('button.card.selectable').first().click();
    await expect_fits(page, 'plot');
    await exact_button(page, tr(lang, 'common.next')).click();
    await expect(page.locator('#page-text-1')).toBeVisible();
    await expect_fits(page, 'pages');
    await pass_pages(page, lang);
    await expect(page.locator('img.style-sample').first()).toBeVisible();
    await expect_fits(page, 'style');
    await pass_style(page, lang);
    await make_all_pictures(page, lang);
    await expect_fits(page, 'pictures');
    await pass_pictures(page, lang);
    await expect_fits(page, 'editor');
    await pass_editor(page, lang);
    await expect_fits(page, 'finish');
  });
}

test('a 20-page book still fits on the page list screens', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'Phones stack the screen and scroll on purpose.');
  test.slow();
  await open_start(page, LANG, { mock: true });
  await start_new_book(page, LANG);
  await fill_seed(page, LANG, { page_count: 20 });
  await expect_fits(page, 'plot');
  await choose_first_plot(page, LANG);
  await expect_fits(page, 'pages');
  await pass_pages(page, LANG);
  await pass_style(page, LANG);
  await make_all_pictures(page, LANG);
  await expect_fits(page, 'pictures');
  await pass_pictures(page, LANG);
  await expect_fits(page, 'editor');
});

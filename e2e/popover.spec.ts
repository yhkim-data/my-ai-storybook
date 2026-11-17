// Opening the art style list must not shake the screen: no page scroll appears, the header stays put,
// and the whole list stays inside the window, even with "my own style" and its description box open.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { go_to_pictures, make_all_pictures, pass_pictures, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';
const SIZES = [
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
];
const PX_TOLERANCE = 1;

async function logo_box(page: Page) {
  const box = await page.locator('.brand-home').first().boundingBox();
  if (!box) throw new Error('로고를 찾지 못했어요');
  return box;
}

/** Opens the style list, picks "my own style", and checks the three conditions. */
async function open_and_check(page: Page, menu_button: Locator): Promise<void> {
  const before = await logo_box(page);
  await menu_button.click();
  const list = page.locator('.style-menu-list');
  await expect(list).toBeVisible();
  await list.getByRole('button', { name: tr(LANG, 'style.name.custom'), exact: true }).click();
  await expect(list.locator('textarea')).toBeVisible();
  // Let the list settle after the description box appears.
  await page.waitForTimeout(200);

  const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollHeight, inner: window.innerHeight, width: window.innerWidth }));
  expect(sizes.scroll, '문서에 세로 스크롤이 생겼어요').toBeLessThanOrEqual(sizes.inner);
  const after = await logo_box(page);
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(PX_TOLERANCE);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(PX_TOLERANCE);
  const box = await list.boundingBox();
  if (!box) throw new Error('목록을 찾지 못했어요');
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(sizes.inner + PX_TOLERANCE);
  expect(box.x + box.width).toBeLessThanOrEqual(sizes.width + PX_TOLERANCE);

  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(menu_button).toBeFocused();
}

for (const size of SIZES) {
  test(`${size.width}x${size.height}: the style list keeps the screen still on pictures and editor`, async ({ page }, info) => {
    test.skip(info.project.name === 'phone', '휴대폰은 화면이 원래 스크롤돼요');
    test.slow();
    await page.setViewportSize(size);
    await go_to_pictures(page, LANG, 4);
    await open_and_check(page, page.locator('.style-menu-button'));

    await make_all_pictures(page, LANG);
    await pass_pictures(page, LANG);
    await page.getByRole('tab', { name: tr(LANG, 'editor.tab.image') }).click();
    await open_and_check(page, page.locator('.style-menu-button'));
  });
}

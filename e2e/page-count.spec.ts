// Practice mode makes a book of any page count: cover + N pages on screen and N + 2 pages in the PDF.
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import {
  EXTRA_PAGES,
  choose_first_plot,
  fill_seed,
  make_all_pictures,
  open_start,
  pass_editor,
  pass_pages,
  pass_pictures,
  pass_style,
  read_download,
  start_new_book,
  tr,
  type Lang,
} from './helpers';

const LANG: Lang = 'ko';
const COUNTS = [2, 5, 12, 20];

for (const count of COUNTS) {
  test(`${count} pages: the whole practice flow gives a cover + ${count}-page book and a ${count + EXTRA_PAGES}-page PDF`, async ({ page }) => {
    test.slow();
    await open_start(page, LANG, { mock: true });
    await start_new_book(page, LANG);
    await fill_seed(page, LANG, { page_count: count });
    await choose_first_plot(page, LANG);
    await expect(page.locator(`#page-text-${count}`)).toBeAttached();
    await expect(page.locator(`#page-text-${count + 1}`)).toHaveCount(0);
    await pass_pages(page, LANG);
    await pass_style(page, LANG);
    await expect(page.locator('.pic-item')).toHaveCount(count + 1);
    await make_all_pictures(page, LANG);
    await pass_pictures(page, LANG);
    await expect(page.locator('.editor-thumb')).toHaveCount(count + 1);
    await pass_editor(page, LANG);
    await expect(page.getByText(tr(LANG, 'finish.page_of', { n: 1, total: count + EXTRA_PAGES }))).toBeVisible();
    const pdf = await read_download(page, 'download-pdf');
    expect((await PDFDocument.load(pdf.bytes)).getPageCount()).toBe(count + EXTRA_PAGES);
  });
}

test('the seed screen warns that many pages take longer to draw', async ({ page }) => {
  await open_start(page, LANG, { mock: true });
  await start_new_book(page, LANG);
  await page.getByRole('button', { name: tr(LANG, 'seed.pages.custom'), exact: true }).click();
  await expect(page.getByText(tr(LANG, 'seed.pages.many'))).toBeVisible();
  await page.getByRole('button', { name: tr(LANG, 'seed.pages.option', { n: 8 }), exact: true }).click();
  await expect(page.getByText(tr(LANG, 'seed.pages.many'))).toBeHidden();
});

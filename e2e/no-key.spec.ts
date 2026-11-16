// No key: finish a book with hand-written text and uploaded pictures. No AI calls or provider requests allowed.
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import {
  EXTRA_PAGES,
  click_by_event,
  collect_request_urls,
  expect_no_h_scroll,
  fill_seed,
  flip_pages,
  open_start,
  pass_editor,
  pass_pages,
  pass_pictures,
  pass_style,
  read_download,
  read_usage_count,
  start_new_book,
  tiny_png_file,
  tr,
  write_plot_by_hand,
  type PageCount,
} from './helpers';

const LANG = 'ko';
const PAGE_COUNT: PageCount = 4;
const PROVIDER_HOST = 'generativelanguage.googleapis.com';
const BOOK_TITLE = '별을 찾아 떠난 토리';
const BOOK_SUMMARY = '작은 여우 토리가 별을 찾아 길을 떠나요.';

test('no key: write text by hand, upload pictures, and make the PDF', async ({ page }) => {
  test.slow();
  const request_urls = collect_request_urls(page);

  await open_start(page, LANG);
  await expect(page.getByText(tr(LANG, 'start.connect.off'))).toBeVisible();
  await start_new_book(page, LANG);
  await fill_seed(page, LANG, { page_count: PAGE_COUNT });

  await expect(page.getByText(tr(LANG, 'plot.no_ai'))).toBeVisible();
  await write_plot_by_hand(page, LANG, BOOK_TITLE, BOOK_SUMMARY);

  await expect(page.getByText(tr(LANG, 'pages.self_hint'))).toBeVisible();
  for (let n = 1; n <= PAGE_COUNT; n += 1) {
    await page.locator(`#page-text-${n}`).fill(`${n}쪽 이야기입니다.`);
  }
  await pass_pages(page, LANG);
  await expect_no_h_scroll(page);
  await pass_style(page, LANG);

  // Upload the cover and all story pages except the last, which stays empty.
  const upload_count = PAGE_COUNT;
  for (let index = 0; index < upload_count; index += 1) {
    await click_by_event(page.locator('.pic-item').nth(index));
    await page.getByTestId('upload-input').setInputFiles(tiny_png_file());
    await expect(page.locator('.pic-frame img')).toBeAttached();
  }
  await click_by_event(page.locator('.pic-item').nth(upload_count));
  await expect(page.locator('.pic-frame.empty')).toBeVisible();

  // Copying the picture description puts text on the clipboard.
  await click_by_event(page.getByRole('button', { name: tr(LANG, 'pictures.copy.title') }));
  await expect(page.getByText(tr(LANG, 'pictures.copied'))).toBeVisible();
  const copied_text = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied_text.length).toBeGreaterThan(0);
  expect(copied_text).toContain(`${PAGE_COUNT}쪽 이야기입니다.`);

  await pass_pictures(page, LANG);
  await pass_editor(page, LANG);

  // No AI notice on the last page.
  await flip_pages(page, LANG, PAGE_COUNT + EXTRA_PAGES - 1);
  await expect(page.locator('[data-page-id="credits"]')).toBeVisible();
  await expect(page.getByTestId('ai-notice')).toHaveCount(0);

  const screen_pdf = await read_download(page, 'download-pdf');
  const screen_doc = await PDFDocument.load(screen_pdf.bytes);
  expect(screen_doc.getPageCount()).toBe(PAGE_COUNT + EXTRA_PAGES);

  expect(await read_usage_count(page)).toBe(0);
  const provider_requests = request_urls.filter((url) => url.includes(PROVIDER_HOST));
  expect(provider_requests).toHaveLength(0);
});

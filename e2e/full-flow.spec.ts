// Full flow: make a book in mock mode and download the PDF, print PDF, image zip and project file.
import { expect, test, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import {
  DEFAULT_PAGE_COUNT,
  EXTRA_PAGES,
  POINTS_TOLERANCE,
  PRINT_PDF_POINTS,
  SCREEN_PDF_POINTS,
  choose_first_plot,
  expect_no_h_scroll,
  fill_seed,
  make_all_pictures,
  open_start,
  pass_editor,
  pass_pages,
  pass_pictures,
  pass_style,
  read_download,
  read_usage_count,
  start_new_book,
  tr,
  type Lang,
  type PageCount,
} from './helpers';

const LANG_CASES: { lang: Lang; label: string }[] = [
  { lang: 'ko', label: 'Korean' },
  { lang: 'en', label: 'English' },
];
/** One plot call plus one page-split call. */
const TEXT_CALLS = 2;
const BOOK_FILE_FORMAT_VERSION = 1;

/** Goes from start to finish in mock mode, checking every screen for horizontal scroll. */
async function run_flow(page: Page, lang: Lang, page_count: PageCount): Promise<void> {
  await open_start(page, lang, { mock: true });
  await expect_no_h_scroll(page);
  await start_new_book(page, lang);
  await expect_no_h_scroll(page);
  await fill_seed(page, lang, { page_count });
  await expect_no_h_scroll(page);
  await choose_first_plot(page, lang);
  await expect_no_h_scroll(page);
  await expect(page.locator(`#page-text-${page_count}`)).toBeVisible();
  await pass_pages(page, lang);
  await expect_no_h_scroll(page);
  await pass_style(page, lang);
  await expect_no_h_scroll(page);
  await make_all_pictures(page, lang);
  await expect_no_h_scroll(page);
  await pass_pictures(page, lang);
  await expect_no_h_scroll(page);
  await pass_editor(page, lang);
  await expect_no_h_scroll(page);
}

for (const { lang, label } of LANG_CASES) {
  test(`full flow (${label}): downloads the default 8-page book as PDF, print PDF, image zip and project file`, async ({ page }) => {
    test.slow();
    const page_count = DEFAULT_PAGE_COUNT;
    const total_pages = page_count + EXTRA_PAGES;
    await run_flow(page, lang, page_count);

    // Text calls plus one picture call for the cover and each story page.
    expect(await read_usage_count(page)).toBe(TEXT_CALLS + (page_count + 1));

    const screen_pdf = await read_download(page, 'download-pdf');
    expect(screen_pdf.name.endsWith('.pdf')).toBe(true);
    const screen_doc = await PDFDocument.load(screen_pdf.bytes);
    expect(screen_doc.getPageCount()).toBe(total_pages);
    expect(screen_doc.getPage(0).getSize().width).toBeCloseTo(SCREEN_PDF_POINTS, 0);
    await expect(page.getByText(tr(lang, 'finish.done'))).toBeVisible();

    const print_pdf = await read_download(page, 'download-print');
    const print_doc = await PDFDocument.load(print_pdf.bytes);
    expect(print_doc.getPageCount()).toBe(total_pages);
    const print_size = print_doc.getPage(0).getSize();
    expect(Math.abs(print_size.width - PRINT_PDF_POINTS)).toBeLessThan(POINTS_TOLERANCE);
    expect(Math.abs(print_size.height - PRINT_PDF_POINTS)).toBeLessThan(POINTS_TOLERANCE);

    const zip_file = await read_download(page, 'download-zip');
    const zip_names = Object.keys(unzipSync(new Uint8Array(zip_file.bytes)));
    expect(zip_names.filter((name) => name.endsWith('.png'))).toHaveLength(total_pages);

    const work_file = await read_download(page, 'download-file');
    const saved_book = JSON.parse(work_file.bytes.toString('utf-8')) as { format_version: number; pages: unknown[] };
    expect(saved_book.format_version).toBe(BOOK_FILE_FORMAT_VERSION);
    // The project file holds the cover and story pages; the credits page is added only on export.
    expect(saved_book.pages).toHaveLength(page_count + 1);

    // Downloads must not call the AI again.
    expect(await read_usage_count(page)).toBe(TEXT_CALLS + (page_count + 1));
  });
}

test('full flow: choosing 4 pages gives a 6-page PDF', async ({ page }) => {
  test.slow();
  const page_count: PageCount = 4;
  await run_flow(page, 'ko', page_count);
  expect(await read_usage_count(page)).toBe(TEXT_CALLS + (page_count + 1));
  const screen_pdf = await read_download(page, 'download-pdf');
  const screen_doc = await PDFDocument.load(screen_pdf.bytes);
  expect(screen_doc.getPageCount()).toBe(page_count + EXTRA_PAGES);
});

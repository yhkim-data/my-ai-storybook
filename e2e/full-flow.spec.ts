// 끝까지 가보기: 연습 모드로 새 책을 만들어 PDF, 인쇄용 PDF, 그림 묶음, 작업 파일까지 받아 본다.
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

/** 검사할 언어와 화면에 쓰는 이름 */
const LANG_CASES: { lang: Lang; label: string }[] = [
  { lang: 'ko', label: '한국어' },
  { lang: 'en', label: '영어' },
];
/** 글 호출 횟수: 줄거리 1회 + 쪽 나누기 1회 */
const TEXT_CALLS = 2;
/** 작업 파일의 형식 번호 */
const BOOK_FILE_FORMAT_VERSION = 1;

/**
 * 연습 모드로 처음부터 완성 화면까지 간다. 화면마다 가로 스크롤이 없는지 본다.
 */
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
  test(`끝까지 가보기 (${label}): 기본 8쪽 책을 PDF·인쇄용 PDF·그림 묶음·작업 파일로 받는다`, async ({ page }) => {
    test.slow();
    const page_count = DEFAULT_PAGE_COUNT;
    const total_pages = page_count + EXTRA_PAGES;
    await run_flow(page, lang, page_count);

    // 글 호출은 줄거리 1 + 쪽 나누기 1, 그림 호출은 표지와 본문 쪽당 1회다.
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
    // 작업 파일의 pages에는 표지와 본문이 들어 있다 (만든 사람 쪽은 내보낼 때 더해진다).
    expect(saved_book.pages).toHaveLength(page_count + 1);

    // 받는 동안에도 AI를 다시 부르지 않는다.
    expect(await read_usage_count(page)).toBe(TEXT_CALLS + (page_count + 1));
  });
}

test('끝까지 가보기: 4쪽을 고르면 PDF가 6쪽이다', async ({ page }) => {
  test.slow();
  const page_count: PageCount = 4;
  await run_flow(page, 'ko', page_count);
  expect(await read_usage_count(page)).toBe(TEXT_CALLS + (page_count + 1));
  const screen_pdf = await read_download(page, 'download-pdf');
  const screen_doc = await PDFDocument.load(screen_pdf.bytes);
  expect(screen_doc.getPageCount()).toBe(page_count + EXTRA_PAGES);
});

// 키 없이 끝까지: 글은 직접 쓰고 그림은 올리기만으로 책을 완성한다. AI 호출과 제공사로 가는 요청은 없어야 한다.
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
/** 직접 쓰는 책의 본문 쪽수 */
const PAGE_COUNT: PageCount = 4;
/** 제공사 주소의 호스트 */
const PROVIDER_HOST = 'generativelanguage.googleapis.com';
const BOOK_TITLE = '별을 찾아 떠난 토리';
const BOOK_SUMMARY = '작은 여우 토리가 별을 찾아 길을 떠나요.';

test('키 없이 끝까지: 글을 직접 쓰고 그림을 올려서 PDF까지 만든다', async ({ page }) => {
  test.slow();
  const request_urls = collect_request_urls(page);

  await open_start(page, LANG);
  await expect(page.getByText(tr(LANG, 'start.connect.off'))).toBeVisible();
  await start_new_book(page, LANG);
  await fill_seed(page, LANG, { page_count: PAGE_COUNT });

  // 줄거리: 연결이 없으니 직접 쓴다.
  await expect(page.getByText(tr(LANG, 'plot.no_ai'))).toBeVisible();
  await write_plot_by_hand(page, LANG, BOOK_TITLE, BOOK_SUMMARY);

  // 쪽 나누기: 쪽마다 글을 직접 쓴다.
  await expect(page.getByText(tr(LANG, 'pages.self_hint'))).toBeVisible();
  for (let n = 1; n <= PAGE_COUNT; n += 1) {
    await page.locator(`#page-text-${n}`).fill(`${n}쪽 이야기입니다.`);
  }
  await pass_pages(page, LANG);
  await expect_no_h_scroll(page);
  await pass_style(page, LANG);

  // 그림: 표지와 본문 쪽 일부(마지막 쪽은 비워 둔다)를 올린다.
  const upload_count = PAGE_COUNT;
  for (let index = 0; index < upload_count; index += 1) {
    await click_by_event(page.locator('.pic-item').nth(index));
    await page.getByTestId('upload-input').setInputFiles(tiny_png_file());
    await expect(page.locator('.pic-frame img')).toBeAttached();
  }
  await click_by_event(page.locator('.pic-item').nth(upload_count));
  await expect(page.locator('.pic-frame.empty')).toBeVisible();

  // 그림 설명 복사: 클립보드에 글이 들어간다.
  await click_by_event(page.getByRole('button', { name: tr(LANG, 'pictures.copy.title') }));
  await expect(page.getByText(tr(LANG, 'pictures.copied'))).toBeVisible();
  const copied_text = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied_text.length).toBeGreaterThan(0);
  expect(copied_text).toContain(`${PAGE_COUNT}쪽 이야기입니다.`);

  await pass_pictures(page, LANG);
  await pass_editor(page, LANG);

  // 완성 화면 마지막 쪽에는 AI 표시가 없다.
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

// 이어 만들기: 새로고침 뒤에 이어서 열기, 작업 파일을 받았다가 불러오면 같은 책인지, 엉뚱한 파일은 안내가 뜨는지.
import { expect, test, type Page } from '@playwright/test';
import {
  SAMPLE_INPUT,
  click_by_event,
  exact_button,
  flip_pages,
  go_to_pictures,
  make_all_pictures,
  open_start,
  pass_editor,
  pass_pictures,
  read_download,
  tr,
  type Lang,
} from './helpers';

const LANG: Lang = 'ko';
/** 연습 모드 기본 책의 전체 쪽수(표지 + 본문 8쪽) */
const BOOK_PAGES = 9;
/** 쪽 목록에서 글을 비교할 쪽 번호 */
const COMPARE_INDEX = 2;

/** 작업 파일에서 검사에 쓰는 부분 */
interface SavedBook {
  author: string;
  pages: { text: string; image: { data_url: string } | null }[];
}

/**
 * 자동 저장이 끝나기를 기다린다.
 */
async function wait_saved(page: Page): Promise<void> {
  await expect(page.locator('body')).toHaveAttribute('data-save-state', 'saved');
}

/**
 * 그림 화면에서 지금 보이는 쪽의 글을 읽는다.
 */
async function read_picture_text(page: Page): Promise<string> {
  return (await page.locator('.pic-text').innerText()).trim();
}

test.describe('이어 만들기', () => {
  test('새로고침 뒤 이어 만들기: 같은 단계에서 글과 그림이 그대로다', async ({ page }) => {
    await go_to_pictures(page, LANG);
    await make_all_pictures(page, LANG);
    await click_by_event(page.locator('.pic-item').nth(COMPARE_INDEX));
    const text_before = await read_picture_text(page);
    expect(text_before.length).toBeGreaterThan(0);
    await wait_saved(page);

    await page.reload();
    const resume = page.getByRole('button', { name: tr(LANG, 'start.resume.title') });
    await expect(resume).toBeEnabled();
    await resume.click();

    // 같은 단계(그림) 화면이고 모든 쪽에 그림이 있다.
    await expect(page.locator('.pic-list')).toBeVisible();
    await expect(page.locator('.pic-item')).toHaveCount(BOOK_PAGES);
    await expect(page.locator('.pic-none')).toHaveCount(0);
    await click_by_event(page.locator('.pic-item').nth(COMPARE_INDEX));
    expect(await read_picture_text(page)).toBe(text_before);
    await expect(page.locator('.pic-frame img')).toBeAttached();
  });

  test('작업 파일 받기 → 새 책 시작 → 파일 불러오기: 같은 책이 열린다', async ({ page }) => {
    test.slow();
    await go_to_pictures(page, LANG);
    await make_all_pictures(page, LANG);
    await pass_pictures(page, LANG);
    await pass_editor(page, LANG);
    const work_file = await read_download(page, 'download-file');
    const saved = JSON.parse(work_file.bytes.toString('utf-8')) as SavedBook;
    expect(saved.author).toBe(SAMPLE_INPUT[LANG].author);
    expect(saved.pages).toHaveLength(BOOK_PAGES);
    const title = saved.pages[0]?.text ?? '';
    const first_text = saved.pages[1]?.text ?? '';
    expect(title.length).toBeGreaterThan(0);
    expect(first_text.length).toBeGreaterThan(0);
    await wait_saved(page);

    // 처음으로 → 새 책 만들기: 만들던 책이 있으니 확인 창이 뜬다.
    await exact_button(page, tr(LANG, 'common.home')).click();
    await page.getByRole('button', { name: tr(LANG, 'start.new.title') }).click();
    await exact_button(page, tr(LANG, 'start.replace.confirm')).click();
    await expect(page.getByRole('heading', { name: tr(LANG, 'seed.heading') })).toBeVisible();
    await exact_button(page, tr(LANG, 'common.prev')).click();
    await expect(page.getByRole('button', { name: tr(LANG, 'start.new.title') })).toBeVisible();

    // 받아 둔 파일을 불러온다.
    await page.getByTestId('file-input').setInputFiles({
      name: work_file.name,
      mimeType: 'application/json',
      buffer: work_file.bytes,
    });
    await expect(page.getByRole('heading', { name: tr(LANG, 'finish.heading') })).toBeVisible();
    await expect(page.locator('#author-input')).toHaveValue(saved.author);
    await expect(page.locator('.book-page')).toContainText(title);
    await expect(page.locator('.book-page img')).toBeAttached();
    await expect(page.getByText(tr(LANG, 'finish.page_of', { n: 1, total: BOOK_PAGES + 1 }))).toBeVisible();
    await flip_pages(page, LANG, 1);
    await expect(page.locator('.book-page')).toContainText(first_text);
    await expect(page.locator('.book-page img')).toBeAttached();
  });

  test('엉뚱한 파일을 올리면 열 수 없다는 안내가 뜬다', async ({ page }) => {
    await open_start(page, LANG);
    await page.getByTestId('file-input').setInputFiles({
      name: 'other.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello":"world"}'),
    });
    await expect(page.getByRole('alert')).toContainText(tr(LANG, 'start.load_error'));
    await expect(page.getByRole('button', { name: tr(LANG, 'start.new.title') })).toBeVisible();
  });
});

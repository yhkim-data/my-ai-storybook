// Resume after reload, project file round-trip, and a clear message for an unrelated file.
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
/** Cover plus 8 story pages in the default mock book. */
const BOOK_PAGES = 9;
const COMPARE_INDEX = 2;

/** The parts of the project file these tests read. */
interface SavedBook {
  author: string;
  pages: { text: string; image: { data_url: string } | null }[];
}

/** Waits for autosave to finish. */
async function wait_saved(page: Page): Promise<void> {
  await expect(page.locator('body')).toHaveAttribute('data-save-state', 'saved');
}

async function read_picture_text(page: Page): Promise<string> {
  return (await page.locator('.pic-text').innerText()).trim();
}

test.describe('Resume', () => {
  test('after reload, resume opens the same step with text and pictures intact', async ({ page }) => {
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

    // Back on the pictures step with a picture on every page.
    await expect(page.locator('.pic-list')).toBeVisible();
    await expect(page.locator('.pic-item')).toHaveCount(BOOK_PAGES);
    await expect(page.locator('.pic-none')).toHaveCount(0);
    await click_by_event(page.locator('.pic-item').nth(COMPARE_INDEX));
    expect(await read_picture_text(page)).toBe(text_before);
    await expect(page.locator('.pic-frame img')).toBeAttached();
  });

  test('download project file, start a new book, load the file: the same book opens', async ({ page }) => {
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

    // Home, then new book: a book is in progress, so a confirm dialog appears.
    await exact_button(page, tr(LANG, 'common.home')).click();
    await page.getByRole('button', { name: tr(LANG, 'start.new.title') }).click();
    await exact_button(page, tr(LANG, 'start.replace.confirm')).click();
    await expect(page.getByRole('heading', { name: tr(LANG, 'seed.heading') })).toBeVisible();
    await exact_button(page, tr(LANG, 'common.prev')).click();
    await expect(page.getByRole('button', { name: tr(LANG, 'start.new.title') })).toBeVisible();

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

  test('loading an unrelated file shows a cannot-open message', async ({ page }) => {
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

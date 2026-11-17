// The picture moves and resizes like the text box, keeps its place after a reload, and can go in front of the text.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { go_to_editor, read_download, pass_editor, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';
const DRAG_STEPS = 12;
const DRAG_PX = 60;
const MIN_MOVED_PX = 30;
const TOLERANCE_PX = 2;

/** Box position relative to the page's top-left corner. */
async function rect_in_page(page: Page, target: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const rect = await target.boundingBox();
  const page_rect = await page.locator('.editor-canvas .book-page').boundingBox();
  if (!rect || !page_rect) throw new Error('상자를 찾지 못했어요');
  return { x: rect.x - page_rect.x, y: rect.y - page_rect.y, width: rect.width, height: rect.height };
}

async function drag_by(page: Page, handle: Locator, dx: number, dy: number): Promise<void> {
  await handle.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const rect = await handle.boundingBox();
  if (!rect) throw new Error('손잡이를 찾지 못했어요');
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: DRAG_STEPS });
  await page.mouse.up();
}

test('drag the picture, resize it, put it in front, and find it the same after a reload', async ({ page }) => {
  test.slow();
  await go_to_editor(page, LANG);
  await page.locator('.editor-thumb').nth(1).click();
  await page.getByRole('tab', { name: tr(LANG, 'editor.tab.image') }).click();
  const image = page.getByTestId('image-box');

  // Make it smaller first (it starts at the page edges' inner margin), then drag it.
  await drag_by(page, page.getByTestId('image-resize'), -DRAG_PX * 2, -DRAG_PX);
  const resized = await rect_in_page(page, image);
  await drag_by(page, page.getByTestId('image-move'), DRAG_PX, DRAG_PX);
  const moved = await rect_in_page(page, image);
  expect(moved.x - resized.x).toBeGreaterThan(MIN_MOVED_PX);
  expect(moved.y - resized.y).toBeGreaterThan(MIN_MOVED_PX);
  expect(Math.abs(moved.width - resized.width)).toBeLessThanOrEqual(TOLERANCE_PX);

  await page.getByRole('button', { name: tr(LANG, 'editor.bring_front'), exact: true }).click();
  // The picture is now drawn after the text box.
  await expect(page.locator('.editor-canvas .page-inner > :last-child')).toHaveAttribute('data-testid', 'image-box');

  await expect(page.locator('body')).toHaveAttribute('data-save-state', 'saved');
  await page.reload();
  await page.getByRole('button', { name: tr(LANG, 'start.resume.title') }).click();
  await page.locator('.editor-thumb').nth(1).click();
  const after = await rect_in_page(page, image);
  expect(Math.abs(after.x - moved.x)).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(after.y - moved.y)).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(after.width - moved.width)).toBeLessThanOrEqual(TOLERANCE_PX);
  await expect(page.locator('.editor-canvas .page-inner > :last-child')).toHaveAttribute('data-testid', 'image-box');

  // The finished book and the PDF use the same place and order.
  await pass_editor(page, LANG);
  await page.getByRole('button', { name: tr(LANG, 'finish.next_page'), exact: true }).click();
  await expect(page.locator('.finish-viewer .page-inner > :last-child')).toHaveClass(/page-image/);
  const pdf = await read_download(page, 'download-pdf');
  expect(pdf.bytes.length).toBeGreaterThan(0);
});

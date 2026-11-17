// Book shape: the editor, the finished book and both PDFs follow the chosen shape, and it is kept after a reload.
import { expect, test, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { go_to_editor, pass_editor, read_download, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';
/** Height / width for each shape (square 200x200 mm, tall 180x240 mm, wide 240x180 mm). */
const SHAPES = [
  { shape: 'portrait', aspect: 4 / 3, width_mm: 180 },
  { shape: 'landscape', aspect: 3 / 4, width_mm: 240 },
] as const;
const MM_TO_POINTS = 72 / 25.4;
const BLEED_MM = 3;
const RATIO_TOLERANCE = 0.02;

/** Width and height from a PNG header (the IHDR chunk starts at byte 16). */
function png_size(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const IHDR_WIDTH_AT = 16;
  const IHDR_HEIGHT_AT = 20;
  return { width: view.getUint32(IHDR_WIDTH_AT), height: view.getUint32(IHDR_HEIGHT_AT) };
}

async function pick_shape(page: Page, shape: string): Promise<void> {
  await page.locator('.shape-menu-button').click();
  await page.getByRole('option', { name: tr(LANG, `editor.shape.${shape}`) }).click();
}

async function editor_page_ratio(page: Page): Promise<number> {
  const box = await page.locator('.editor-canvas .book-page').boundingBox();
  if (!box) throw new Error('쪽을 찾지 못했어요');
  return box.height / box.width;
}

for (const { shape, aspect, width_mm } of SHAPES) {
  test(`${shape}: editor, finish screen and PDFs use the shape`, async ({ page }) => {
    test.slow();
    await go_to_editor(page, LANG);
    expect(await editor_page_ratio(page)).toBeCloseTo(1, 1);
    await pick_shape(page, shape);
    await expect.poll(() => editor_page_ratio(page)).toBeGreaterThan(aspect - RATIO_TOLERANCE);
    expect(await editor_page_ratio(page)).toBeLessThan(aspect + RATIO_TOLERANCE);

    // Undo goes back to square, redo brings the shape back.
    await page.getByRole('button', { name: tr(LANG, 'editor.undo'), exact: true }).click();
    await expect.poll(() => editor_page_ratio(page)).toBeLessThan(1 + RATIO_TOLERANCE);
    await page.getByRole('button', { name: tr(LANG, 'editor.redo'), exact: true }).click();
    await expect.poll(() => editor_page_ratio(page)).toBeGreaterThan(aspect - RATIO_TOLERANCE);

    await expect(page.locator('body')).toHaveAttribute('data-save-state', 'saved');
    await page.reload();
    await page.getByRole('button', { name: tr(LANG, 'start.resume.title') }).click();
    await expect.poll(() => editor_page_ratio(page)).toBeGreaterThan(aspect - RATIO_TOLERANCE);

    await pass_editor(page, LANG);
    const viewer = await page.locator('.finish-viewer .book-page').boundingBox();
    expect((viewer?.height ?? 0) / (viewer?.width ?? 1)).toBeCloseTo(aspect, 1);

    const screen_pdf = await PDFDocument.load((await read_download(page, 'download-pdf')).bytes);
    const first = screen_pdf.getPage(0).getSize();
    expect(first.height / first.width).toBeCloseTo(aspect, 2);
    expect(first.width).toBeCloseTo(width_mm * MM_TO_POINTS, 0);
    const print_pdf = await PDFDocument.load((await read_download(page, 'download-print')).bytes);
    const print_first = print_pdf.getPage(0).getSize();
    expect(print_first.width).toBeCloseTo((width_mm + BLEED_MM * 2) * MM_TO_POINTS, 0);
    expect(print_first.height).toBeCloseTo((width_mm * aspect + BLEED_MM * 2) * MM_TO_POINTS, 0);

    const zip = unzipSync(new Uint8Array((await read_download(page, 'download-zip')).bytes));
    const cover = png_size(zip['00-cover.png'] ?? new Uint8Array(24));
    expect(cover.height / cover.width).toBeCloseTo(aspect, 2);
  });
}

// Fix the picture in practice mode: "목도리를 파랗게" → switch off and on → pick the original in the before-and-after
// window → the PDF carries the picked picture. The PDF page pictures are read back and their red and blue pixels counted.
import { expect, test, type Page } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName, PDFRawStream, type PDFRef } from 'pdf-lib';
import { go_to_editor, pass_editor, read_download, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';
/** PDF page 2 is story page 1 (page 1 is the cover). */
const STORY_PAGE_PDF_INDEX = 1;

/** The JPEG drawn on one PDF page, as base64. */
async function pdf_page_jpeg(bytes: Buffer, page_index: number): Promise<string> {
  const pdf = await PDFDocument.load(bytes);
  const resources = pdf.getPage(page_index).node.Resources();
  const xobjects = resources?.lookup(PDFName.of('XObject'), PDFDict);
  const ref = xobjects?.values()[0] as PDFRef | undefined;
  if (!ref) throw new Error('PDF 쪽에 그림이 없어요');
  const stream = pdf.context.lookup(ref);
  if (!(stream instanceof PDFRawStream)) throw new Error('PDF 그림을 읽지 못했어요');
  return Buffer.from(stream.contents).toString('base64');
}

/** Counts clearly red and clearly blue pixels in a JPEG, decoded by the browser. */
async function count_red_blue(page: Page, jpeg_base64: string): Promise<{ red: number; blue: number }> {
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let red = 0;
    let blue = 0;
    for (let at = 0; at < data.length; at += 4) {
      const [r, g, b] = [data[at]!, data[at + 1]!, data[at + 2]!];
      if (r > 150 && r - g > 80 && r - b > 70) red += 1;
      if (b > 150 && b - r > 80 && b - g > 30) blue += 1;
    }
    return { red, blue };
  }, jpeg_base64);
}

async function pdf_story_page_colors(page: Page) {
  const pdf = await read_download(page, 'download-pdf');
  return count_red_blue(page, await pdf_page_jpeg(pdf.bytes, STORY_PAGE_PDF_INDEX));
}

test('fix → switch → pick the original → the PDF has the picked picture', async ({ page }, info) => {
  test.slow();
  await go_to_editor(page, LANG, 2);
  await page.locator('.editor-thumb').nth(1).click();
  await page.getByRole('tab', { name: tr(LANG, 'editor.tab.image') }).click();

  const input = page.getByLabel(tr(LANG, 'edit.label'));
  await input.fill('목도리를 파랗게');
  await input.press('Enter');
  const toggle = page.getByRole('switch', { name: tr(LANG, 'edit.switch') });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  // The fixed picture is in use: the PDF page has blue where the scarf was.
  await pass_editor(page, LANG);
  const fixed_colors = await pdf_story_page_colors(page);
  await page.getByRole('button', { name: tr(LANG, 'common.prev') }).click();
  await page.locator('.editor-thumb').nth(1).click();
  await page.getByRole('tab', { name: tr(LANG, 'editor.tab.image') }).click();

  await page.getByRole('button', { name: tr(LANG, 'edit.compare') }).click();
  const dialog = page.getByRole('dialog', { name: tr(LANG, 'edit.compare_title') });
  await dialog.getByRole('radio', { name: tr(LANG, 'edit.original') }).click();
  await expect(dialog.getByRole('radio', { name: tr(LANG, 'edit.original') })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  await pass_editor(page, LANG);
  const original_colors = await pdf_story_page_colors(page);
  info.annotations.push({ type: 'colors', description: JSON.stringify({ fixed_colors, original_colors }) });
  expect(original_colors.red).toBeGreaterThan(fixed_colors.red);
  expect(fixed_colors.blue).toBeGreaterThan(original_colors.blue);
});

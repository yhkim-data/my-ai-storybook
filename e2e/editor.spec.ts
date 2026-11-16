// Editor: text edits, box drag and resize, layout, font/color/background, page add/remove/move, undo, picture regen.
// Nothing except regenerating a picture may call the AI.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { exact_button, flip_pages, go_to_editor, pass_editor, read_usage_count, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';
/** Cover plus 8 story pages in the default mock book. */
const BOOK_PAGES = 9;
const DRAG_DISTANCE_PX = 80;
const DRAG_STEPS = 12;
const POSITION_TOLERANCE_PX = 2;
/** Snapping can shorten an 80px drag, so count anything over this as moved. */
const MIN_MOVED_PX = 40;
const UNDO_ROUNDS = 32;
const NAVY_RGB = 'rgb(23, 35, 58)';
const ORANGE_RGB = 'rgb(180, 65, 14)';

function text_box(page: Page): Locator {
  return page.getByTestId('text-box');
}

/** Page thumbnail; the cover is index 0. */
function thumb(page: Page, index: number): Locator {
  return page.locator('.editor-thumb').nth(index);
}

function undo_button(page: Page): Locator {
  return page.getByRole('button', { name: tr(LANG, 'editor.undo'), exact: true });
}

/** Text box position relative to the page's top-left corner, so scrolling does not change it. */
async function box_rect(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const rect = await text_box(page).boundingBox();
  const page_rect = await page.locator('.book-page').boundingBox();
  if (!rect || !page_rect) throw new Error('글상자를 찾지 못했어요');
  return { x: rect.x - page_rect.x, y: rect.y - page_rect.y, width: rect.width, height: rect.height };
}

/** Drags the handle by (dx, dy) with the mouse, also in the phone project. */
async function drag_by(page: Page, handle: Locator, dx: number, dy: number): Promise<void> {
  await handle.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const rect = await handle.boundingBox();
  if (!rect) throw new Error('끌 손잡이를 찾지 못했어요');
  const start_x = rect.x + rect.width / 2;
  const start_y = rect.y + rect.height / 2;
  await page.mouse.move(start_x, start_y);
  await page.mouse.down();
  await page.mouse.move(start_x + dx, start_y + dy, { steps: DRAG_STEPS });
  await page.mouse.up();
}

/** Goes to the editor, selects story page 1, and returns the AI call count at that point. */
async function prepare_editor(page: Page): Promise<number> {
  await go_to_editor(page, LANG);
  await thumb(page, 1).click();
  await expect(thumb(page, 1)).toHaveAttribute('aria-current', 'true');
  return read_usage_count(page);
}

test.describe('Editor', () => {
  test('edited text shows in the finish-screen viewer', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const new_text = '새로 고친 글입니다';
    await text_box(page).locator('textarea').fill(new_text);
    await expect(text_box(page).locator('textarea')).toHaveValue(new_text);
    await pass_editor(page, LANG);
    await flip_pages(page, LANG, 1);
    await expect(page.locator('.book-page')).toContainText(new_text);
    expect(await read_usage_count(page)).toBe(usage_before);
  });

  test('dragging the text box 80px moves it and undo restores it', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const handle = text_box(page).locator('textarea');
    const before = await box_rect(page);
    // In the default layout (image top, text bottom) the box sits low, so drag it up.
    await drag_by(page, handle, 0, -DRAG_DISTANCE_PX);
    const moved = await box_rect(page);
    expect(before.y - moved.y).toBeGreaterThan(MIN_MOVED_PX);
    await undo_button(page).click();
    const restored = await box_rect(page);
    expect(Math.abs(restored.y - before.y)).toBeLessThanOrEqual(POSITION_TOLERANCE_PX);
    expect(Math.abs(restored.x - before.x)).toBeLessThanOrEqual(POSITION_TOLERANCE_PX);
    expect(await read_usage_count(page)).toBe(usage_before);
  });

  test('dragging the corner resizes the text box', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const before = await box_rect(page);
    await drag_by(page, page.getByTestId('box-resize'), -DRAG_DISTANCE_PX / 2, -DRAG_DISTANCE_PX / 4);
    const resized = await box_rect(page);
    expect(before.width - resized.width).toBeGreaterThan(MIN_MOVED_PX / 2);
    expect(before.height - resized.height).toBeGreaterThan(MIN_MOVED_PX / 4);
    expect(await read_usage_count(page)).toBe(usage_before);
  });

  test('changing the layout moves the text box and undo restores it', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const top_layout = page.getByRole('button', { name: tr(LANG, 'editor.layout.image_top'), exact: true });
    const left_layout = page.getByRole('button', { name: tr(LANG, 'editor.layout.image_left'), exact: true });
    await expect(top_layout).toHaveAttribute('aria-pressed', 'true');
    const before = await box_rect(page);
    await left_layout.click();
    await expect(left_layout).toHaveAttribute('aria-pressed', 'true');
    await expect(top_layout).toHaveAttribute('aria-pressed', 'false');
    const changed = await box_rect(page);
    expect(changed.x).toBeGreaterThan(before.x + MIN_MOVED_PX);
    await undo_button(page).click();
    await expect(top_layout).toHaveAttribute('aria-pressed', 'true');
    await expect(left_layout).toHaveAttribute('aria-pressed', 'false');
    const restored = await box_rect(page);
    expect(Math.abs(restored.x - before.x)).toBeLessThanOrEqual(POSITION_TOLERANCE_PX);
    expect(Math.abs(restored.y - before.y)).toBeLessThanOrEqual(POSITION_TOLERANCE_PX);
    expect(await read_usage_count(page)).toBe(usage_before);
  });

  test('changes font, color, alignment and background', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const box = text_box(page);
    await page.locator('#font-pick').selectOption('hand');
    await expect(box).toHaveCSS('font-family', /Gaegu/);
    const orange = exact_button(page, tr(LANG, 'editor.color.orange'));
    await orange.click();
    await expect(orange).toHaveAttribute('aria-pressed', 'true');
    await expect(box).toHaveCSS('color', ORANGE_RGB);
    const center = exact_button(page, tr(LANG, 'editor.align.center'));
    await center.click();
    await expect(center).toHaveAttribute('aria-pressed', 'true');
    await expect(box).toHaveCSS('text-align', 'center');
    const white_bg = exact_button(page, tr(LANG, 'editor.bg.white'));
    await white_bg.click();
    await expect(white_bg).toHaveAttribute('aria-pressed', 'true');
    await expect(box).toHaveClass(/bg-white/);
    expect(await read_usage_count(page)).toBe(usage_before);
  });

  test('adds, removes and moves pages', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const first_text = await text_box(page).locator('textarea').inputValue();
    await expect(page.locator('.editor-thumb')).toHaveCount(BOOK_PAGES);

    await page.getByRole('button', { name: tr(LANG, 'editor.add_page'), exact: true }).click();
    await expect(page.locator('.editor-thumb')).toHaveCount(BOOK_PAGES + 1);
    await page.getByRole('button', { name: tr(LANG, 'editor.remove_page'), exact: true }).click();
    await expect(page.locator('.editor-thumb')).toHaveCount(BOOK_PAGES);

    // Moving page 1 down swaps it with page 2.
    await thumb(page, 1).click();
    await page.getByRole('button', { name: tr(LANG, 'editor.move_down'), exact: true }).click();
    await expect(thumb(page, 2)).toHaveAttribute('aria-current', 'true');
    await expect(text_box(page).locator('textarea')).toHaveValue(first_text);
    await thumb(page, 1).click();
    await expect(text_box(page).locator('textarea')).not.toHaveValue(first_text);
    await thumb(page, 2).click();
    await page.getByRole('button', { name: tr(LANG, 'editor.move_up'), exact: true }).click();
    await expect(thumb(page, 1)).toHaveAttribute('aria-current', 'true');
    await expect(text_box(page).locator('textarea')).toHaveValue(first_text);
    expect(await read_usage_count(page)).toBe(usage_before);
  });

  test('undo works 32 times in a row and returns to the original color', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const box = text_box(page);
    await expect(box).toHaveCSS('color', NAVY_RGB);
    const orange = exact_button(page, tr(LANG, 'editor.color.orange'));
    const blue = exact_button(page, tr(LANG, 'editor.color.blue'));
    // Alternate two colors so each click is a distinct change.
    for (let round = 0; round < UNDO_ROUNDS; round += 1) {
      await (round % 2 === 0 ? orange : blue).click();
    }
    await expect(blue).toHaveAttribute('aria-pressed', 'true');
    for (let round = 0; round < UNDO_ROUNDS; round += 1) {
      await expect(undo_button(page)).toBeEnabled();
      await undo_button(page).click();
    }
    await expect(box).toHaveCSS('color', NAVY_RGB);
    await expect(undo_button(page)).toBeDisabled();
    expect(await read_usage_count(page)).toBe(usage_before);
  });

  test('regenerating one picture adds one AI call and leaves other pages unchanged', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const thumbs = page.locator('.editor-thumb');
    const styles_before = await thumbs.evaluateAll((elements) => elements.map((element) => element.getAttribute('style')));
    expect(styles_before.every((style) => (style ?? '').includes('background-image'))).toBe(true);

    const regen = page.getByRole('button', { name: tr(LANG, 'editor.regen'), exact: true });
    await regen.click();
    await expect(regen).toBeEnabled();
    await expect.poll(() => read_usage_count(page)).toBe(usage_before + 1);

    const styles_after = await thumbs.evaluateAll((elements) => elements.map((element) => element.getAttribute('style')));
    expect(styles_after).toHaveLength(styles_before.length);
    styles_before.forEach((style, index) => {
      if (index !== 1) expect(styles_after[index], `${index}번 쪽 그림이 바뀌었어요`).toBe(style);
    });
  });
});

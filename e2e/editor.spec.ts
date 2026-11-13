// 꾸미기: 글 고치기, 글상자 끌기·크기 바꾸기, 배치, 글꼴·색·바탕, 쪽 더하기·빼기·옮기기, 되돌리기, 그림 다시 만들기.
// 다시 만들기 말고는 AI를 한 번도 부르지 않아야 한다.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { exact_button, flip_pages, go_to_editor, pass_editor, read_usage_count, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';
/** 연습 모드 기본 책의 전체 쪽수(표지 + 본문 8쪽) */
const BOOK_PAGES = 9;
/** 글상자를 끄는 거리(px) */
const DRAG_DISTANCE_PX = 80;
/** 끌기를 나눠 보내는 단계 수 */
const DRAG_STEPS = 12;
/** 위치·크기 비교에서 허용하는 오차(px) */
const POSITION_TOLERANCE_PX = 2;
/** 끌어서 위치가 바뀌었다고 볼 최소 거리(px). 자석 붙기 때문에 80px보다 조금 작아도 된다. */
const MIN_MOVED_PX = 40;
/** 되돌리기를 시험하는 횟수 */
const UNDO_ROUNDS = 32;
/** 글자 색 값 */
const NAVY_RGB = 'rgb(23, 35, 58)';
const ORANGE_RGB = 'rgb(180, 65, 14)';

/** 글상자 */
function text_box(page: Page): Locator {
  return page.getByTestId('text-box');
}

/** 쪽 단추 (표지는 0번) */
function thumb(page: Page, index: number): Locator {
  return page.locator('.editor-thumb').nth(index);
}

/** 되돌리기 단추 */
function undo_button(page: Page): Locator {
  return page.getByRole('button', { name: tr(LANG, 'editor.undo'), exact: true });
}

/** 글상자의 위치(쪽 왼쪽 위 모서리 기준)와 크기. 화면이 스크롤돼도 같은 값이 나온다. */
async function box_rect(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const rect = await text_box(page).boundingBox();
  const page_rect = await page.locator('.book-page').boundingBox();
  if (!rect || !page_rect) throw new Error('글상자를 찾지 못했어요');
  return { x: rect.x - page_rect.x, y: rect.y - page_rect.y, width: rect.width, height: rect.height };
}

/**
 * 손잡이를 마우스로 (dx, dy)만큼 끈다. 휴대폰 project에서도 마우스로 한다.
 */
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

/**
 * 꾸미기 화면까지 가서 본문 첫 쪽(1쪽)을 고른다. 이때의 AI 호출 횟수도 함께 돌려준다.
 */
async function prepare_editor(page: Page): Promise<number> {
  await go_to_editor(page, LANG);
  await thumb(page, 1).click();
  await expect(thumb(page, 1)).toHaveAttribute('aria-current', 'true');
  return read_usage_count(page);
}

test.describe('꾸미기', () => {
  test('글 고치기: 쓴 글이 완성 화면 넘겨보기에 보인다', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const new_text = '새로 고친 글입니다';
    await text_box(page).locator('textarea').fill(new_text);
    await expect(text_box(page).locator('textarea')).toHaveValue(new_text);
    await pass_editor(page, LANG);
    await flip_pages(page, LANG, 1);
    await expect(page.locator('.book-page')).toContainText(new_text);
    expect(await read_usage_count(page)).toBe(usage_before);
  });

  test('글상자 끌기: 80px 옮기면 위치가 바뀌고 되돌리기로 돌아온다', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const handle = text_box(page).locator('textarea');
    const before = await box_rect(page);
    // 처음 배치(그림 위, 글 아래)에서는 글상자가 아래쪽에 있어서 위로 끈다.
    await drag_by(page, handle, 0, -DRAG_DISTANCE_PX);
    const moved = await box_rect(page);
    expect(before.y - moved.y).toBeGreaterThan(MIN_MOVED_PX);
    await undo_button(page).click();
    const restored = await box_rect(page);
    expect(Math.abs(restored.y - before.y)).toBeLessThanOrEqual(POSITION_TOLERANCE_PX);
    expect(Math.abs(restored.x - before.x)).toBeLessThanOrEqual(POSITION_TOLERANCE_PX);
    expect(await read_usage_count(page)).toBe(usage_before);
  });

  test('글상자 크기: 모서리를 끌면 크기가 바뀐다', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const before = await box_rect(page);
    await drag_by(page, page.getByTestId('box-resize'), -DRAG_DISTANCE_PX / 2, -DRAG_DISTANCE_PX / 4);
    const resized = await box_rect(page);
    expect(before.width - resized.width).toBeGreaterThan(MIN_MOVED_PX / 2);
    expect(before.height - resized.height).toBeGreaterThan(MIN_MOVED_PX / 4);
    expect(await read_usage_count(page)).toBe(usage_before);
  });

  test('배치 바꾸기: 글상자 자리가 바뀌고 되돌리기로 돌아온다', async ({ page }) => {
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

  test('글꼴·색·맞춤·바탕 바꾸기', async ({ page }) => {
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

  test('쪽 더하기·빼기·옮기기', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const first_text = await text_box(page).locator('textarea').inputValue();
    await expect(page.locator('.editor-thumb')).toHaveCount(BOOK_PAGES);

    await page.getByRole('button', { name: tr(LANG, 'editor.add_page'), exact: true }).click();
    await expect(page.locator('.editor-thumb')).toHaveCount(BOOK_PAGES + 1);
    await page.getByRole('button', { name: tr(LANG, 'editor.remove_page'), exact: true }).click();
    await expect(page.locator('.editor-thumb')).toHaveCount(BOOK_PAGES);

    // 1쪽을 뒤로 옮기면 2쪽 자리로 가고, 원래 2쪽이 1쪽이 된다.
    await thumb(page, 1).click();
    await page.getByRole('button', { name: tr(LANG, 'editor.move_down'), exact: true }).click();
    await expect(thumb(page, 2)).toHaveAttribute('aria-current', 'true');
    await expect(text_box(page).locator('textarea')).toHaveValue(first_text);
    await thumb(page, 1).click();
    await expect(text_box(page).locator('textarea')).not.toHaveValue(first_text);
    // 다시 앞으로 옮기면 처음 자리로 돌아온다.
    await thumb(page, 2).click();
    await page.getByRole('button', { name: tr(LANG, 'editor.move_up'), exact: true }).click();
    await expect(thumb(page, 1)).toHaveAttribute('aria-current', 'true');
    await expect(text_box(page).locator('textarea')).toHaveValue(first_text);
    expect(await read_usage_count(page)).toBe(usage_before);
  });

  test('되돌리기를 32번 눌러도 계속 동작하고 처음 색으로 돌아온다', async ({ page }) => {
    const usage_before = await prepare_editor(page);
    const box = text_box(page);
    await expect(box).toHaveCSS('color', NAVY_RGB);
    const orange = exact_button(page, tr(LANG, 'editor.color.orange'));
    const blue = exact_button(page, tr(LANG, 'editor.color.blue'));
    // 색 두 개를 번갈아 눌러 서로 다른 바꿈을 32번 만든다.
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

  test('이 그림만 다시 만들기: 호출이 1 늘고 다른 쪽 그림은 그대로다', async ({ page }) => {
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

// 체험판 보기와 키보드만으로 쓰기, 그리고 모든 그림에 대체 글이 있는지 본다.
import { expect, test, type Page } from '@playwright/test';
import {
  DEFAULT_PAGE_COUNT,
  EXTRA_PAGES,
  SAMPLE_INPUT,
  exact_button,
  flip_pages,
  go_to_finish,
  go_to_pictures,
  make_all_pictures,
  open_start,
  tab_until_focused,
  tr,
  type Lang,
} from './helpers';

const LANG: Lang = 'ko';
/** 시작 화면을 연 뒤 체험판이 보여야 하는 시간(ms) */
const DEMO_DEADLINE_MS = 30_000;

/**
 * 비어 있는 alt를 가진 그림(img)의 개수를 센다.
 */
async function count_images_without_alt(page: Page): Promise<number> {
  return page.locator('img').evaluateAll((images) => images.filter((image) => !(image.getAttribute('alt') ?? '').trim()).length);
}

test.describe('체험판 보기', () => {
  test('30초 안에 완성된 예시 책이 보이고 마지막 쪽까지 넘기며, 저장되지 않는다', async ({ page }) => {
    await open_start(page, LANG);
    await page.getByRole('button', { name: tr(LANG, 'start.demo.title') }).click({ timeout: DEMO_DEADLINE_MS });
    await expect(page.getByRole('heading', { name: tr(LANG, 'finish.heading') })).toBeVisible({ timeout: DEMO_DEADLINE_MS });
    await expect(page.getByText(tr(LANG, 'finish.demo_badge'))).toBeVisible();
    await expect(page.locator('.book-page img')).toBeAttached();

    // 마지막 쪽(만든 사람)까지 넘긴다.
    const total_pages = DEFAULT_PAGE_COUNT + EXTRA_PAGES;
    await flip_pages(page, LANG, total_pages - 1);
    await expect(page.getByText(tr(LANG, 'finish.page_of', { n: total_pages, total: total_pages }))).toBeVisible();
    await expect(page.locator('[data-page-id="credits"]')).toContainText(tr(LANG, 'credits.heading'));

    // 나도 만들어 보기 → 시작 화면. 체험판은 저장되지 않아서 이어 만들기가 꺼져 있다.
    await page.getByRole('button', { name: tr(LANG, 'finish.demo_start'), exact: true }).click();
    await expect(page.getByRole('button', { name: tr(LANG, 'start.new.title') })).toBeVisible();
    await expect(page.getByRole('button', { name: tr(LANG, 'start.resume.title') })).toBeDisabled();
    await expect(page.locator('body')).toHaveAttribute('data-save-state', 'idle');
  });
});

test.describe('키보드만으로', () => {
  test('Tab·Space·Enter와 글자 입력만으로 새 책 → 씨앗 채우기 → 줄거리 화면에 도착한다', async ({ page }) => {
    await open_start(page, LANG);
    const input = SAMPLE_INPUT[LANG];

    // 시작 화면: 새 책 만들기에 포커스가 올 때까지 Tab, Enter
    await tab_until_focused(page, page.getByRole('button', { name: tr(LANG, 'start.new.title') }));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: tr(LANG, 'seed.heading') })).toBeVisible();

    // 씨앗 화면: 주제 칩은 Space, 이름은 글자 입력, 다음은 Enter
    const topic_chip = exact_button(page, tr(LANG, 'seed.topic.adventure'));
    await tab_until_focused(page, topic_chip);
    await page.keyboard.press('Space');
    await expect(topic_chip).toHaveAttribute('aria-pressed', 'true');
    await tab_until_focused(page, page.locator('#hero-name'));
    await page.keyboard.type(input.hero_name);
    await expect(page.locator('#hero-name')).toHaveValue(input.hero_name);
    await tab_until_focused(page, exact_button(page, tr(LANG, 'common.next')));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: tr(LANG, 'plot.heading') })).toBeVisible();
  });
});

test.describe('그림의 대체 글', () => {
  test('그림 화면의 모든 그림(img)에 비어 있지 않은 alt가 있다', async ({ page }) => {
    test.slow();
    await go_to_pictures(page, LANG);
    expect(await count_images_without_alt(page)).toBe(0);
    await make_all_pictures(page, LANG);
    await expect(page.locator('.pic-frame img')).toBeAttached();
    expect(await count_images_without_alt(page)).toBe(0);
  });

  test('완성 화면의 모든 쪽 그림에 비어 있지 않은 alt가 있다', async ({ page }) => {
    test.slow();
    await go_to_finish(page, LANG);
    const total_pages = DEFAULT_PAGE_COUNT + EXTRA_PAGES;
    const next_button = page.getByRole('button', { name: tr(LANG, 'finish.next_page'), exact: true });
    for (let index = 0; index < total_pages; index += 1) {
      expect(await count_images_without_alt(page), `${index + 1}번째 쪽`).toBe(0);
      if (index < total_pages - 1) await next_button.click();
    }
  });
});

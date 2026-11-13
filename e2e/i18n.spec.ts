// 번역 빠짐과 쉬운 말: 모든 화면에서 번역 키가 드러나지 않고, 어려운 말이 없고, 영어 화면에 한글이 남지 않는지,
// DI Lab 표시가 정해진 자리에만 있는지 본다.
import { expect, test, type Page } from '@playwright/test';
import {
  EXTRA_PAGES,
  DEFAULT_PAGE_COUNT,
  choose_first_plot,
  exact_button,
  fill_seed,
  find_screen_problems,
  make_all_pictures,
  open_start,
  pass_editor,
  pass_pages,
  pass_pictures,
  pass_style,
  start_new_book,
  tr,
  type Lang,
} from './helpers';

/** 검사할 언어 */
const LANG_CASES: { lang: Lang; label: string }[] = [
  { lang: 'ko', label: '한국어' },
  { lang: 'en', label: '영어' },
];
/** 책 쪽에 들어가면 안 되는 표기 */
const DILAB_TEXT = 'DI Lab';
const MADE_BY_TEXT = 'Data Insight Lab';

/**
 * 지금 화면이 번역과 쉬운 말 기준을 지키는지, 머리글에 DI Lab 표시가 있는지 본다.
 */
async function check_screen(page: Page, lang: Lang, screen_name: string): Promise<void> {
  const problems = await find_screen_problems(page, lang);
  expect(problems, `${screen_name} 화면 문제`).toEqual([]);
  await expect(page.locator('header .dilab-badge').first(), `${screen_name} 화면의 DI Lab 표시`).toHaveText(DILAB_TEXT);
}

/**
 * 바닥글에 "DI Lab"과 "Data Insight Lab"이 있는지 본다.
 */
async function expect_made_by_footer(page: Page): Promise<void> {
  await expect(page.locator('footer')).toContainText(DILAB_TEXT);
  await expect(page.locator('footer')).toContainText(MADE_BY_TEXT);
}

for (const { lang, label } of LANG_CASES) {
  test(`번역 빠짐·쉬운 말 (${label}): 모든 화면을 돌며 본다`, async ({ page }) => {
    test.slow();
    await open_start(page, lang, { mock: true });

    // 시작 화면
    await check_screen(page, lang, '시작');
    await expect_made_by_footer(page);

    // AI 연결하기
    await page.getByRole('button', { name: tr(lang, 'start.connect') }).click();
    await expect(page.locator('#key-input')).toBeVisible();
    await check_screen(page, lang, 'AI 연결하기');
    await page.locator('summary').click();
    await check_screen(page, lang, 'AI 연결하기(자세한 설정)');
    await exact_button(page, tr(lang, 'common.home')).click();

    // 권리 안내
    await page.getByRole('button', { name: tr(lang, 'start.rights_link') }).click();
    await expect(page.getByRole('heading', { name: tr(lang, 'rights.heading') })).toBeVisible();
    await check_screen(page, lang, '권리 안내');
    await exact_button(page, tr(lang, 'common.home')).click();

    // 씨앗 → 줄거리 → 쪽 나누기 → 그림체 → 그림
    await start_new_book(page, lang);
    await check_screen(page, lang, '씨앗');
    await fill_seed(page, lang);
    await expect(page.locator('button.card.selectable')).toHaveCount(3);
    await check_screen(page, lang, '줄거리');
    await choose_first_plot(page, lang);
    await expect(page.locator('#page-text-1')).toBeVisible();
    await check_screen(page, lang, '쪽 나누기');
    await pass_pages(page, lang);
    await check_screen(page, lang, '그림체');
    await pass_style(page, lang);
    await make_all_pictures(page, lang);
    await check_screen(page, lang, '그림');

    // 꾸미기
    await pass_pictures(page, lang);
    await check_screen(page, lang, '꾸미기');
    await expect_made_by_footer(page);

    // 완성: 모든 쪽을 넘겨 보며 책 쪽 안에 DI Lab이 없는지 본다.
    await pass_editor(page, lang);
    await check_screen(page, lang, '완성');
    const total_pages = DEFAULT_PAGE_COUNT + EXTRA_PAGES;
    const next_button = page.getByRole('button', { name: tr(lang, 'finish.next_page'), exact: true });
    for (let index = 0; index < total_pages; index += 1) {
      const book_page_text = (await page.locator('.book-page').allInnerTexts()).join('\n');
      expect(book_page_text, `${index + 1}번째 책 쪽에 DI Lab 표기가 있어요`).not.toContain(DILAB_TEXT);
      if (index < total_pages - 1) await next_button.click();
    }
    await expect(page.locator('[data-page-id="credits"]')).toBeVisible();
  });
}

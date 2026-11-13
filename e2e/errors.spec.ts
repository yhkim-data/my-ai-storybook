// 한도와 오류: 가짜 연결부가 오류를 흉내 내게 해서 안내 문구와 다시 하기가 동작하는지 본다.
import { expect, test, type Page } from '@playwright/test';
import {
  choose_first_plot,
  click_by_event,
  exact_button,
  expect_no_h_scroll,
  fill_seed,
  open_start,
  pass_pages,
  pass_style,
  start_new_book,
  tr,
  type Lang,
  type OpenOptions,
} from './helpers';

type FailKind = NonNullable<OpenOptions['mockfail']>;

/** 흉내 낸 분당 한도가 풀리기를 기다리는 시간(ms). 앱은 2초 뒤에 풀어 준다. */
const RATE_RELEASE_WAIT_MS = 10_000;
/** 줄거리 제안 개수 */
const PLOT_COUNT = 3;

/** 오류 종류별 안내 문구 (한국어와 영어) */
const MESSAGES: Record<Exclude<FailKind, 'quota'>, Record<Lang, string>> = {
  rate: { ko: '조금 뒤에 다시 해 볼게요', en: "Let's try again in a little while" },
  blocked: {
    ko: '이 내용으로는 만들 수 없어요. 다른 말로 바꿔 볼까요?',
    en: "We can't make it with these words. Shall we try different words?",
  },
  network: { ko: '인터넷 연결이 끊긴 것 같아요', en: 'The internet seems to be off' },
};

/**
 * "다시 하기" 단추를 돌려준다. 분당 한도 중에는 "다시 하기 (n초 뒤)"로 보인다.
 */
function retry_button(page: Page, lang: Lang) {
  return page.getByRole('button', { name: tr(lang, 'error.retry'), exact: false }).first();
}

/**
 * 오류 안내를 보여 주는 띠.
 */
function error_alert(page: Page) {
  return page.getByRole('alert');
}

/**
 * 오류를 흉내 내는 연습 모드로 열어 줄거리 화면까지 간다.
 */
async function reach_plot(page: Page, lang: Lang, kind: FailKind): Promise<void> {
  await open_start(page, lang, { mock: true, mockfail: kind });
  await start_new_book(page, lang);
  await fill_seed(page, lang);
}

/**
 * 다시 하기를 누른다. 분당 한도면 단추가 처음엔 꺼져 있다가 켜지는 것도 본다.
 */
async function press_retry(page: Page, lang: Lang, kind: FailKind): Promise<void> {
  const retry = retry_button(page, lang);
  if (kind === 'rate') {
    await expect(retry).toBeDisabled();
    await expect(retry).toBeEnabled({ timeout: RATE_RELEASE_WAIT_MS });
  }
  // 휴대폰 그림 화면은 쪽 목록이 넘쳐서 마우스 클릭이 어긋나므로(앱 쪽 문제) 클릭 사건을 직접 보낸다.
  await click_by_event(retry);
}

test.describe('한도와 오류', () => {
  test('하루 한도(quota): 안내와 시간이 보이고 다시 하기 없이 직접 써서 계속할 수 있다', async ({ page }) => {
    await reach_plot(page, 'ko', 'quota');
    await expect(error_alert(page)).toContainText('오늘 쓸 수 있는 횟수를 다 썼어요');
    await expect(error_alert(page)).toContainText(/\d{1,2}:\d{2}부터 다시 쓸 수 있어요/);
    await expect(page.getByRole('button', { name: tr('ko', 'error.retry'), exact: true })).toHaveCount(0);
    await expect_no_h_scroll(page);

    await page.getByRole('button', { name: tr('ko', 'plot.self'), exact: true }).first().click();
    await expect(error_alert(page)).toHaveCount(0);
    await page.locator('#plot-title').fill('직접 쓴 제목');
    await exact_button(page, tr('ko', 'common.next')).click();
    await expect(page.getByRole('heading', { name: tr('ko', 'pages.heading') })).toBeVisible();
    await expect(page.locator('#page-text-1')).toBeVisible();
  });

  const retry_kinds: Exclude<FailKind, 'quota'>[] = ['rate', 'blocked', 'network'];
  for (const kind of retry_kinds) {
    test(`줄거리 ${kind}: 안내가 보이고 다시 하기로 줄거리 3개가 온다`, async ({ page }) => {
      await reach_plot(page, 'ko', kind);
      await expect(error_alert(page)).toContainText(MESSAGES[kind].ko);
      await press_retry(page, 'ko', kind);
      await expect(page.locator('button.card.selectable')).toHaveCount(PLOT_COUNT);
      await expect(error_alert(page)).toHaveCount(0);
    });
  }

  test('영어 화면: 차단(blocked) 안내가 영어로 보이고 다시 하기로 성공한다', async ({ page }) => {
    await reach_plot(page, 'en', 'blocked');
    await expect(error_alert(page)).toContainText(MESSAGES.blocked.en);
    await press_retry(page, 'en', 'blocked');
    await expect(page.locator('button.card.selectable')).toHaveCount(PLOT_COUNT);
  });

  for (const kind of ['blocked', 'rate'] as const) {
    test(`그림 화면 ${kind}: 줄거리·쪽 나누기 실패를 넘긴 뒤 그림 만들기도 안내와 다시 하기가 된다`, async ({ page }) => {
      test.slow();
      await reach_plot(page, 'ko', kind);
      // 줄거리 실패를 다시 하기로 넘긴다.
      await expect(error_alert(page)).toContainText(MESSAGES[kind].ko);
      await press_retry(page, 'ko', kind);
      await choose_first_plot(page, 'ko');
      // 쪽 나누기도 처음 한 번은 실패한다.
      await expect(error_alert(page)).toContainText(MESSAGES[kind].ko);
      await press_retry(page, 'ko', kind);
      await pass_pages(page, 'ko');
      await pass_style(page, 'ko');

      // 그림 만들기: 처음 한 번 실패하고 다시 하면 그림이 생긴다.
      await expect(page.locator('.pic-frame.empty')).toBeVisible();
      await click_by_event(page.getByRole('button', { name: tr('ko', 'pictures.ai.title') }));
      await expect(error_alert(page)).toContainText(MESSAGES[kind].ko);
      await press_retry(page, 'ko', kind);
      await expect(page.locator('.pic-frame img')).toBeAttached();
      await expect(error_alert(page)).toHaveCount(0);
    });
  }
});

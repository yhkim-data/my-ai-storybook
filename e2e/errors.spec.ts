// Limits and errors: the mock provider simulates failures to test messages and retry.
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

/** Wait (ms) for the simulated per-minute limit to clear; the app clears it after 2 s. */
const RATE_RELEASE_WAIT_MS = 10_000;
const PLOT_COUNT = 3;

const MESSAGES: Record<Exclude<FailKind, 'quota'>, Record<Lang, string>> = {
  rate: { ko: '조금 뒤에 다시 해 볼게요', en: "Let's try again in a little while" },
  blocked: {
    ko: '이 내용으로는 만들 수 없어요. 다른 말로 바꿔 볼까요?',
    en: "We can't make it with these words. Shall we try different words?",
  },
  network: { ko: '인터넷 연결이 끊긴 것 같아요', en: 'The internet seems to be off' },
};

/** Not an exact match: during the rate limit the label reads "Retry (n s)". */
function retry_button(page: Page, lang: Lang) {
  return page.getByRole('button', { name: tr(lang, 'error.retry'), exact: false }).first();
}

function error_alert(page: Page) {
  return page.getByRole('alert');
}

/** Opens mock mode with the given simulated failure and goes to the plot screen. */
async function reach_plot(page: Page, lang: Lang, kind: FailKind): Promise<void> {
  await open_start(page, lang, { mock: true, mockfail: kind });
  await start_new_book(page, lang);
  await fill_seed(page, lang);
}

/** Clicks retry. For the rate limit, also checks the button starts disabled and then enables. */
async function press_retry(page: Page, lang: Lang, kind: FailKind): Promise<void> {
  const retry = retry_button(page, lang);
  if (kind === 'rate') {
    await expect(retry).toBeDisabled();
    await expect(retry).toBeEnabled({ timeout: RATE_RELEASE_WAIT_MS });
  }
  // On the phone pictures screen the page list overflows and mouse clicks miss (an app issue).
  await click_by_event(retry);
}

test.describe('Limits and errors', () => {
  test('daily quota shows the message and reset time, no retry, and writing by hand still works', async ({ page }) => {
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
    test(`plot ${kind}: shows the message and retry brings 3 plots`, async ({ page }) => {
      await reach_plot(page, 'ko', kind);
      await expect(error_alert(page)).toContainText(MESSAGES[kind].ko);
      await press_retry(page, 'ko', kind);
      await expect(page.locator('button.card.selectable')).toHaveCount(PLOT_COUNT);
      await expect(error_alert(page)).toHaveCount(0);
    });
  }

  test('English UI: blocked message is in English and retry succeeds', async ({ page }) => {
    await reach_plot(page, 'en', 'blocked');
    await expect(error_alert(page)).toContainText(MESSAGES.blocked.en);
    await press_retry(page, 'en', 'blocked');
    await expect(page.locator('button.card.selectable')).toHaveCount(PLOT_COUNT);
  });

  for (const kind of ['blocked', 'rate'] as const) {
    test(`pictures ${kind}: after retrying plot and page split, picture making also shows the message and retries`, async ({ page }) => {
      test.slow();
      await reach_plot(page, 'ko', kind);
      await expect(error_alert(page)).toContainText(MESSAGES[kind].ko);
      await press_retry(page, 'ko', kind);
      await choose_first_plot(page, 'ko');
      // The page split also fails once.
      await expect(error_alert(page)).toContainText(MESSAGES[kind].ko);
      await press_retry(page, 'ko', kind);
      await pass_pages(page, 'ko');
      await pass_style(page, 'ko');

      // The first picture attempt fails; retry produces the picture.
      await expect(page.locator('.pic-frame.empty')).toBeVisible();
      await click_by_event(page.getByRole('button', { name: tr('ko', 'pictures.ai.title') }));
      await expect(error_alert(page)).toContainText(MESSAGES[kind].ko);
      await press_retry(page, 'ko', kind);
      await expect(page.locator('.pic-frame img')).toBeAttached();
      await expect(error_alert(page)).toHaveCount(0);
    });
  }
});

// 실제 AI 연결 검사: 환경 변수 GEMINI_API_KEY가 있을 때만 돈다. 키는 코드나 로그에 남기지 않는다.
import { expect, test } from '@playwright/test';
import { SETTINGS_KEY, fill_seed, open_start, start_new_book, tr } from './helpers';

const LANG = 'ko';
/** 실제 호출을 기다리는 시간(ms) */
const REAL_CALL_WAIT_MS = 90_000;
/** 줄거리 제안 개수 */
const PLOT_COUNT = 3;

test('실제 연결: 줄거리 3개가 실제로 온다', async ({ page }) => {
  const api_key = process.env.GEMINI_API_KEY;
  test.skip(!api_key, '환경 변수 GEMINI_API_KEY가 없어서 실제 호출 검사를 건너뜁니다');
  test.setTimeout(REAL_CALL_WAIT_MS * 2);

  // 키는 브라우저 저장 공간에만 넣는다 (출력하지 않는다).
  await page.addInitScript(
    ([settings_key, key]) => {
      localStorage.setItem(settings_key as string, JSON.stringify({ lang: 'ko', text_key: key }));
    },
    [SETTINGS_KEY, api_key ?? ''],
  );
  await open_start(page, LANG);
  await start_new_book(page, LANG);
  await fill_seed(page, LANG);
  await expect(page.locator('button.card.selectable')).toHaveCount(PLOT_COUNT, { timeout: REAL_CALL_WAIT_MS });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: tr(LANG, 'plot.heading') })).toBeVisible();
});

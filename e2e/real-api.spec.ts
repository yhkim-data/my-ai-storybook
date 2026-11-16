// Real AI calls. Runs only when GEMINI_API_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY is set. Keys never go into code or logs.
import { expect, test } from '@playwright/test';
import { SETTINGS_KEY, fill_seed, open_start, start_new_book, tr } from './helpers';

const LANG = 'ko';
const REAL_CALL_WAIT_MS = 90_000;
const PLOT_COUNT = 3;

const REAL_PROVIDERS: { name: string; env_name: string }[] = [
  { name: 'Gemini', env_name: 'GEMINI_API_KEY' },
  { name: 'Claude', env_name: 'ANTHROPIC_API_KEY' },
  { name: 'OpenAI', env_name: 'OPENAI_API_KEY' },
];

for (const provider of REAL_PROVIDERS) {
  test(`real provider (${provider.name}): returns 3 real plots`, async ({ page }) => {
    const api_key = process.env[provider.env_name];
    test.skip(!api_key, `${provider.env_name} is not set, skipping the real-call test`);
    test.setTimeout(REAL_CALL_WAIT_MS * 2);

    // The key goes only into browser storage and is never printed.
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
}

// Settings file on the connect screen: the saved file has no key; loading a teacher's file shows its connection as
// "needs a key", and a key hidden in a file is thrown away with a notice.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { open_start, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';
const KEY = 'test-key-for-settings-W1x2';
/** Built in pieces so the secret scanner does not see a key-shaped string. */
const KEY_LIKE = 'sk-' + 'fakeFAKE5678';

test('save without the key, load a class file, and drop a key hidden in a file', async ({ page }) => {
  await open_start(page, LANG, { mock: true });
  await page.getByRole('button', { name: tr(LANG, 'start.connect') }).click();
  await page.getByRole('checkbox', { name: tr(LANG, 'connect.own_key') }).check();
  await page.locator('#key-input').fill(KEY);
  await page.getByRole('button', { name: tr(LANG, 'connect.check'), exact: true }).click();
  await expect(page.getByText(tr(LANG, 'connect.ok', { name: 'Google Gemini', tail: 'W1x2' }))).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: tr(LANG, 'settings_file.save') }).click()]);
  expect(download.suggestedFilename()).toBe('나만의-AI-동화책-설정.json');
  const saved = readFileSync(await download.path(), 'utf8');
  expect(saved).not.toContain(KEY);
  expect(JSON.parse(saved).kind).toBe('storybook-settings');

  const class_file = {
    kind: 'storybook-settings',
    version: 1,
    lang: 'ko',
    connections: [{ id: 'class', kind: 'openai', label: '3반 수업용', text_model: 'gpt-6-luna', image_model: 'gpt-image-2.6-flare', key: KEY_LIKE }],
    text_connection: 'class',
    image_connection: null,
    image_limit: 20,
    idle_minutes: 15,
  };
  await page.getByTestId('settings-file-input').setInputFiles({ name: 'class.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(class_file)) });
  await expect(page.getByText(tr(LANG, 'settings_file.loaded'))).toBeVisible();
  await expect(page.getByText(tr(LANG, 'settings_file.had_key'))).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(KEY_LIKE);

  await page.getByRole('button', { name: tr(LANG, 'common.home'), exact: true }).click();
  await page.locator('.usage-chip').click();
  const panel = page.getByRole('dialog', { name: tr(LANG, 'usage.title') });
  await expect(panel.getByLabel(tr(LANG, 'usage.limit_label'))).toHaveValue('20');
  const text_select = panel.getByLabel(tr(LANG, 'usage.text_role'));
  await expect(text_select.locator('option', { hasText: `3반 수업용 (${tr(LANG, 'usage.needs_key')})` })).toHaveCount(1);
});

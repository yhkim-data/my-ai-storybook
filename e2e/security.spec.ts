// Site security: the built page carries the CSP and no-referrer tags, a whole book flow (fix, exports, connect screen,
// usage panel, terms) causes no CSP violation, and inside another site's frame the app does not start.
import { expect, test, type Page } from '@playwright/test';
import { go_to_editor, pass_editor, read_download, tr, type Lang } from './helpers';

const LANG: Lang = 'ko';

/** Records every CSP violation the page reports. */
async function watch_csp(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = seen;
    document.addEventListener('securitypolicyviolation', (event) => seen.push(`${event.violatedDirective} ${event.blockedURI}`));
  });
  return () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp ?? []);
}

test('the built page has the CSP and referrer tags', async ({ page }) => {
  const html = await (await page.request.get('./')).text();
  expect(html).toContain('http-equiv="Content-Security-Policy"');
  expect(html).toContain("script-src &#39;self&#39;");
  expect(html).toContain("connect-src &#39;self&#39; https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com");
  expect(html).not.toContain('unsafe-inline');
  expect(html).not.toContain('unsafe-eval');
  expect(html).toContain('<meta name="referrer" content="no-referrer">');
});

test('a whole book with a fix and every export causes no CSP violation', async ({ page }) => {
  test.slow();
  const violations = await watch_csp(page);
  await go_to_editor(page, LANG, 2);
  await page.locator('.editor-thumb').nth(1).click();
  await page.getByRole('tab', { name: tr(LANG, 'editor.tab.image') }).click();
  const input = page.getByLabel(tr(LANG, 'edit.label'));
  await input.fill('목도리를 파랗게');
  await input.press('Enter');
  await expect(page.getByRole('switch', { name: tr(LANG, 'edit.switch') })).toBeVisible();
  await page.locator('.usage-chip').click();
  await page.keyboard.press('Escape');
  await pass_editor(page, LANG);
  for (const id of ['download-pdf', 'download-print', 'download-zip', 'download-file']) await read_download(page, id);
  await page.getByRole('button', { name: tr(LANG, 'common.home') }).last().click();
  await page.getByRole('button', { name: tr(LANG, 'start.connect') }).click();
  await page.getByRole('button', { name: tr(LANG, 'common.home'), exact: true }).click();
  await page.getByRole('button', { name: tr(LANG, 'start.rights_link') }).click();
  await expect(page.getByRole('heading', { level: 1, name: tr(LANG, 'rights.title') })).toBeVisible();
  expect(await violations()).toEqual([]);
});

test('inside another site frame, only the "open in a new window" message shows', async ({ page, baseURL }) => {
  await page.setContent(`<iframe src="${baseURL}?mock=1" style="width:800px;height:600px"></iframe>`);
  const frame = page.frameLocator('iframe');
  await expect(frame.getByText(tr(LANG, 'frame.blocked'))).toBeVisible();
  await expect(frame.getByRole('link', { name: tr(LANG, 'frame.open') })).toHaveAttribute('target', '_blank');
  await expect(frame.getByRole('button', { name: tr(LANG, 'start.new.title') })).toHaveCount(0);
});

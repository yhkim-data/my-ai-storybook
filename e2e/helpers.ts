// Shared helpers for the Playwright tests.
import { expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Lang = 'ko' | 'en';
/** Story page counts the user can pick. */
export type PageCount = 4 | 6 | 8;

/** localStorage keys; must match src/store/settings_store.ts. */
export const SETTINGS_KEY = 'storybook.settings';
export const USAGE_KEY = 'storybook.usage';

/** Matches the app default. */
export const DEFAULT_PAGE_COUNT: PageCount = 8;
/** Cover and credits pages: total pages = story pages + 2. */
export const EXTRA_PAGES = 2;
/** PDF page side in points: 200 mm, or 206 mm with 3 mm bleed on each side for print. */
export const SCREEN_PDF_POINTS = 566.93;
export const PRINT_PDF_POINTS = 583.94;
export const POINTS_TOLERANCE = 0.5;

/** Wait (ms) for long jobs such as making all pictures or the PDF. */
export const LONG_WAIT_MS = 90_000;
export const MAX_TAB_PRESSES = 80;
export const SCROLL_TOLERANCE_PX = 1;

/** 1x1 PNG for upload tests. */
export const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export function tiny_png_file(): { name: string; mimeType: string; buffer: Buffer } {
  return { name: 'my.png', mimeType: 'image/png', buffer: Buffer.from(TINY_PNG_BASE64, 'base64') };
}

/** Read straight from src/i18n so button names follow any text change. */
const TABLES: Record<Lang, Record<string, string>> = {
  ko: read_table('ko'),
  en: read_table('en'),
};

function read_table(lang: Lang): Record<string, string> {
  const file_path = join(process.cwd(), 'src', 'i18n', `${lang}.json`);
  return JSON.parse(readFileSync(file_path, 'utf-8')) as Record<string, string>;
}

/** Looks up UI text and fills {name} placeholders. Throws on a missing key so the test fails. */
export function tr(lang: Lang, key: string, params: Record<string, string | number> = {}): string {
  const template = TABLES[lang][key];
  if (template === undefined) throw new Error(`번역 키가 없어요: ${key}`);
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

export const SAMPLE_INPUT: Record<Lang, { hero_name: string; hero_look: string; author: string }> = {
  ko: { hero_name: '토리', hero_look: '빨간 목도리를 한 작은 여우, 꼬리 끝이 하얘요', author: '토리 작가' },
  en: { hero_name: 'Tori', hero_look: 'A small fox with a red scarf and a white tail tip', author: 'Tori the Writer' },
};

export interface OpenOptions {
  /** Open in mock mode (fake AI provider). */
  mock?: boolean;
  /** Simulated error. */
  mockfail?: 'quota' | 'rate' | 'blocked' | 'network';
}

/** Opens the start screen with the given UI language saved, unless settings are already saved. */
export async function open_start(page: Page, lang: Lang, options: OpenOptions = {}): Promise<void> {
  await page.addInitScript(
    ([settings_key, lang_code]) => {
      try {
        if (!localStorage.getItem(settings_key as string)) {
          localStorage.setItem(settings_key as string, JSON.stringify({ lang: lang_code }));
        }
      } catch {
        // Without storage the app opens in the browser language (Korean).
      }
    },
    [SETTINGS_KEY, lang],
  );
  const params: string[] = [];
  if (options.mock) params.push('mock=1');
  if (options.mockfail) params.push(`mockfail=${options.mockfail}`);
  await page.goto(params.length > 0 ? `?${params.join('&')}` : './');
  await expect(page.getByRole('button', { name: tr(lang, 'start.new.title') })).toBeVisible();
}

/**
 * Fails if the page scrolls horizontally.
 * In phone emulation window.innerWidth grows with wide content, so also compare with clientWidth.
 */
export async function expect_no_h_scroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - Math.min(window.innerWidth, document.documentElement.clientWidth),
  );
  expect(overflow, '가로 스크롤이 생겼어요').toBeLessThanOrEqual(SCROLL_TOLERANCE_PX);
}

/**
 * Scrolls the target into view before clicking.
 * Works around the phone pictures-screen page list overflowing off screen (an app bug) so other behavior can be tested.
 */
export async function click_by_event(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  await target.click();
}

/** Button with an exact name match, e.g. "Next". */
export function exact_button(page: Page, name: string): Locator {
  return page.getByRole('button', { name, exact: true });
}

export async function start_new_book(page: Page, lang: Lang): Promise<void> {
  await page.getByRole('button', { name: tr(lang, 'start.new.title') }).click();
  await expect(page.getByRole('heading', { name: tr(lang, 'seed.heading') })).toBeVisible();
}

export interface SeedOptions {
  page_count?: PageCount;
}

/** Fills the story seed and goes on to the plot screen. */
export async function fill_seed(page: Page, lang: Lang, options: SeedOptions = {}): Promise<void> {
  const input = SAMPLE_INPUT[lang];
  await exact_button(page, tr(lang, 'seed.topic.adventure')).click();
  await page.locator('#hero-name').fill(input.hero_name);
  await page.locator('#hero-look').fill(input.hero_look);
  if (options.page_count) {
    await exact_button(page, tr(lang, 'seed.pages.option', { n: options.page_count })).click();
  }
  await exact_button(page, tr(lang, 'common.next')).click();
  await expect(page.getByRole('heading', { name: tr(lang, 'plot.heading') })).toBeVisible();
}

/** Picks the first plot card and goes on to the page-split screen. */
export async function choose_first_plot(page: Page, lang: Lang): Promise<void> {
  const first_card = page.locator('button.card.selectable').first();
  await first_card.click();
  await expect(first_card).toHaveAttribute('aria-pressed', 'true');
  await exact_button(page, tr(lang, 'common.next')).click();
  await expect(page.getByRole('heading', { name: tr(lang, 'pages.heading') })).toBeVisible();
}

/** Types a title and plot by hand and goes on to the page-split screen. */
export async function write_plot_by_hand(page: Page, lang: Lang, title: string, summary: string): Promise<void> {
  await page.locator('#plot-title').fill(title);
  await page.locator('#plot-summary').fill(summary);
  await exact_button(page, tr(lang, 'common.next')).click();
  await expect(page.getByRole('heading', { name: tr(lang, 'pages.heading') })).toBeVisible();
}

/** Waits for page text, then goes on to the art-style screen. */
export async function pass_pages(page: Page, lang: Lang): Promise<void> {
  await expect(page.locator('#page-text-1')).toBeVisible();
  await exact_button(page, tr(lang, 'common.next')).click();
  await expect(page.getByRole('heading', { name: tr(lang, 'style.heading') })).toBeVisible();
}

export async function pass_style(page: Page, lang: Lang): Promise<void> {
  await exact_button(page, tr(lang, 'common.next')).click();
  await expect(page.locator('.pic-list')).toBeVisible();
}

/** Clicks "make all pictures left" and waits until every page has a picture. */
export async function make_all_pictures(page: Page, lang: Lang): Promise<void> {
  const make_all = page.getByRole('button', { name: tr(lang, 'pictures.make_all') });
  await make_all.click();
  await expect(page.locator('.pic-none')).toHaveCount(0, { timeout: LONG_WAIT_MS });
  await expect(make_all).toBeEnabled({ timeout: LONG_WAIT_MS });
}

/** Starts a new book in mock mode and goes to the pictures screen. The fake AI fills plot and pages. */
export async function go_to_pictures(page: Page, lang: Lang, page_count?: PageCount): Promise<void> {
  await open_start(page, lang, { mock: true });
  await start_new_book(page, lang);
  await fill_seed(page, lang, { page_count });
  await choose_first_plot(page, lang);
  await pass_pages(page, lang);
  await pass_style(page, lang);
}

export async function pass_pictures(page: Page, lang: Lang): Promise<void> {
  await click_by_event(page.getByRole('button', { name: tr(lang, 'pictures.next') }));
  await expect(page.getByTestId('text-box')).toBeVisible();
}

/** Goes to the editor in mock mode with all pictures made. */
export async function go_to_editor(page: Page, lang: Lang, page_count?: PageCount): Promise<void> {
  await go_to_pictures(page, lang, page_count);
  await make_all_pictures(page, lang);
  await pass_pictures(page, lang);
}

/** Goes to the finish screen and fills in the author name. */
export async function pass_editor(page: Page, lang: Lang, author = SAMPLE_INPUT[lang].author): Promise<void> {
  await page.getByRole('button', { name: tr(lang, 'editor.next') }).click();
  await expect(page.getByRole('heading', { name: tr(lang, 'finish.heading') })).toBeVisible();
  await page.locator('#author-input').fill(author);
}

/** Goes from the start to the finish screen in mock mode. */
export async function go_to_finish(page: Page, lang: Lang, page_count?: PageCount): Promise<void> {
  await go_to_editor(page, lang, page_count);
  await pass_editor(page, lang);
}

/** Clicks "next page" in the finish-screen viewer `count` times. */
export async function flip_pages(page: Page, lang: Lang, count: number): Promise<void> {
  const next_button = page.getByRole('button', { name: tr(lang, 'finish.next_page'), exact: true });
  for (let index = 0; index < count; index += 1) await next_button.click();
}

export interface DownloadedFile {
  name: string;
  path: string;
  bytes: Buffer;
}

/** Clicks the download button with the given test id and reads the downloaded file. */
export async function read_download(page: Page, test_id: string): Promise<DownloadedFile> {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: LONG_WAIT_MS }),
    page.getByTestId(test_id).click(),
  ]);
  const file_path = await download.path();
  return { name: download.suggestedFilename(), path: file_path, bytes: readFileSync(file_path) };
}

/** Today's AI call count from localStorage; 0 if none. */
export async function read_usage_count(page: Page): Promise<number> {
  return page.evaluate((usage_key) => {
    const raw = localStorage.getItem(usage_key);
    if (!raw) return 0;
    try {
      return (JSON.parse(raw) as { count?: number }).count ?? 0;
    } catch {
      return 0;
    }
  }, USAGE_KEY);
}

/** The saved text-provider key from localStorage; empty string if none. */
export async function read_saved_text_key(page: Page): Promise<string> {
  return page.evaluate((settings_key) => {
    const raw = localStorage.getItem(settings_key);
    if (!raw) return '';
    try {
      return (JSON.parse(raw) as { text_key?: string }).text_key ?? '';
    } catch {
      return '';
    }
  }, SETTINGS_KEY);
}

/** Returns an array that collects the URL of every outgoing request. */
export function collect_request_urls(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  return urls;
}

/** Raw translation keys must never show on screen. */
const TRANSLATION_KEY_PATTERN =
  /\b(app|common|step|start|connect|seed|plot|pages|style|pictures|error|editor|finish|credits|rights)\.[a-z0-9_.-]+/;
/** Jargon students must not see. */
const HARD_WORD_PATTERNS: RegExp[] = [/프롬프트/, /\bAPI\b/, /토큰/, /prompt/i, /token/i];
const HANGUL_PATTERN = /[가-힣]/;

/** Lists screen problems: exposed translation keys, jargon, and (on the English UI) leftover Korean. */
export async function find_screen_problems(page: Page, lang: Lang, extra_allowed: string[] = []): Promise<string[]> {
  const raw_text = await page.evaluate(() => document.body.innerText);
  const problems: string[] = [];
  const key_match = TRANSLATION_KEY_PATTERN.exec(raw_text);
  if (key_match) problems.push(`번역 키가 드러났어요: ${key_match[0]}`);
  for (const pattern of HARD_WORD_PATTERNS) {
    const word_match = pattern.exec(raw_text);
    if (word_match) problems.push(`어려운 말이 있어요: ${word_match[0]}`);
  }
  if (lang === 'en') {
    // The language toggle and the Korean rights statement may contain Korean.
    let text = raw_text.split(tr('en', 'common.lang_toggle')).join('').split(tr('en', 'rights.statement.ko')).join('');
    for (const allowed of extra_allowed) text = text.split(allowed).join('');
    const hangul_match = HANGUL_PATTERN.exec(text);
    if (hangul_match) {
      const start = Math.max(0, hangul_match.index - 20);
      problems.push(`영어 화면에 한글이 남았어요: ...${text.slice(start, hangul_match.index + 20)}...`);
    }
  }
  return problems;
}

/** Presses only Tab until the target has focus, without assuming how many presses it takes. */
export async function tab_until_focused(page: Page, target: Locator): Promise<void> {
  for (let press = 0; press <= MAX_TAB_PRESSES; press += 1) {
    const is_focused = await target.evaluate((element) => element === document.activeElement);
    if (is_focused) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab을 ${MAX_TAB_PRESSES}번 눌러도 포커스가 오지 않았어요`);
}

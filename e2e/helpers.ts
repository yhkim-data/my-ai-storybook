// Playwright 검사가 함께 쓰는 도우미: 화면 열기, 단계별 이동, 내려받기, 호출 횟수, 번역 빠짐 찾기.
import { expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 화면 언어 */
export type Lang = 'ko' | 'en';
/** 고를 수 있는 본문 쪽수 */
export type PageCount = 4 | 6 | 8;

/** 설정과 오늘 쓴 횟수를 담는 localStorage 이름 (src/store/settings_store.ts와 같다) */
export const SETTINGS_KEY = 'storybook.settings';
export const USAGE_KEY = 'storybook.usage';

/** 기본 본문 쪽수 (앱의 기본값과 같다) */
export const DEFAULT_PAGE_COUNT: PageCount = 8;
/** 표지와 "만든 사람" 쪽을 더하는 수: 책 전체 쪽수 = 본문 + 2 */
export const EXTRA_PAGES = 2;
/** PDF 쪽 한 변(포인트): 200mm와 재단 여백 3mm씩을 더한 206mm */
export const SCREEN_PDF_POINTS = 566.93;
export const PRINT_PDF_POINTS = 583.94;
/** 포인트 비교에서 허용하는 오차 */
export const POINTS_TOLERANCE = 0.5;

/** 긴 작업(그림 모두 만들기, PDF 만들기)을 기다리는 시간(ms) */
export const LONG_WAIT_MS = 90_000;
/** 키보드로 Tab을 누르는 최대 횟수 */
export const MAX_TAB_PRESSES = 80;
/** 가로 스크롤을 허용하는 오차(px) */
export const SCROLL_TOLERANCE_PX = 1;

/** 1×1 PNG 그림 (base64). 올리기 검사에서 쓴다. */
export const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/**
 * 올리기 검사에 쓸 작은 PNG 파일 값을 만든다.
 */
export function tiny_png_file(): { name: string; mimeType: string; buffer: Buffer } {
  return { name: 'my.png', mimeType: 'image/png', buffer: Buffer.from(TINY_PNG_BASE64, 'base64') };
}

/** 번역 표 (src/i18n의 json을 그대로 읽는다. 문구가 바뀌어도 단추 이름이 함께 따라간다) */
const TABLES: Record<Lang, Record<string, string>> = {
  ko: read_table('ko'),
  en: read_table('en'),
};

/**
 * 번역 json 파일 하나를 읽는다.
 */
function read_table(lang: Lang): Record<string, string> {
  const file_path = join(process.cwd(), 'src', 'i18n', `${lang}.json`);
  return JSON.parse(readFileSync(file_path, 'utf-8')) as Record<string, string>;
}

/**
 * 언어별 문구를 찾는다. {이름} 자리는 값으로 채운다. 키가 없으면 검사를 실패시킨다.
 */
export function tr(lang: Lang, key: string, params: Record<string, string | number> = {}): string {
  const template = TABLES[lang][key];
  if (template === undefined) throw new Error(`번역 키가 없어요: ${key}`);
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/** 언어별로 넣을 글 */
export const SAMPLE_INPUT: Record<Lang, { hero_name: string; hero_look: string; author: string }> = {
  ko: { hero_name: '토리', hero_look: '빨간 목도리를 한 작은 여우, 꼬리 끝이 하얘요', author: '토리 작가' },
  en: { hero_name: 'Tori', hero_look: 'A small fox with a red scarf and a white tail tip', author: 'Tori the Writer' },
};

/** 시작 화면을 여는 방법 */
export interface OpenOptions {
  /** 연습 모드(가짜 AI 연결부)로 연다 */
  mock?: boolean;
  /** 오류 흉내: quota | rate | blocked | network */
  mockfail?: 'quota' | 'rate' | 'blocked' | 'network';
}

/**
 * 시작 화면을 연다. 영어면 화면 언어를 영어로 저장해 둔 채로 연다 (이미 저장된 설정은 덮지 않는다).
 */
export async function open_start(page: Page, lang: Lang, options: OpenOptions = {}): Promise<void> {
  await page.addInitScript(
    ([settings_key, lang_code]) => {
      try {
        if (!localStorage.getItem(settings_key as string)) {
          localStorage.setItem(settings_key as string, JSON.stringify({ lang: lang_code }));
        }
      } catch {
        // 저장 공간을 못 쓰면 브라우저 언어(한국어)로 열린다.
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
 * 화면이 가로로 넘치지 않는지 본다 (가로 스크롤이 생기면 실패).
 * 휴대폰 흉내에서는 내용이 넓으면 window.innerWidth도 함께 커지므로, 실제 화면 너비(clientWidth)와도 견준다.
 */
export async function expect_no_h_scroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - Math.min(window.innerWidth, document.documentElement.clientWidth),
  );
  expect(overflow, '가로 스크롤이 생겼어요').toBeLessThanOrEqual(SCROLL_TOLERANCE_PX);
}

/**
 * 마우스 자리 계산 없이 클릭 사건을 직접 보낸다.
 * 휴대폰 그림 화면의 쪽 목록이 화면 밖으로 넘치는 문제(앱 쪽 버그)가 있어도 다른 동작을 검사할 수 있게 한다.
 */
export async function click_by_event(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  await target.click();
}

/**
 * "다음"처럼 이름이 정확히 같은 단추를 돌려준다.
 */
export function exact_button(page: Page, name: string): Locator {
  return page.getByRole('button', { name, exact: true });
}

/**
 * "새 책 만들기"를 눌러 씨앗 화면으로 간다.
 */
export async function start_new_book(page: Page, lang: Lang): Promise<void> {
  await page.getByRole('button', { name: tr(lang, 'start.new.title') }).click();
  await expect(page.getByRole('heading', { name: tr(lang, 'seed.heading') })).toBeVisible();
}

/** 씨앗 채우기 옵션 */
export interface SeedOptions {
  page_count?: PageCount;
}

/**
 * 씨앗을 채우고 "다음"을 눌러 줄거리 화면으로 간다.
 */
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

/**
 * 줄거리 카드 하나(첫째)를 고르고 "다음"을 눌러 쪽 나누기 화면으로 간다.
 */
export async function choose_first_plot(page: Page, lang: Lang): Promise<void> {
  const first_card = page.locator('button.card.selectable').first();
  await first_card.click();
  await expect(first_card).toHaveAttribute('aria-pressed', 'true');
  await exact_button(page, tr(lang, 'common.next')).click();
  await expect(page.getByRole('heading', { name: tr(lang, 'pages.heading') })).toBeVisible();
}

/**
 * 직접 쓰기로 제목과 줄거리를 쓰고 "다음"을 눌러 쪽 나누기 화면으로 간다.
 */
export async function write_plot_by_hand(page: Page, lang: Lang, title: string, summary: string): Promise<void> {
  await page.locator('#plot-title').fill(title);
  await page.locator('#plot-summary').fill(summary);
  await exact_button(page, tr(lang, 'common.next')).click();
  await expect(page.getByRole('heading', { name: tr(lang, 'pages.heading') })).toBeVisible();
}

/**
 * 쪽 나누기 화면에서 글이 나타나기를 기다렸다가 "다음"을 눌러 그림체 화면으로 간다.
 */
export async function pass_pages(page: Page, lang: Lang): Promise<void> {
  await expect(page.locator('#page-text-1')).toBeVisible();
  await exact_button(page, tr(lang, 'common.next')).click();
  await expect(page.getByRole('heading', { name: tr(lang, 'style.heading') })).toBeVisible();
}

/**
 * 그림체 화면에서 "다음"을 눌러 그림 화면으로 간다.
 */
export async function pass_style(page: Page, lang: Lang): Promise<void> {
  await exact_button(page, tr(lang, 'common.next')).click();
  await expect(page.locator('.pic-list')).toBeVisible();
}

/**
 * 그림 화면에서 "남은 그림 모두 만들기"를 누르고 모든 쪽에 그림이 생길 때까지 기다린다.
 */
export async function make_all_pictures(page: Page, lang: Lang): Promise<void> {
  const make_all = page.getByRole('button', { name: tr(lang, 'pictures.make_all') });
  await make_all.click();
  await expect(page.locator('.pic-none')).toHaveCount(0, { timeout: LONG_WAIT_MS });
  await expect(make_all).toBeEnabled({ timeout: LONG_WAIT_MS });
}

/**
 * 연습 모드로 열어 새 책을 만들고 그림 화면까지 간다. 줄거리와 쪽 나누기는 가짜 AI가 채운다.
 */
export async function go_to_pictures(page: Page, lang: Lang, page_count?: PageCount): Promise<void> {
  await open_start(page, lang, { mock: true });
  await start_new_book(page, lang);
  await fill_seed(page, lang, { page_count });
  await choose_first_plot(page, lang);
  await pass_pages(page, lang);
  await pass_style(page, lang);
}

/**
 * 그림 화면에서 "다음: 꾸미기"를 눌러 꾸미기 화면으로 간다.
 */
export async function pass_pictures(page: Page, lang: Lang): Promise<void> {
  await click_by_event(page.getByRole('button', { name: tr(lang, 'pictures.next') }));
  await expect(page.getByTestId('text-box')).toBeVisible();
}

/**
 * 연습 모드로 그림을 모두 만든 뒤 꾸미기 화면까지 간다.
 */
export async function go_to_editor(page: Page, lang: Lang, page_count?: PageCount): Promise<void> {
  await go_to_pictures(page, lang, page_count);
  await make_all_pictures(page, lang);
  await pass_pictures(page, lang);
}

/**
 * 꾸미기 화면에서 "다음: 완성"을 눌러 완성 화면으로 간다. 지은이 이름도 쓴다.
 */
export async function pass_editor(page: Page, lang: Lang, author = SAMPLE_INPUT[lang].author): Promise<void> {
  await page.getByRole('button', { name: tr(lang, 'editor.next') }).click();
  await expect(page.getByRole('heading', { name: tr(lang, 'finish.heading') })).toBeVisible();
  await page.locator('#author-input').fill(author);
}

/**
 * 연습 모드로 처음부터 완성 화면까지 간다.
 */
export async function go_to_finish(page: Page, lang: Lang, page_count?: PageCount): Promise<void> {
  await go_to_editor(page, lang, page_count);
  await pass_editor(page, lang);
}

/**
 * 완성 화면 넘겨보기에서 "다음 쪽"을 눌러 count번 넘긴다.
 */
export async function flip_pages(page: Page, lang: Lang, count: number): Promise<void> {
  const next_button = page.getByRole('button', { name: tr(lang, 'finish.next_page'), exact: true });
  for (let index = 0; index < count; index += 1) await next_button.click();
}

/** 내려받은 파일 */
export interface DownloadedFile {
  name: string;
  path: string;
  bytes: Buffer;
}

/**
 * 받기 단추(data-testid)를 눌러 내려받고 파일 내용을 읽는다.
 */
export async function read_download(page: Page, test_id: string): Promise<DownloadedFile> {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: LONG_WAIT_MS }),
    page.getByTestId(test_id).click(),
  ]);
  const file_path = await download.path();
  return { name: download.suggestedFilename(), path: file_path, bytes: readFileSync(file_path) };
}

/**
 * 오늘 AI를 부른 횟수를 읽는다. 기록이 없으면 0이다.
 */
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

/**
 * localStorage에 저장된 글용 키를 읽는다. 저장된 것이 없으면 빈 글이다.
 */
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

/**
 * 나가는 요청의 주소를 모두 모아 두는 배열을 돌려준다.
 */
export function collect_request_urls(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  return urls;
}

/** 화면에 드러나면 안 되는 번역 키 모양 */
const TRANSLATION_KEY_PATTERN =
  /\b(app|common|step|start|connect|seed|plot|pages|style|pictures|error|editor|finish|credits|rights)\.[a-z0-9_.-]+/;
/** 학생에게 보이면 안 되는 어려운 말 */
const HARD_WORD_PATTERNS: RegExp[] = [/프롬프트/, /\bAPI\b/, /토큰/, /prompt/i, /token/i];
/** 한글 글자 */
const HANGUL_PATTERN = /[가-힣]/;

/**
 * 지금 화면에서 번역 키 노출, 어려운 말, (영어 화면이면) 남은 한글을 찾아 문제 목록을 돌려준다.
 */
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
    // 언어 단추와 권리 안내의 한국어 권리 문장은 한글이 있어도 된다.
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

/**
 * 포커스가 그 요소에 올 때까지 Tab만 누른다. 몇 번 눌러야 하는지 세지 않는다.
 */
export async function tab_until_focused(page: Page, target: Locator): Promise<void> {
  for (let press = 0; press <= MAX_TAB_PRESSES; press += 1) {
    const is_focused = await target.evaluate((element) => element === document.activeElement);
    if (is_focused) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab을 ${MAX_TAB_PRESSES}번 눌러도 포커스가 오지 않았어요`);
}

// README와 안내서에 넣을 화면 사진을 찍는다. 연습 모드(가짜 AI 연결부)로 책 한 권을 끝까지 만들면서 찍는다.
// 쓰는 법: 먼저 `npm run build` 후 `npx vite preview --port 4173`을 띄워 두고 `npm run screenshots`.
// 환경 변수: SHOT_LANG(ko 또는 en), SHOT_DIR(저장 폴더, 기본 docs/images/언어), SHOT_WIDTH·SHOT_HEIGHT(화면 크기).
// 마지막에 휴대폰 크기(390×844)로 완성 화면을 한 장 더 찍는다(phone.png).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = process.env.SHOT_URL ?? 'http://localhost:4173/my-ai-storybook/';
const LANG = process.env.SHOT_LANG ?? 'ko';
const OUT_DIR = process.env.SHOT_DIR ?? `docs/images/${LANG}`;
const WIDTH = Number(process.env.SHOT_WIDTH ?? 1280);
const HEIGHT = Number(process.env.SHOT_HEIGHT ?? 820);
/** 휴대폰 사진 크기 */
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

/** 언어별로 누를 단추 이름과 넣을 글 */
const WORDS = {
  ko: {
    locale: 'ko-KR',
    new_book: '새 책 만들기',
    connect: 'AI 연결하기',
    home: '처음으로',
    topic: '모험',
    hero_name: '토리',
    hero_look: '빨간 목도리를 한 작은 여우, 꼬리 끝이 하얘요',
    next: '다음',
    make_all: '남은 그림 모두 만들기',
    has_picture: '그림 있음',
    to_editor: '다음: 꾸미기',
    to_finish: '다음: 완성',
    author: '토리 작가',
  },
  en: {
    locale: 'en-US',
    new_book: 'Make a new book',
    connect: 'Connect AI',
    home: 'Home',
    topic: 'Adventure',
    hero_name: 'Tori',
    hero_look: 'A small fox with a red scarf and a white tail tip',
    next: 'Next',
    make_all: 'Make all the pictures left',
    has_picture: 'Has picture',
    to_editor: 'Next: Decorate',
    to_finish: 'Next: Finish',
    author: 'Tori the Writer',
  },
};

/**
 * 화면 사진 한 장을 찍어 저장한다.
 */
async function shoot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: false });
  console.log(`찍음: ${name}.png`);
}

/**
 * 연습 모드로 책 한 권을 끝까지 만들면서 화면마다 사진을 찍는다.
 */
async function main() {
  const words = WORDS[LANG] ?? WORDS.ko;
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, locale: words.locale, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error('화면 오류:', error.message));

  await page.goto(`${BASE_URL}?mock=1`);
  await page.getByRole('button', { name: words.new_book }).waitFor();
  await shoot(page, 'start');

  await page.getByRole('button', { name: words.connect }).click();
  await page.locator('#key-input').waitFor();
  await shoot(page, 'connect');
  await page.getByRole('button', { name: words.home }).click();

  await page.getByRole('button', { name: words.new_book }).click();
  await page.getByRole('button', { name: words.topic, exact: true }).click();
  await page.locator('#hero-name').fill(words.hero_name);
  await page.locator('#hero-look').fill(words.hero_look);
  await shoot(page, 'seed');
  await page.getByRole('button', { name: words.next, exact: true }).click();

  await page.locator('button.card.selectable').first().click();
  await shoot(page, 'plot');
  await page.getByRole('button', { name: words.next, exact: true }).click();

  await page.locator('#page-text-1').waitFor();
  await shoot(page, 'pages');
  await page.getByRole('button', { name: words.next, exact: true }).click();

  await page.locator('img').first().waitFor();
  await shoot(page, 'style');
  await page.getByRole('button', { name: words.next, exact: true }).click();

  await page.getByRole('button', { name: words.make_all }).click();
  await page.getByText(words.has_picture).nth(7).waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  await shoot(page, 'pictures');
  await page.getByRole('button', { name: words.to_editor }).click();

  await page.locator('[data-testid="text-box"]').waitFor();
  await page.locator('.editor-thumb').nth(2).click();
  await shoot(page, 'editor');
  await page.getByRole('button', { name: words.to_finish }).click();

  await page.locator('#author-input').fill(words.author);
  await shoot(page, 'finish');

  await page.setViewportSize({ width: PHONE_WIDTH, height: PHONE_HEIGHT });
  await page.evaluate(() => window.scrollTo(0, 0));
  await shoot(page, 'phone');

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

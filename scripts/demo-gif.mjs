// README에 넣을 움직이는 시연(GIF)을 만든다. 연습 모드(가짜 AI 연결부)로 책 한 권을 만들면서 장면을 찍고 GIF로 묶는다.
// 흐름: 새 책 만들기 → 이야기 씨앗 → 줄거리 고르기 → 그림 → 꾸미기(글상자 끌기, 글 고치기) → 완성 넘겨보기.
// 쓰는 법: `npm run demo-gif` (먼저 빌드하고, 이 스크립트가 미리보기 서버를 띄웠다가 끈다).
// 결과: docs/images/ko/demo.gif, docs/images/en/demo.gif. 외부 프로그램 없이 Playwright와 순수 JS 인코더(gifenc)만 쓴다.
// 환경 변수: DEMO_LANGS(만들 언어, 쉼표로 구분, 기본 ko,en), DEMO_FRAMES_DIR(장면마다 PNG도 남길 폴더, 눈으로 확인할 때).
import { chromium } from '@playwright/test';
import gifenc from 'gifenc';
import pngjs from 'pngjs';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { preview } from 'vite';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const { PNG } = pngjs;

const PORT = 4174;
const BASE_PATH = '/my-ai-storybook/';
const LANGS = (process.env.DEMO_LANGS ?? 'ko,en').split(',');
const FRAMES_DIR = process.env.DEMO_FRAMES_DIR;
/** GIF 크기(px). 가로 960 이하 */
const WIDTH = 960;
const HEIGHT = 720;
/** GIF 한 장에 쓰는 색 수 */
const MAX_COLORS = 256;
/** 장면 사이 멈춤(ms): 화면이 바뀌면 글을 읽을 만큼, 움직이는 중에는 짧게 */
const HOLD_LONG_MS = 1800;
const HOLD_MID_MS = 1100;
const HOLD_SHORT_MS = 600;
const MOTION_MS = 120;
/** 글상자를 끄는 거리(px)와 나눠 찍는 횟수 */
const DRAG_DY_PX = -70;
const DRAG_FRAMES = 5;
/** 그림이 생기는 동안 찍는 간격(ms)과 최대 기다림(ms) */
const PICTURE_POLL_MS = 700;
const PICTURE_WAIT_MS = 60000;
/** 완성 화면에서 넘겨 볼 쪽 수 */
const FLIP_COUNT = 3;
/** 시연 길이(ms)와 파일 크기 한도(바이트) */
const MIN_TOTAL_MS = 12000;
const MAX_TOTAL_MS = 20000;
const MAX_BYTES = 5 * 1024 * 1024;

/** 언어별로 넣을 글 (지어낸 이름만 쓴다) */
const INPUT = {
  ko: { locale: 'ko-KR', hero_name: '토리', hero_look: '빨간 목도리를 한 작은 여우', new_text: '토리는 목도리를 꼭 두르고 들판 길을 걸었어요. 꽃들이 반갑다고 인사했어요!', author: '토리 작가' },
  en: { locale: 'en-US', hero_name: 'Tori', hero_look: 'A small fox with a red scarf', new_text: 'Tori wrapped the scarf tight and walked down the meadow path. The flowers waved hello!', author: 'Tori the Writer' },
};

/**
 * 화면 문구 파일을 읽는다. 단추 이름을 앱과 똑같이 쓰려는 것이다.
 */
function load_words(lang) {
  return JSON.parse(readFileSync(join('src', 'i18n', `${lang}.json`), 'utf8'));
}

/**
 * 장면을 모아 두었다가 GIF로 묶는 기록기를 만든다.
 */
function create_recorder(page) {
  const frames = [];
  return {
    frames,
    /** 지금 화면을 찍어 delay_ms만큼 보여 줄 장면으로 넣는다. */
    async snap(delay_ms) {
      await page.evaluate(() => document.fonts.ready);
      const bytes = await page.screenshot({ type: 'png' });
      frames.push({ rgba: PNG.sync.read(bytes).data, delay_ms, bytes });
    },
  };
}

/**
 * 장면들을 GIF 파일 하나로 묶는다.
 */
function encode_gif(frames, out_path) {
  const gif = GIFEncoder();
  for (const frame of frames) {
    const palette = quantize(frame.rgba, MAX_COLORS);
    const index = applyPalette(frame.rgba, palette);
    gif.writeFrame(index, WIDTH, HEIGHT, { palette, delay: frame.delay_ms });
  }
  gif.finish();
  writeFileSync(out_path, gif.bytes());
}

/**
 * 손잡이를 마우스로 끌면서 중간 장면을 찍는다.
 */
async function drag_with_frames(page, recorder, handle, dy) {
  await handle.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const rect = await handle.boundingBox();
  if (!rect) throw new Error('끌 글상자를 찾지 못했어요');
  const start_x = rect.x + rect.width / 2;
  const start_y = rect.y + rect.height / 2;
  await page.mouse.move(start_x, start_y);
  await page.mouse.down();
  for (let step = 1; step <= DRAG_FRAMES; step += 1) {
    await page.mouse.move(start_x, start_y + (dy * step) / DRAG_FRAMES);
    await recorder.snap(MOTION_MS);
  }
  await page.mouse.up();
}

/**
 * 한 언어로 책 한 권을 만들면서 장면을 찍는다.
 */
async function record(browser, base_url, lang) {
  const words = load_words(lang);
  const input = INPUT[lang];
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, locale: input.locale, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error('화면 오류:', error.message));
  const recorder = create_recorder(page);
  const button = (key) => page.getByRole('button', { name: words[key], exact: true });

  await page.goto(`${base_url}?mock=1`);
  await page.getByRole('button', { name: words['start.new.title'] }).waitFor();
  await recorder.snap(HOLD_LONG_MS);

  // 이야기 씨앗
  await page.getByRole('button', { name: words['start.new.title'] }).click();
  await button('seed.topic.adventure').click();
  await page.locator('#hero-name').fill(input.hero_name);
  await page.locator('#hero-look').fill(input.hero_look);
  await page.evaluate(() => window.scrollTo(0, 0));
  await recorder.snap(HOLD_LONG_MS);
  await button('common.next').click();

  // 줄거리 고르기
  await page.locator('button.card.selectable').first().click();
  await recorder.snap(HOLD_LONG_MS);
  await button('common.next').click();

  // 쪽 나누기와 그림체는 짧게 지나간다.
  await page.locator('#page-text-1').waitFor();
  await recorder.snap(HOLD_SHORT_MS);
  await button('common.next').click();
  await page.locator('img').first().waitFor();
  await recorder.snap(HOLD_SHORT_MS);
  await button('common.next').click();

  // 그림: 하나씩 생기는 모습을 찍는다.
  const make_all = page.getByRole('button', { name: words['pictures.make_all'] });
  await make_all.click();
  const deadline = Date.now() + PICTURE_WAIT_MS;
  while ((await page.locator('.pic-none').count()) > 0 && Date.now() < deadline) {
    await recorder.snap(HOLD_SHORT_MS);
    await page.waitForTimeout(PICTURE_POLL_MS);
  }
  await recorder.snap(HOLD_LONG_MS);
  await button('pictures.next').click();

  // 꾸미기: 1쪽을 골라 글상자를 끌고 글을 고친다.
  const text_box = page.getByTestId('text-box');
  await text_box.waitFor();
  await page.locator('.editor-thumb').nth(1).click();
  await recorder.snap(HOLD_MID_MS);
  await drag_with_frames(page, recorder, text_box.locator('textarea'), DRAG_DY_PX);
  await recorder.snap(HOLD_MID_MS);
  await text_box.locator('textarea').fill(input.new_text);
  await recorder.snap(HOLD_LONG_MS);
  await button('editor.next').click();

  // 완성: 넘겨본다.
  await page.locator('#author-input').fill(input.author);
  await page.evaluate(() => window.scrollTo(0, 0));
  await recorder.snap(HOLD_MID_MS);
  for (let flip = 0; flip < FLIP_COUNT; flip += 1) {
    await button('finish.next_page').click();
    await page.locator('.book-page').first().evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await recorder.snap(HOLD_MID_MS);
  }
  await context.close();
  return recorder.frames;
}

/**
 * 미리보기 서버를 띄우고 언어마다 GIF를 만든 뒤, 길이와 크기가 기준 안인지 확인한다.
 */
async function main() {
  const server = await preview({ preview: { port: PORT, strictPort: true } });
  const browser = await chromium.launch();
  let failed = false;
  try {
    for (const lang of LANGS) {
      const frames = await record(browser, `http://localhost:${PORT}${BASE_PATH}`, lang);
      const out_dir = join('docs', 'images', lang);
      mkdirSync(out_dir, { recursive: true });
      const out_path = join(out_dir, 'demo.gif');
      encode_gif(frames, out_path);
      if (FRAMES_DIR) {
        mkdirSync(join(FRAMES_DIR, lang), { recursive: true });
        frames.forEach((frame, index) => writeFileSync(join(FRAMES_DIR, lang, `${String(index).padStart(2, '0')}.png`), frame.bytes));
      }
      const total_ms = frames.reduce((sum, frame) => sum + frame.delay_ms, 0);
      const bytes = statSync(out_path).size;
      console.log(`만듦: ${out_path} (장면 ${frames.length}개, ${(total_ms / 1000).toFixed(1)}초, ${(bytes / 1024 / 1024).toFixed(2)}MB)`);
      if (total_ms < MIN_TOTAL_MS || total_ms > MAX_TOTAL_MS) {
        console.error(`길이가 ${MIN_TOTAL_MS / 1000}~${MAX_TOTAL_MS / 1000}초 밖이에요.`);
        failed = true;
      }
      if (bytes > MAX_BYTES) {
        console.error('파일이 5MB를 넘어요.');
        failed = true;
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.httpServer.close(resolve));
  }
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

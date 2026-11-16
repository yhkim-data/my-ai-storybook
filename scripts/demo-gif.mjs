// Records the README demo GIF by making one book in mock mode (fake AI provider).
// Usage: `npm run demo-gif` (build first; this script starts and stops the preview server).
// Output: docs/images/{ko,en}/demo.gif. Uses only Playwright and the pure-JS gifenc encoder.
// Env: DEMO_LANGS (comma-separated, default ko,en), DEMO_FRAMES_DIR (also save each frame as PNG for review).
import { chromium } from '@playwright/test';
import gifenc from 'gifenc';
import pngjs from 'pngjs';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { preview } from 'vite';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const { PNG } = pngjs;

const PORT = 4174;
const BASE_PATH = '/';
const LANGS = (process.env.DEMO_LANGS ?? 'ko,en').split(',');
const FRAMES_DIR = process.env.DEMO_FRAMES_DIR;
/** GIF size in px; width kept at 960 or less. */
const WIDTH = 960;
const HEIGHT = 720;
/** GIF frames are limited to 256 colors. */
const MAX_COLORS = 256;
/** Frame hold times (ms): long enough to read after a screen change, short during motion. */
const HOLD_LONG_MS = 1800;
const HOLD_MID_MS = 1100;
const HOLD_SHORT_MS = 600;
const MOTION_MS = 120;
const DRAG_DY_PX = -70;
const DRAG_FRAMES = 5;
const PICTURE_POLL_MS = 700;
const PICTURE_WAIT_MS = 60000;
const FLIP_COUNT = 3;
const MIN_TOTAL_MS = 12000;
const MAX_TOTAL_MS = 20000;
const MAX_BYTES = 5 * 1024 * 1024;

/** Input text per language (made-up names only). */
const INPUT = {
  ko: { locale: 'ko-KR', hero_name: '토리', hero_look: '빨간 목도리를 한 작은 여우', new_text: '토리는 목도리를 꼭 두르고 들판 길을 걸었어요. 꽃들이 반갑다고 인사했어요!', author: '토리 작가' },
  en: { locale: 'en-US', hero_name: 'Tori', hero_look: 'A small fox with a red scarf', new_text: 'Tori wrapped the scarf tight and walked down the meadow path. The flowers waved hello!', author: 'Tori the Writer' },
};

/** Reads the UI text file so button names match the app exactly. */
function load_words(lang) {
  return JSON.parse(readFileSync(join('src', 'i18n', `${lang}.json`), 'utf8'));
}

function create_recorder(page) {
  const frames = [];
  return {
    frames,
    /** Captures the current screen as a frame shown for delay_ms. */
    async snap(delay_ms) {
      await page.evaluate(() => document.fonts.ready);
      const bytes = await page.screenshot({ type: 'png' });
      frames.push({ rgba: PNG.sync.read(bytes).data, delay_ms, bytes });
    },
  };
}

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

/** Drags the handle with the mouse, capturing frames along the way. */
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

/** Makes one book in the given language and returns the captured frames. */
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

  // Story seed
  await page.getByRole('button', { name: words['start.new.title'] }).click();
  await button('seed.topic.adventure').click();
  await page.locator('#hero-name').fill(input.hero_name);
  await page.locator('#hero-look').fill(input.hero_look);
  await page.evaluate(() => window.scrollTo(0, 0));
  await recorder.snap(HOLD_LONG_MS);
  await button('common.next').click();

  // Pick a plot
  await page.locator('button.card.selectable').first().click();
  await recorder.snap(HOLD_LONG_MS);
  await button('common.next').click();

  // Pass quickly through page split and art style.
  await page.locator('#page-text-1').waitFor();
  await recorder.snap(HOLD_SHORT_MS);
  await button('common.next').click();
  await page.locator('img').first().waitFor();
  await recorder.snap(HOLD_SHORT_MS);
  await button('common.next').click();

  // Pictures: capture them appearing one by one.
  const make_all = page.getByRole('button', { name: words['pictures.make_all'] });
  await make_all.click();
  const deadline = Date.now() + PICTURE_WAIT_MS;
  while ((await page.locator('.pic-none').count()) > 0 && Date.now() < deadline) {
    await recorder.snap(HOLD_SHORT_MS);
    await page.waitForTimeout(PICTURE_POLL_MS);
  }
  await recorder.snap(HOLD_LONG_MS);
  await button('pictures.next').click();

  // Editor: select page 1, drag the text box, edit the text.
  const text_box = page.getByTestId('text-box');
  await text_box.waitFor();
  await page.locator('.editor-thumb').nth(1).click();
  await recorder.snap(HOLD_MID_MS);
  await drag_with_frames(page, recorder, text_box.locator('textarea'), DRAG_DY_PX);
  await recorder.snap(HOLD_MID_MS);
  await text_box.locator('textarea').fill(input.new_text);
  await recorder.snap(HOLD_LONG_MS);
  await button('editor.next').click();

  // Finish: flip through the pages.
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

/** Builds one GIF per language and fails if its length or file size is out of bounds. */
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

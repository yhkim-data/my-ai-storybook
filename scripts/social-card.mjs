// 저장소 소개 카드와 링크 미리보기 그림(1280×640)을 HTML로 그려 Playwright로 찍는다.
// 쓰는 법: `npm run social-card` (화면 사진 docs/images/ko/editor.png 가 먼저 있어야 한다).
// 결과: docs/images/social-preview.png, public/og-image.png (같은 그림).
import { chromium } from '@playwright/test';
import { copyFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WIDTH = 1280;
const HEIGHT = 640;
/** 글자를 두지 않는 가장자리 폭(px) */
const SAFE_MARGIN = 80;
const SHOT_PATH = join('docs', 'images', 'ko', 'editor.png');
const OUT_PATH = join('docs', 'images', 'social-preview.png');
const OG_PATH = join('public', 'og-image.png');

/**
 * 글꼴 파일을 data 주소로 바꾼다. 찍는 HTML이 바깥 파일을 읽지 않게 하려는 것이다.
 */
function font_url(name) {
  return `data:font/woff2;base64,${readFileSync(join('public', 'fonts', name)).toString('base64')}`;
}

/**
 * 카드 HTML을 만든다. 색은 앱의 공통 색과 같다.
 */
function card_html() {
  const shot = `data:image/png;base64,${readFileSync(SHOT_PATH).toString('base64')}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Gowun Dodum';src:url(${font_url('GowunDodum-Regular.woff2')}) format('woff2')}
@font-face{font-family:'Noto Sans KR';src:url(${font_url('NotoSansKR-VF.woff2')}) format('woff2');font-weight:100 900}
html,body{margin:0}
body{width:${WIDTH}px;height:${HEIGHT}px;background:#f3f6fa;color:#17233a;font-family:'Noto Sans KR',sans-serif;position:relative;overflow:hidden}
.band{position:absolute;right:0;top:0;width:560px;height:100%;background:#e3ecfb}
.text{position:absolute;left:${SAFE_MARGIN}px;top:${SAFE_MARGIN}px;width:500px;height:${HEIGHT - SAFE_MARGIN * 2}px;display:flex;flex-direction:column}
h1{font-family:'Gowun Dodum',sans-serif;font-weight:400;font-size:64px;line-height:1.15;margin:24px 0 8px}
.en{font-family:'Gowun Dodum',sans-serif;font-size:36px;color:#2459c4;margin:0 0 32px}
.line{font-size:24px;line-height:1.5;color:#4a5872;margin:0}
.line+.line{margin-top:4px}
.lab{margin-top:auto;align-self:flex-start;background:#17233a;color:#fff;font-weight:700;font-size:22px;padding:10px 18px;border-radius:12px}
.shot{position:absolute;left:640px;top:140px;width:560px;border-radius:14px;box-shadow:0 18px 40px rgba(23,35,58,.18);border:1px solid #d5dce8}
</style></head><body>
<div class="band"></div>
<img class="shot" src="${shot}" alt="">
<div class="text">
<h1 class="txt">나만의 AI 동화책</h1>
<p class="en txt">My AI Storybook</p>
<p class="line txt">브라우저만으로 그림책을 만드는 무료 도구</p>
<p class="line txt">Make a picture book in your browser — free, no install</p>
<span class="lab txt">DI Lab</span>
</div>
</body></html>`;
}

/**
 * 카드를 찍고, 글자가 모두 가장자리 안쪽에 있는지 확인한 뒤 두 곳에 저장한다.
 */
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.setContent(card_html());
  await page.evaluate(() => document.fonts.ready);
  const boxes = await page.locator('.txt').evaluateAll((elements) =>
    elements.map((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rect = element.classList.contains('lab') ? element.getBoundingClientRect() : range.getBoundingClientRect();
      return { text: element.textContent, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    }),
  );
  const outside = boxes.filter((box) => box.left < SAFE_MARGIN || box.top < SAFE_MARGIN || box.right > WIDTH - SAFE_MARGIN || box.bottom > HEIGHT - SAFE_MARGIN);
  await page.screenshot({ path: OUT_PATH });
  await browser.close();
  if (outside.length > 0) {
    console.error('가장자리 80px 안으로 들어오지 않은 글자:', outside);
    process.exit(1);
  }
  copyFileSync(OUT_PATH, OG_PATH);
  console.log(`만듦: ${resolve(OUT_PATH)}, ${resolve(OG_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

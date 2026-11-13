// 내보내기. 쪽을 화면에서 그림으로 바꾼 뒤 PDF나 zip에 넣는다 (한글 글꼴이 깨지지 않게 하기 위해서다).
import { zipSync } from 'fflate';
import { toCanvas } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { CreditsPageView, PageView, page_frame } from '../components/PageView';
import { BLEED_MM, FONTS, FONT_IDS, PAGE_MM } from '../constants';
import { get_book_title } from '../store/book_model';
import type { Book, FontId } from '../types';
import { blob_to_data_url } from '../utils/image';

/** 진행 상황을 알리는 함수: (끝난 쪽 수, 전체 쪽 수) */
export type ProgressFn = (done: number, total: number) => void;

const MM_PER_INCH = 25.4;
const POINTS_PER_INCH = 72;
/** 인쇄용 해상도 */
const PRINT_DPI = 300;
/** 화면용 PDF와 그림 묶음에서 쪽 한 변의 픽셀 수 */
const SCREEN_PDF_PX = 1200;
const ZIP_IMAGE_PX = 1600;
/** 쪽을 그릴 때 기준으로 삼는 화면 크기(px). 여기에 배율을 곱해 원하는 픽셀 수를 만든다. */
const RENDER_BASE_PX = 800;
const JPEG_QUALITY = 0.92;
/** 화면 밖에 쪽을 그려 두는 자리 */
const OFFSCREEN_LEFT_PX = -100000;
/** 파일 이름의 쪽 번호 자릿수 */
const PAGE_NUMBER_DIGITS = 2;

/** 그림으로 바꿀 때의 설정 */
interface RenderOptions {
  bleed: boolean;
  /** 결과 그림 한 변의 픽셀 수 (재단 여백 포함) */
  target_px: number;
  mime_type: 'image/jpeg' | 'image/png';
}

/** 글꼴 파일을 data URL로 바꿔 둔 것 (한 번만 받는다) */
const font_css_cache = new Map<FontId, string>();

/**
 * mm를 PDF 포인트로 바꾼다.
 */
function mm_to_points(mm: number): number {
  return (mm * POINTS_PER_INCH) / MM_PER_INCH;
}

/**
 * 글꼴 하나를 그림 안에 심을 수 있는 @font-face 글로 만든다.
 */
async function load_font_css(font_id: FontId): Promise<string> {
  const cached = font_css_cache.get(font_id);
  if (cached) return cached;
  const font = FONTS[font_id];
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/${font.file}`);
  if (!response.ok) throw new Error('font load failed');
  const data_url = await blob_to_data_url(await response.blob());
  const css = `@font-face{font-family:'${font.css_family}';src:url(${data_url}) format('woff2');font-weight:${font.weight};}`;
  font_css_cache.set(font_id, css);
  return css;
}

/**
 * 책에 쓰이는 글꼴을 모두 심는 CSS를 만들고, 화면에도 그 글꼴이 준비되게 한다.
 */
async function prepare_fonts(): Promise<string> {
  const css_parts = await Promise.all(FONT_IDS.map(load_font_css));
  if (document.fonts) {
    await Promise.all(FONT_IDS.map((font_id) => document.fonts.load(`16px '${FONTS[font_id].css_family}'`).catch(() => [])));
    await document.fonts.ready;
  }
  return css_parts.join('\n');
}

/**
 * 요소 안의 그림이 모두 읽힐 때까지 기다린다.
 */
async function wait_for_images(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((image) =>
      image.complete && image.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.onload = () => resolve();
            image.onerror = () => resolve();
          }),
    ),
  );
}

/**
 * 캔버스를 파일 바이트로 바꾼다.
 */
function canvas_to_bytes(canvas: HTMLCanvasElement, mime_type: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('canvas export failed'));
          return;
        }
        void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
      },
      mime_type,
      JPEG_QUALITY,
    );
  });
}

/**
 * 책의 모든 쪽(표지, 본문, 만든 사람 쪽)을 차례로 그림으로 바꾼다.
 */
async function render_book_pages(book: Book, options: RenderOptions, on_progress?: ProgressFn): Promise<Uint8Array[]> {
  const total = book.pages.length + 1;
  on_progress?.(0, total);
  const font_css = await prepare_fonts();
  const { outer } = page_frame(RENDER_BASE_PX, options.bleed);
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:${OFFSCREEN_LEFT_PX}px;top:0;width:${outer}px;height:${outer}px;`;
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  const root = createRoot(host);
  const results: Uint8Array[] = [];
  try {
    for (let index = 0; index < total; index += 1) {
      const page = book.pages[index];
      const view = page
        ? createElement(PageView, { page, size: RENDER_BASE_PX, bleed: options.bleed })
        : createElement(CreditsPageView, { book, size: RENDER_BASE_PX, bleed: options.bleed });
      flushSync(() => root.render(view));
      const node = host.firstElementChild as HTMLElement | null;
      if (!node) throw new Error('page render failed');
      await wait_for_images(node);
      const canvas = await toCanvas(node, {
        width: outer,
        height: outer,
        pixelRatio: options.target_px / outer,
        backgroundColor: '#ffffff',
        fontEmbedCSS: font_css,
        skipAutoScale: true,
      });
      results.push(await canvas_to_bytes(canvas, options.mime_type));
      on_progress?.(index + 1, total);
    }
  } finally {
    root.unmount();
    host.remove();
  }
  return results;
}

/**
 * 책을 PDF로 만든다. print가 true면 사방 3mm 재단 여백이 든 인쇄용(300dpi 기준)이다.
 */
export async function export_pdf(book: Book, print: boolean, on_progress?: ProgressFn): Promise<Blob> {
  const page_mm = print ? PAGE_MM + BLEED_MM * 2 : PAGE_MM;
  const target_px = print ? Math.round((page_mm / MM_PER_INCH) * PRINT_DPI) : SCREEN_PDF_PX;
  const images = await render_book_pages(book, { bleed: print, target_px, mime_type: 'image/jpeg' }, on_progress);
  const pdf = await PDFDocument.create();
  // 책은 만든 사람의 것이다. 파일 정보에도 도구 이름을 남기지 않는다.
  pdf.setTitle(get_book_title(book));
  pdf.setAuthor(book.author.trim());
  pdf.setProducer('');
  pdf.setCreator('');
  const page_points = mm_to_points(page_mm);
  const bleed_points = mm_to_points(BLEED_MM);
  const trim_points = mm_to_points(PAGE_MM);
  for (const bytes of images) {
    const image = await pdf.embedJpg(bytes);
    const page = pdf.addPage([page_points, page_points]);
    page.drawImage(image, { x: 0, y: 0, width: page_points, height: page_points });
    if (print) {
      page.setBleedBox(0, 0, page_points, page_points);
      page.setTrimBox(bleed_points, bleed_points, trim_points, trim_points);
    }
  }
  const pdf_bytes = await pdf.save();
  return new Blob([pdf_bytes.slice().buffer], { type: 'application/pdf' });
}

/**
 * 쪽별 PNG를 zip으로 묶는다. 파일 이름은 00-cover, 01, 02, ..., NN-credits 순이다.
 */
export async function export_image_zip(book: Book, on_progress?: ProgressFn): Promise<Blob> {
  const images = await render_book_pages(book, { bleed: false, target_px: ZIP_IMAGE_PX, mime_type: 'image/png' }, on_progress);
  const files: Record<string, Uint8Array> = {};
  images.forEach((bytes, index) => {
    const number = String(index).padStart(PAGE_NUMBER_DIGITS, '0');
    const suffix = index === 0 ? '-cover' : index === images.length - 1 ? '-credits' : '';
    files[`${number}${suffix}.png`] = bytes;
  });
  // PNG는 이미 압축되어 있으므로 다시 압축하지 않는다.
  const zipped = zipSync(files, { level: 0 });
  return new Blob([zipped.slice().buffer], { type: 'application/zip' });
}

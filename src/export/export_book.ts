// Export. Pages are rendered to images first, then packed into a PDF or zip, so Korean fonts never break.
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

/** Progress callback: (pages done, total pages). */
export type ProgressFn = (done: number, total: number) => void;

const MM_PER_INCH = 25.4;
const POINTS_PER_INCH = 72;
const PRINT_DPI = 300;
/** Page side length (px) for the screen PDF and the image zip. */
const SCREEN_PDF_PX = 1200;
const ZIP_IMAGE_PX = 1600;
/** Layout size (px) pages are rendered at; pixelRatio scales it to the target size. */
const RENDER_BASE_PX = 800;
const JPEG_QUALITY = 0.92;
/** Off-screen x position (px) for the render host. */
const OFFSCREEN_LEFT_PX = -100000;
const PAGE_NUMBER_DIGITS = 2;

interface RenderOptions {
  bleed: boolean;
  /** Output side length (px), including bleed. */
  target_px: number;
  mime_type: 'image/jpeg' | 'image/png';
}

/** @font-face CSS with the font inlined as a data URL, fetched once per font. */
const font_css_cache = new Map<FontId, string>();

function mm_to_points(mm: number): number {
  return (mm * POINTS_PER_INCH) / MM_PER_INCH;
}

/** Builds an @font-face rule with the font inlined, so it can be embedded in the rendered image. */
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

/** Returns embeddable CSS for all book fonts and waits until the document has them loaded too. */
async function prepare_fonts(): Promise<string> {
  const css_parts = await Promise.all(FONT_IDS.map(load_font_css));
  if (document.fonts) {
    await Promise.all(FONT_IDS.map((font_id) => document.fonts.load(`16px '${FONTS[font_id].css_family}'`).catch(() => [])));
    await document.fonts.ready;
  }
  return css_parts.join('\n');
}

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

/** Renders every page (cover, story pages, credits) off-screen, one at a time, to image bytes. */
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

/** Exports a PDF. With print, pages get a 3 mm bleed on each side and are rendered at 300 dpi. */
export async function export_pdf(book: Book, print: boolean, on_progress?: ProgressFn): Promise<Blob> {
  const page_mm = print ? PAGE_MM + BLEED_MM * 2 : PAGE_MM;
  const target_px = print ? Math.round((page_mm / MM_PER_INCH) * PRINT_DPI) : SCREEN_PDF_PX;
  const images = await render_book_pages(book, { bleed: print, target_px, mime_type: 'image/jpeg' }, on_progress);
  const pdf = await PDFDocument.create();
  // The book belongs to its author, so the metadata does not name this app.
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

/** Exports one PNG per page in a zip, named 00-cover, 01, 02, ..., NN-credits. */
export async function export_image_zip(book: Book, on_progress?: ProgressFn): Promise<Blob> {
  const images = await render_book_pages(book, { bleed: false, target_px: ZIP_IMAGE_PX, mime_type: 'image/png' }, on_progress);
  const files: Record<string, Uint8Array> = {};
  images.forEach((bytes, index) => {
    const number = String(index).padStart(PAGE_NUMBER_DIGITS, '0');
    const suffix = index === 0 ? '-cover' : index === images.length - 1 ? '-credits' : '';
    files[`${number}${suffix}.png`] = bytes;
  });
  // PNGs are already compressed, so store them without recompressing.
  const zipped = zipSync(files, { level: 0 });
  return new Blob([zipped.slice().buffer], { type: 'application/zip' });
}

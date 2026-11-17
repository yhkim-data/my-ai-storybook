// Image helpers: Blob/data URL/base64 conversion and upload downscaling.
import { UPLOAD_JPEG_QUALITY, UPLOAD_MAX_PX } from '../constants';

export interface DataUrlParts {
  mime_type: string;
  base64: string;
}

export function blob_to_data_url(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

/** Splits a base64 data URL into MIME type and payload; null if not base64. */
export function split_data_url(data_url: string): DataUrlParts | null {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(data_url);
  if (!match) return null;
  return { mime_type: match[1] ?? '', base64: match[2] ?? '' };
}

export function base64_to_bytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function base64_to_blob(base64: string, mime_type: string): Blob {
  return new Blob([base64_to_bytes(base64)], { type: mime_type });
}

/** Encodes SVG as a base64 data URL via UTF-8, so non-ASCII text survives btoa. */
export function svg_to_data_url(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

/** Loads src into an img element; rejects if it is not an image. */
export function load_image(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('not an image'));
    image.src = src;
  });
}

/** Picture types every AI provider accepts as input. */
const RASTER_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
/** Side (px) an SVG picture is drawn at when it has to become a PNG. */
const SVG_RASTER_PX = 1024;

/** Returns the picture as PNG, JPEG or WebP; anything else (an SVG sample picture, a GIF) is drawn into a PNG. */
export async function to_raster_data_url(data_url: string): Promise<string> {
  const mime_type = /^data:([^;,]+)/.exec(data_url)?.[1] ?? '';
  if (RASTER_MIME_TYPES.includes(mime_type)) return data_url;
  const image = await load_image(data_url);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || SVG_RASTER_PX;
  canvas.height = image.naturalHeight || SVG_RASTER_PX;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no canvas');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/** Downscales an uploaded image to UPLOAD_MAX_PX and returns a data URL; rejects non-images. */
export async function prepare_upload_image(file: Blob): Promise<string> {
  const original_url = await blob_to_data_url(file);
  const image = await load_image(original_url);
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  if (longest === 0) throw new Error('not an image');
  // Small images and SVGs are kept as-is.
  if (longest <= UPLOAD_MAX_PX || file.type === 'image/svg+xml') return original_url;
  const scale = UPLOAD_MAX_PX / longest;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) return original_url;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', UPLOAD_JPEG_QUALITY);
}

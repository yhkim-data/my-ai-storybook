// 그림 자료를 바꾸는 도우미: Blob, data URL, SVG 글, 올린 파일 줄이기.
import { UPLOAD_JPEG_QUALITY, UPLOAD_MAX_PX } from '../constants';

/** data URL을 나눈 결과 */
export interface DataUrlParts {
  mime_type: string;
  base64: string;
}

/**
 * Blob을 data URL로 바꾼다.
 */
export function blob_to_data_url(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * base64 data URL을 종류와 내용으로 나눈다. base64가 아니면 null이다.
 */
export function split_data_url(data_url: string): DataUrlParts | null {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(data_url);
  if (!match) return null;
  return { mime_type: match[1] ?? '', base64: match[2] ?? '' };
}

/**
 * base64 글을 바이트 배열로 바꾼다.
 */
export function base64_to_bytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/**
 * base64 글을 Blob으로 바꾼다.
 */
export function base64_to_blob(base64: string, mime_type: string): Blob {
  return new Blob([base64_to_bytes(base64)], { type: mime_type });
}

/**
 * SVG 글을 data URL로 바꾼다. 한글이 들어 있어도 깨지지 않게 UTF-8로 싼다.
 */
export function svg_to_data_url(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

/**
 * 그림 주소를 읽어 img 요소로 만든다. 그림이 아니면 실패한다.
 */
export function load_image(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('not an image'));
    image.src = src;
  });
}

/**
 * 올린 그림 파일을 책에 넣기 좋게 줄여 data URL로 돌려준다. 그림이 아니면 실패한다.
 */
export async function prepare_upload_image(file: Blob): Promise<string> {
  const original_url = await blob_to_data_url(file);
  const image = await load_image(original_url);
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  if (longest === 0) throw new Error('not an image');
  // 작은 그림과 SVG는 그대로 쓴다.
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

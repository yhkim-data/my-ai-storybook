// Box move/resize math with snapping to page edges and center, shared by the text box and the picture.
// All units are percent (0-100) of the page; `aspect` is the page height divided by its width.
import { BOX_MIN_SIZE, IMAGE_BOX_MIN_SIZE, SNAP_DISTANCE, SNAP_LINES } from '../constants';
import type { Rect } from '../types';

const PAGE_MAX = 100;
const PAGE_CENTER = 50;
const HALF = 2;

export type Corner = 'nw' | 'ne' | 'sw' | 'se';

/** Smallest width and height, in percent of the page. */
export interface MinSize {
  w: number;
  h: number;
}

export const TEXT_MIN_SIZE: MinSize = { w: BOX_MIN_SIZE, h: BOX_MIN_SIZE };

/** A picture is at least IMAGE_BOX_MIN_SIZE percent of the page width on both sides, also on pages that are not square. */
export function image_min_size(aspect: number): MinSize {
  return { w: IMAGE_BOX_MIN_SIZE, h: IMAGE_BOX_MIN_SIZE / aspect };
}

/** New rect plus the vertical/horizontal snap guide positions (null when not snapped). */
export interface SnapResult {
  rect: Rect;
  guide_x: number | null;
  guide_y: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/** Closest snap line within SNAP_DISTANCE, or null. */
function nearest_line(value: number, lines: number[]): number | null {
  let best: number | null = null;
  for (const line of lines) {
    const distance = Math.abs(value - line);
    if (distance <= SNAP_DISTANCE && (best === null || distance < Math.abs(value - best))) best = line;
  }
  return best;
}

/** Snaps one axis for a move, checking the leading edge, then the trailing edge, then the center. */
function snap_axis_move(start: number, length: number): { start: number; guide: number | null } {
  const front = nearest_line(start, SNAP_LINES);
  if (front !== null) return { start: front, guide: front };
  const back = nearest_line(start + length, SNAP_LINES);
  if (back !== null) return { start: back - length, guide: back };
  const center = nearest_line(start + length / HALF, [PAGE_CENTER]);
  if (center !== null) return { start: center - length / HALF, guide: center };
  return { start, guide: null };
}

/**
 * Moves a box by (dx, dy), kept inside the page and snapped to edges and center.
 * Arrow-key moves pass snap = false, so a small step is never pulled back to a line.
 */
export function move_box(box: Rect, dx: number, dy: number, snap = true): SnapResult {
  const no_snap = (start: number) => ({ start, guide: null });
  const snapped_x = snap ? snap_axis_move(box.x + dx, box.w) : no_snap(box.x + dx);
  const snapped_y = snap ? snap_axis_move(box.y + dy, box.h) : no_snap(box.y + dy);
  const x = clamp(snapped_x.start, 0, PAGE_MAX - box.w);
  const y = clamp(snapped_y.start, 0, PAGE_MAX - box.h);
  return {
    rect: { x, y, w: box.w, h: box.h },
    guide_x: x === snapped_x.start ? snapped_x.guide : null,
    guide_y: y === snapped_y.start ? snapped_y.guide : null,
  };
}

/** Resizes one axis, dragging the leading edge if moves_start, else the trailing edge. */
function resize_axis(
  start: number,
  length: number,
  delta: number,
  moves_start: boolean,
  min: number,
): { start: number; length: number; guide: number | null } {
  const end = start + length;
  if (moves_start) {
    const raw = clamp(start + delta, 0, end - min);
    const line = nearest_line(raw, SNAP_LINES);
    const next_start = line !== null && line <= end - min ? line : raw;
    return { start: next_start, length: end - next_start, guide: next_start === line ? line : null };
  }
  const raw = clamp(end + delta, start + min, PAGE_MAX);
  const line = nearest_line(raw, SNAP_LINES);
  const next_end = line !== null && line >= start + min ? line : raw;
  return { start, length: next_end - start, guide: next_end === line ? line : null };
}

function moves_left(corner: Corner): boolean {
  return corner === 'nw' || corner === 'sw';
}

function moves_top(corner: Corner): boolean {
  return corner === 'nw' || corner === 'ne';
}

/** Resizes a box by dragging a corner, keeping the minimum size and snapping the dragged edges. */
export function resize_box(box: Rect, corner: Corner, dx: number, dy: number, min: MinSize = TEXT_MIN_SIZE): SnapResult {
  const horizontal = resize_axis(box.x, box.w, dx, moves_left(corner), min.w);
  const vertical = resize_axis(box.y, box.h, dy, moves_top(corner), min.h);
  return {
    rect: { x: horizontal.start, y: vertical.start, w: horizontal.length, h: vertical.length },
    guide_x: horizontal.guide,
    guide_y: vertical.guide,
  };
}

/**
 * Resizes a box by a corner while its shape on screen stays the same, so a picture keeps its proportions.
 * Works in screen units (page width 1, height `aspect`) so it also holds on pages that are not square.
 * The opposite corner stays put; the box keeps the minimum width and stays inside the page.
 */
export function resize_box_keep_ratio(box: Rect, corner: Corner, dx: number, dy: number, aspect: number, min_w: number): SnapResult {
  const width = box.w / PAGE_MAX;
  const height = (box.h * aspect) / PAGE_MAX;
  const ratio = width / height;
  const sign_x = moves_left(corner) ? -1 : 1;
  const sign_y = moves_top(corner) ? -1 : 1;
  // Follow whichever direction the pointer moved more.
  const from_x = width + (sign_x * dx) / PAGE_MAX;
  const from_y = (height + (sign_y * dy * aspect) / PAGE_MAX) * ratio;
  const wanted = Math.abs(from_x - width) >= Math.abs(from_y - width) ? from_x : from_y;
  const room_x = moves_left(corner) ? box.x + box.w : PAGE_MAX - box.x;
  const room_y = moves_top(corner) ? box.y + box.h : PAGE_MAX - box.y;
  const max_width = Math.min(room_x / PAGE_MAX, ((room_y * aspect) / PAGE_MAX) * ratio);
  const next_width = clamp(wanted, Math.min(min_w / PAGE_MAX, max_width), max_width);
  const w = next_width * PAGE_MAX;
  const h = ((next_width / ratio) * PAGE_MAX) / aspect;
  const x = moves_left(corner) ? box.x + box.w - w : box.x;
  const y = moves_top(corner) ? box.y + box.h - h : box.y;
  return { rect: { x, y, w, h }, guide_x: null, guide_y: null };
}

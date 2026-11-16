// Text box move/resize math with snapping to page edges and center. All units are percent (0-100).
import { BOX_MIN_SIZE, SNAP_DISTANCE, SNAP_LINES } from '../constants';
import type { Rect } from '../types';

const PAGE_MAX = 100;
const PAGE_CENTER = 50;
const HALF = 2;

export type Corner = 'nw' | 'ne' | 'sw' | 'se';

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

/** Moves a box by (dx, dy), kept inside the page and snapped to edges and center. */
export function move_box(box: Rect, dx: number, dy: number): SnapResult {
  const snapped_x = snap_axis_move(box.x + dx, box.w);
  const snapped_y = snap_axis_move(box.y + dy, box.h);
  const x = clamp(snapped_x.start, 0, PAGE_MAX - box.w);
  const y = clamp(snapped_y.start, 0, PAGE_MAX - box.h);
  return {
    rect: { x, y, w: box.w, h: box.h },
    guide_x: x === snapped_x.start ? snapped_x.guide : null,
    guide_y: y === snapped_y.start ? snapped_y.guide : null,
  };
}

/** Resizes one axis, dragging the leading edge if moves_start, else the trailing edge. */
function resize_axis(start: number, length: number, delta: number, moves_start: boolean): { start: number; length: number; guide: number | null } {
  const end = start + length;
  if (moves_start) {
    const raw = clamp(start + delta, 0, end - BOX_MIN_SIZE);
    const line = nearest_line(raw, SNAP_LINES);
    const next_start = line !== null && line <= end - BOX_MIN_SIZE ? line : raw;
    return { start: next_start, length: end - next_start, guide: next_start === line ? line : null };
  }
  const raw = clamp(end + delta, start + BOX_MIN_SIZE, PAGE_MAX);
  const line = nearest_line(raw, SNAP_LINES);
  const next_end = line !== null && line >= start + BOX_MIN_SIZE ? line : raw;
  return { start, length: next_end - start, guide: next_end === line ? line : null };
}

/** Resizes a box by dragging a corner, keeping BOX_MIN_SIZE and snapping the dragged edges. */
export function resize_box(box: Rect, corner: Corner, dx: number, dy: number): SnapResult {
  const horizontal = resize_axis(box.x, box.w, dx, corner === 'nw' || corner === 'sw');
  const vertical = resize_axis(box.y, box.h, dy, corner === 'nw' || corner === 'ne');
  return {
    rect: { x: horizontal.start, y: vertical.start, w: horizontal.length, h: vertical.length },
    guide_x: horizontal.guide,
    guide_y: vertical.guide,
  };
}

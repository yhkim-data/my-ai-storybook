// 글상자를 옮기고 크기를 바꾸는 계산. 쪽 가장자리와 가운데에 자석처럼 붙인다. 단위는 모두 퍼센트(0~100).
import { BOX_MIN_SIZE, SNAP_DISTANCE, SNAP_LINES } from '../constants';
import type { Rect } from '../types';

const PAGE_MAX = 100;
const PAGE_CENTER = 50;
const HALF = 2;

/** 글상자의 네 모서리 */
export type Corner = 'nw' | 'ne' | 'sw' | 'se';

/** 계산 결과: 새 사각형과, 자석이 붙은 세로선·가로선의 위치 (없으면 null) */
export interface SnapResult {
  rect: Rect;
  guide_x: number | null;
  guide_y: number | null;
}

/**
 * 값을 범위 안으로 맞춘다.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * 값이 자석 선 가까이에 있으면 그 선을 돌려준다. 없으면 null이다.
 */
function nearest_line(value: number, lines: number[]): number | null {
  let best: number | null = null;
  for (const line of lines) {
    const distance = Math.abs(value - line);
    if (distance <= SNAP_DISTANCE && (best === null || distance < Math.abs(value - best))) best = line;
  }
  return best;
}

/**
 * 한 방향(가로 또는 세로)으로 옮길 때 자석을 적용한다. 앞 가장자리, 뒤 가장자리, 가운데 순으로 본다.
 */
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
 * 글상자를 (dx, dy)만큼 옮긴다. 쪽 밖으로 나가지 않고, 가장자리와 가운데에 붙는다.
 */
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

/**
 * 한 방향의 크기를 바꾼다. moves_start가 참이면 앞 가장자리를, 아니면 뒤 가장자리를 끈다.
 */
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

/**
 * 모서리를 (dx, dy)만큼 끌어 글상자 크기를 바꾼다. 최소 크기를 지키고, 끄는 가장자리가 자석 선에 붙는다.
 */
export function resize_box(box: Rect, corner: Corner, dx: number, dy: number): SnapResult {
  const horizontal = resize_axis(box.x, box.w, dx, corner === 'nw' || corner === 'sw');
  const vertical = resize_axis(box.y, box.h, dy, corner === 'nw' || corner === 'ne');
  return {
    rect: { x: horizontal.start, y: vertical.start, w: horizontal.length, h: vertical.length },
    guide_x: horizontal.guide,
    guide_y: vertical.guide,
  };
}

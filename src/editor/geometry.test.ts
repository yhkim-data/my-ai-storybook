// 글상자 옮기기·크기 바꾸기 계산 검사: 쪽 밖으로 안 나감, 자석, 최소 크기, 반대쪽 가장자리 고정.
import { describe, expect, it } from 'vitest';
import { BOX_MIN_SIZE, SNAP_DISTANCE } from '../constants';
import type { Rect } from '../types';
import { move_box, resize_box } from './geometry';

/** 자석에 걸리지 않는 기준 글상자 (가장자리 20~60, 가운데 40) */
const BASE: Rect = { x: 20, y: 20, w: 40, h: 40 };
/** 자석 거리 안쪽으로 들어가는 어긋남 */
const NEAR = SNAP_DISTANCE / 2;
/** 자석 거리 밖으로 벗어나는 어긋남 */
const FAR = SNAP_DISTANCE * 2;
const PAGE_MAX = 100;
const EPSILON = 1e-9;

describe('move_box', () => {
  it('쪽 밖으로 나가지 않는다', () => {
    const left_up = move_box(BASE, -500, -500);
    expect(left_up.rect.x).toBe(0);
    expect(left_up.rect.y).toBe(0);
    const right_down = move_box(BASE, 500, 500);
    expect(right_down.rect.x).toBeCloseTo(PAGE_MAX - BASE.w);
    expect(right_down.rect.y).toBeCloseTo(PAGE_MAX - BASE.h);
    expect(right_down.rect.w).toBe(BASE.w);
    expect(right_down.rect.h).toBe(BASE.h);
  });

  it('왼쪽 가장자리 0에 붙고 guide가 0이다', () => {
    const result = move_box(BASE, -(BASE.x - NEAR), 0);
    expect(result.rect.x).toBe(0);
    expect(result.guide_x).toBe(0);
  });

  it('안쪽 여백 5에 붙고 guide가 5이다', () => {
    const result = move_box(BASE, 5 + NEAR - BASE.x, 0);
    expect(result.rect.x).toBe(5);
    expect(result.guide_x).toBe(5);
  });

  it('오른쪽 안쪽 여백 95에 붙고 guide가 95이다', () => {
    const start_x = 95 - BASE.w - FAR - 10;
    const result = move_box({ ...BASE, x: start_x }, 10 + FAR - NEAR, 0);
    expect(result.rect.x + result.rect.w).toBeCloseTo(95);
    expect(result.guide_x).toBe(95);
  });

  it('오른쪽 끝 100에 붙고 guide가 100이다', () => {
    const result = move_box({ ...BASE, x: 50 }, 10 - NEAR, 0);
    expect(result.rect.x + result.rect.w).toBeCloseTo(100);
    expect(result.guide_x).toBe(100);
  });

  it('가운데 50에 붙고 guide가 50이다 (세로도 같다)', () => {
    const result = move_box(BASE, 50 - BASE.w / 2 - BASE.x + NEAR, 50 - BASE.h / 2 - BASE.y - NEAR);
    expect(result.rect.x + result.rect.w / 2).toBeCloseTo(50);
    expect(result.rect.y + result.rect.h / 2).toBeCloseTo(50);
    expect(result.guide_x).toBe(50);
    expect(result.guide_y).toBe(50);
  });

  it('세로로도 위 가장자리 0과 아래 100에 붙는다', () => {
    const top = move_box(BASE, 0, -(BASE.y - NEAR));
    expect(top.rect.y).toBe(0);
    expect(top.guide_y).toBe(0);
    const bottom = move_box({ ...BASE, y: 50 }, 0, 10 - NEAR);
    expect(bottom.rect.y + bottom.rect.h).toBeCloseTo(100);
    expect(bottom.guide_y).toBe(100);
  });

  it('자석 선에서 멀면 붙지 않고 guide가 null이다', () => {
    const result = move_box(BASE, 3, 3);
    expect(result.rect.x).toBeCloseTo(BASE.x + 3);
    expect(result.rect.y).toBeCloseTo(BASE.y + 3);
    expect(result.guide_x).toBeNull();
    expect(result.guide_y).toBeNull();
  });

  it('자석 거리 바로 밖(0에서 FAR)은 붙지 않는다', () => {
    const result = move_box(BASE, FAR - BASE.x, 0);
    expect(result.rect.x).toBeCloseTo(FAR);
    expect(result.guide_x).toBeNull();
  });
});

describe('resize_box', () => {
  it('nw 모서리: 오른쪽 아래 가장자리가 그대로다', () => {
    const result = resize_box(BASE, 'nw', -10, -10);
    expect(result.rect.x).toBeCloseTo(10);
    expect(result.rect.y).toBeCloseTo(10);
    expect(result.rect.x + result.rect.w).toBeCloseTo(BASE.x + BASE.w);
    expect(result.rect.y + result.rect.h).toBeCloseTo(BASE.y + BASE.h);
  });

  it('ne 모서리: 왼쪽 아래 가장자리가 그대로다', () => {
    const result = resize_box(BASE, 'ne', 10, -10);
    expect(result.rect.x).toBe(BASE.x);
    expect(result.rect.x + result.rect.w).toBeCloseTo(BASE.x + BASE.w + 10);
    expect(result.rect.y).toBeCloseTo(10);
    expect(result.rect.y + result.rect.h).toBeCloseTo(BASE.y + BASE.h);
  });

  it('sw 모서리: 오른쪽 위 가장자리가 그대로다', () => {
    const result = resize_box(BASE, 'sw', -10, 10);
    expect(result.rect.x).toBeCloseTo(10);
    expect(result.rect.x + result.rect.w).toBeCloseTo(BASE.x + BASE.w);
    expect(result.rect.y).toBe(BASE.y);
    expect(result.rect.y + result.rect.h).toBeCloseTo(BASE.y + BASE.h + 10);
  });

  it('se 모서리: 왼쪽 위 가장자리가 그대로다', () => {
    const result = resize_box(BASE, 'se', 10, 10);
    expect(result.rect.x).toBe(BASE.x);
    expect(result.rect.y).toBe(BASE.y);
    expect(result.rect.w).toBeCloseTo(BASE.w + 10);
    expect(result.rect.h).toBeCloseTo(BASE.h + 10);
  });

  it('BOX_MIN_SIZE보다 작아지지 않고 반대쪽 가장자리는 그대로다', () => {
    const nw = resize_box(BASE, 'nw', 500, 500);
    expect(nw.rect.w).toBeCloseTo(BOX_MIN_SIZE);
    expect(nw.rect.h).toBeCloseTo(BOX_MIN_SIZE);
    expect(nw.rect.x + nw.rect.w).toBeCloseTo(BASE.x + BASE.w);
    const se = resize_box(BASE, 'se', -500, -500);
    expect(se.rect.w).toBeCloseTo(BOX_MIN_SIZE);
    expect(se.rect.h).toBeCloseTo(BOX_MIN_SIZE);
    expect(se.rect.x).toBe(BASE.x);
    expect(se.rect.y).toBe(BASE.y);
  });

  it('쪽 밖으로 나가지 않는다', () => {
    const se = resize_box(BASE, 'se', 500, 500);
    expect(se.rect.x + se.rect.w).toBeLessThanOrEqual(PAGE_MAX + EPSILON);
    expect(se.rect.y + se.rect.h).toBeLessThanOrEqual(PAGE_MAX + EPSILON);
    const nw = resize_box(BASE, 'nw', -500, -500);
    expect(nw.rect.x).toBeGreaterThanOrEqual(0);
    expect(nw.rect.y).toBeGreaterThanOrEqual(0);
  });

  it('끄는 가장자리가 자석 선에 붙고 guide가 그 선이다', () => {
    const nw = resize_box(BASE, 'nw', 5 + NEAR - BASE.x, 0 - NEAR - BASE.y);
    expect(nw.rect.x).toBe(5);
    expect(nw.guide_x).toBe(5);
    expect(nw.rect.y).toBe(0);
    expect(nw.guide_y).toBe(0);
    expect(nw.rect.x + nw.rect.w).toBeCloseTo(BASE.x + BASE.w);
    const se = resize_box(BASE, 'se', 95 - NEAR - (BASE.x + BASE.w), 100 - (BASE.y + BASE.h));
    expect(se.rect.x + se.rect.w).toBe(95);
    expect(se.guide_x).toBe(95);
    expect(se.rect.y + se.rect.h).toBe(100);
    expect(se.guide_y).toBe(100);
  });

  it('자석 선에서 멀면 guide가 null이다', () => {
    const result = resize_box(BASE, 'se', 3, 3);
    expect(result.guide_x).toBeNull();
    expect(result.guide_y).toBeNull();
  });
});

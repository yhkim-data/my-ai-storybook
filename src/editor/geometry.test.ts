import { describe, expect, it } from 'vitest';
import { BOX_MIN_SIZE, IMAGE_BOX_MIN_SIZE, SNAP_DISTANCE } from '../constants';
import type { Rect } from '../types';
import { image_min_size, move_box, resize_box, resize_box_keep_ratio } from './geometry';

/** Base box that touches no snap line (edges 20-60, center 40). */
const BASE: Rect = { x: 20, y: 20, w: 40, h: 40 };
/** Offset inside the snap distance. */
const NEAR = SNAP_DISTANCE / 2;
/** Offset outside the snap distance. */
const FAR = SNAP_DISTANCE * 2;
const PAGE_MAX = 100;
const EPSILON = 1e-9;

describe('move_box', () => {
  it('stays inside the page', () => {
    const left_up = move_box(BASE, -500, -500);
    expect(left_up.rect.x).toBe(0);
    expect(left_up.rect.y).toBe(0);
    const right_down = move_box(BASE, 500, 500);
    expect(right_down.rect.x).toBeCloseTo(PAGE_MAX - BASE.w);
    expect(right_down.rect.y).toBeCloseTo(PAGE_MAX - BASE.h);
    expect(right_down.rect.w).toBe(BASE.w);
    expect(right_down.rect.h).toBe(BASE.h);
  });

  it('snaps to left edge 0 with guide 0', () => {
    const result = move_box(BASE, -(BASE.x - NEAR), 0);
    expect(result.rect.x).toBe(0);
    expect(result.guide_x).toBe(0);
  });

  it('snaps to inner margin 5 with guide 5', () => {
    const result = move_box(BASE, 5 + NEAR - BASE.x, 0);
    expect(result.rect.x).toBe(5);
    expect(result.guide_x).toBe(5);
  });

  it('snaps to right inner margin 95 with guide 95', () => {
    const start_x = 95 - BASE.w - FAR - 10;
    const result = move_box({ ...BASE, x: start_x }, 10 + FAR - NEAR, 0);
    expect(result.rect.x + result.rect.w).toBeCloseTo(95);
    expect(result.guide_x).toBe(95);
  });

  it('snaps to right edge 100 with guide 100', () => {
    const result = move_box({ ...BASE, x: 50 }, 10 - NEAR, 0);
    expect(result.rect.x + result.rect.w).toBeCloseTo(100);
    expect(result.guide_x).toBe(100);
  });

  it('snaps to center 50 with guide 50 (vertically too)', () => {
    const result = move_box(BASE, 50 - BASE.w / 2 - BASE.x + NEAR, 50 - BASE.h / 2 - BASE.y - NEAR);
    expect(result.rect.x + result.rect.w / 2).toBeCloseTo(50);
    expect(result.rect.y + result.rect.h / 2).toBeCloseTo(50);
    expect(result.guide_x).toBe(50);
    expect(result.guide_y).toBe(50);
  });

  it('snaps to top 0 and bottom 100 vertically', () => {
    const top = move_box(BASE, 0, -(BASE.y - NEAR));
    expect(top.rect.y).toBe(0);
    expect(top.guide_y).toBe(0);
    const bottom = move_box({ ...BASE, y: 50 }, 0, 10 - NEAR);
    expect(bottom.rect.y + bottom.rect.h).toBeCloseTo(100);
    expect(bottom.guide_y).toBe(100);
  });

  it('does not snap far from lines; guide is null', () => {
    const result = move_box(BASE, 3, 3);
    expect(result.rect.x).toBeCloseTo(BASE.x + 3);
    expect(result.rect.y).toBeCloseTo(BASE.y + 3);
    expect(result.guide_x).toBeNull();
    expect(result.guide_y).toBeNull();
  });

  it('does not snap just outside the snap distance (FAR from 0)', () => {
    const result = move_box(BASE, FAR - BASE.x, 0);
    expect(result.rect.x).toBeCloseTo(FAR);
    expect(result.guide_x).toBeNull();
  });
});

describe('resize_box', () => {
  it('nw corner: right and bottom edges stay put', () => {
    const result = resize_box(BASE, 'nw', -10, -10);
    expect(result.rect.x).toBeCloseTo(10);
    expect(result.rect.y).toBeCloseTo(10);
    expect(result.rect.x + result.rect.w).toBeCloseTo(BASE.x + BASE.w);
    expect(result.rect.y + result.rect.h).toBeCloseTo(BASE.y + BASE.h);
  });

  it('ne corner: left and bottom edges stay put', () => {
    const result = resize_box(BASE, 'ne', 10, -10);
    expect(result.rect.x).toBe(BASE.x);
    expect(result.rect.x + result.rect.w).toBeCloseTo(BASE.x + BASE.w + 10);
    expect(result.rect.y).toBeCloseTo(10);
    expect(result.rect.y + result.rect.h).toBeCloseTo(BASE.y + BASE.h);
  });

  it('sw corner: right and top edges stay put', () => {
    const result = resize_box(BASE, 'sw', -10, 10);
    expect(result.rect.x).toBeCloseTo(10);
    expect(result.rect.x + result.rect.w).toBeCloseTo(BASE.x + BASE.w);
    expect(result.rect.y).toBe(BASE.y);
    expect(result.rect.y + result.rect.h).toBeCloseTo(BASE.y + BASE.h + 10);
  });

  it('se corner: left and top edges stay put', () => {
    const result = resize_box(BASE, 'se', 10, 10);
    expect(result.rect.x).toBe(BASE.x);
    expect(result.rect.y).toBe(BASE.y);
    expect(result.rect.w).toBeCloseTo(BASE.w + 10);
    expect(result.rect.h).toBeCloseTo(BASE.h + 10);
  });

  it('never shrinks below BOX_MIN_SIZE and keeps the opposite edge', () => {
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

  it('stays inside the page', () => {
    const se = resize_box(BASE, 'se', 500, 500);
    expect(se.rect.x + se.rect.w).toBeLessThanOrEqual(PAGE_MAX + EPSILON);
    expect(se.rect.y + se.rect.h).toBeLessThanOrEqual(PAGE_MAX + EPSILON);
    const nw = resize_box(BASE, 'nw', -500, -500);
    expect(nw.rect.x).toBeGreaterThanOrEqual(0);
    expect(nw.rect.y).toBeGreaterThanOrEqual(0);
  });

  it('dragged edges snap to lines and guide is that line', () => {
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

  it('guide is null far from snap lines', () => {
    const result = resize_box(BASE, 'se', 3, 3);
    expect(result.guide_x).toBeNull();
    expect(result.guide_y).toBeNull();
  });
});

describe('picture box', () => {
  /** On-screen width / height of a box on a page whose height is aspect times its width. */
  const screen_ratio = (rect: Rect, aspect: number) => rect.w / (rect.h * aspect);

  it('keeping proportions: a corner drag scales the box and its shape on screen stays the same', () => {
    for (const aspect of [1, 4 / 3, 3 / 4]) {
      const start: Rect = { x: 20, y: 20, w: 40, h: 30 };
      const before = screen_ratio(start, aspect);
      for (const corner of ['nw', 'ne', 'sw', 'se'] as const) {
        const grown = resize_box_keep_ratio(start, corner, 10, 4, aspect, IMAGE_BOX_MIN_SIZE).rect;
        expect(screen_ratio(grown, aspect)).toBeCloseTo(before);
      }
      const se = resize_box_keep_ratio(start, 'se', 10, 0, aspect, IMAGE_BOX_MIN_SIZE).rect;
      expect(se.x).toBe(start.x);
      expect(se.y).toBe(start.y);
      expect(se.w).toBeCloseTo(50);
      const nw = resize_box_keep_ratio(start, 'nw', -10, 0, aspect, IMAGE_BOX_MIN_SIZE).rect;
      expect(nw.x + nw.w).toBeCloseTo(start.x + start.w);
      expect(nw.y + nw.h).toBeCloseTo(start.y + start.h);
    }
  });

  it('keeping proportions: never smaller than the minimum width, never outside the page', () => {
    const start: Rect = { x: 30, y: 30, w: 40, h: 40 };
    const tiny = resize_box_keep_ratio(start, 'se', -500, -500, 1, IMAGE_BOX_MIN_SIZE).rect;
    expect(tiny.w).toBeCloseTo(IMAGE_BOX_MIN_SIZE);
    expect(tiny.h).toBeCloseTo(IMAGE_BOX_MIN_SIZE);
    const huge = resize_box_keep_ratio(start, 'se', 500, 500, 1, IMAGE_BOX_MIN_SIZE).rect;
    expect(huge.x + huge.w).toBeLessThanOrEqual(PAGE_MAX + EPSILON);
    expect(huge.y + huge.h).toBeLessThanOrEqual(PAGE_MAX + EPSILON);
    expect(huge.w).toBeCloseTo(huge.h);
  });

  it('a full-page picture can still be made smaller from any corner', () => {
    const full: Rect = { x: 0, y: 0, w: 100, h: 100 };
    const smaller = resize_box_keep_ratio(full, 'nw', 20, 20, 1, IMAGE_BOX_MIN_SIZE).rect;
    expect(smaller.w).toBeCloseTo(80);
    expect(smaller.x).toBeCloseTo(20);
  });

  it('free resize uses the picture minimum: 10% of the page width on both sides', () => {
    const start: Rect = { x: 30, y: 30, w: 40, h: 40 };
    const min = image_min_size(4 / 3);
    const tiny = resize_box(start, 'se', -500, -500, min).rect;
    expect(tiny.w).toBeCloseTo(IMAGE_BOX_MIN_SIZE);
    expect(tiny.h * (4 / 3)).toBeCloseTo(IMAGE_BOX_MIN_SIZE);
    // A picture can touch the page edges (full bleed) but not leave the page.
    const edge = move_box({ x: 0, y: 0, w: 100, h: 100 }, 30, 30).rect;
    expect(edge).toEqual({ x: 0, y: 0, w: 100, h: 100 });
  });
});

describe('keyboard moves', () => {
  it('move_box without snapping moves by exactly the step, even next to a snap line', () => {
    const near_center: Rect = { x: 20, y: 19, w: 40, h: 60 };
    expect(move_box(near_center, 0, 1, false).rect.y).toBe(20);
    expect(move_box(near_center, 0, -1, false).rect.y).toBe(18);
    expect(move_box(near_center, 0, -1, false).guide_y).toBeNull();
    // Still kept inside the page.
    expect(move_box(near_center, -50, 0, false).rect.x).toBe(0);
  });
});


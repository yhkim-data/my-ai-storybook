// Pop-up list placement: below the button when it fits, above when only that fits, otherwise limited to the window.
import { describe, expect, it } from 'vitest';
import { place_popover } from './use_popover';

const VIEW = { width: 1024, height: 768 };
const LIST = { width: 260, height: 360 };

describe('place_popover', () => {
  it('opens below the button when the list fits there', () => {
    const place = place_popover({ top: 100, bottom: 140, left: 600, right: 760 }, LIST, VIEW, 'end');
    expect(place).toEqual({ top: 146, left: 500, max_height: null });
  });

  it('opens above the button when only the room above is enough', () => {
    const place = place_popover({ top: 600, bottom: 640, left: 100, right: 260 }, LIST, VIEW, 'start');
    expect(place.top).toBe(600 - 6 - LIST.height);
    expect(place.max_height).toBeNull();
  });

  it('a list taller than both sides gets a max height on the bigger side and stays inside the window', () => {
    const tall = { width: 260, height: 900 };
    const place = place_popover({ top: 300, bottom: 340, left: 100, right: 260 }, tall, VIEW, 'start');
    expect(place.top).toBe(346);
    expect(place.top + (place.max_height ?? 0)).toBeLessThanOrEqual(VIEW.height - 8);
  });

  it('never runs off the left or right edge', () => {
    expect(place_popover({ top: 10, bottom: 50, left: 0, right: 40 }, LIST, VIEW, 'end').left).toBe(8);
    expect(place_popover({ top: 10, bottom: 50, left: 1000, right: 1020 }, LIST, VIEW, 'start').left).toBe(VIEW.width - 8 - LIST.width);
  });
});

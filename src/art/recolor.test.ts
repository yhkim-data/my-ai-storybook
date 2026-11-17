// Practice "Fix the picture": "목도리 파랗게" turns only the scarf blue; every other color in the picture stays.
import { describe, expect, it } from 'vitest';
import { BASE_SCENES } from './scene_art';
import { RECOLOR_COLORS, RECOLOR_TARGETS, hex_to_hsl, parse_recolor_note, recolor_hex, recolor_svg } from './recolor';

const SCARF = RECOLOR_TARGETS.find((target) => target.id === 'scarf')!;
const BLUE = RECOLOR_COLORS.find((color) => color.id === 'blue')!;
const BLUE_HUE = 215;
const HUE_TOLERANCE = 2;

/** How many times each color is drawn in an SVG (the recolor note comment is not drawing). */
function color_counts(svg: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const match of svg.replace(/<!--[^>]*-->/g, '').matchAll(/#[0-9a-f]{6}\b/gi)) counts.set(match[0].toUpperCase(), (counts.get(match[0].toUpperCase()) ?? 0) + 1);
  return counts;
}

/** The first story scene that has the scarf in it. */
const SCENE = BASE_SCENES.find((svg) => SCARF.colors.some((color) => svg.toUpperCase().includes(color)))!;

describe('parse_recolor_note', () => {
  it('finds the thing and the color in Korean and English notes', () => {
    expect(parse_recolor_note('목도리를 파랗게')).toMatchObject({ target: { id: 'scarf' }, color: { id: 'blue' } });
    expect(parse_recolor_note('지붕 노란색으로')).toMatchObject({ target: { id: 'roof' }, color: { id: 'yellow' } });
    expect(parse_recolor_note('make the scarf blue')).toMatchObject({ target: { id: 'scarf' }, color: { id: 'blue' } });
    expect(parse_recolor_note('여우 털을 하얗게')).toMatchObject({ target: { id: 'fox' }, color: { id: 'white' } });
  });

  it('returns null when the thing or the color is missing', () => {
    expect(parse_recolor_note('더 귀엽게')).toBeNull();
    expect(parse_recolor_note('목도리를 크게')).toBeNull();
  });
});

describe('recolor_svg', () => {
  it('목도리 파랗게: only the scarf colors change, to blue with the same lightness', () => {
    const before = color_counts(SCENE);
    const after_svg = recolor_svg(SCENE, parse_recolor_note('목도리 파랗게')!)!;
    const after = color_counts(after_svg);
    for (const [color, count] of before) {
      if (SCARF.colors.includes(color)) expect(after.get(color) ?? 0).toBe(0);
      else expect(after.get(color), color).toBe(count);
    }
    const new_colors = [...after.keys()].filter((color) => !before.has(color));
    expect(new_colors.length).toBeGreaterThan(0);
    for (const color of new_colors) expect(Math.abs(hex_to_hsl(color).h - BLUE_HUE)).toBeLessThanOrEqual(HUE_TOLERANCE);
    for (const color of SCARF.colors) {
      expect(hex_to_hsl(recolor_hex(color, BLUE)).l).toBeCloseTo(hex_to_hsl(color).l, 1);
    }
  });

  it('a second fix changes the same thing again', () => {
    const blue = recolor_svg(SCENE, parse_recolor_note('목도리 파랗게')!)!;
    const yellow = recolor_svg(blue, parse_recolor_note('목도리 노랗게')!)!;
    const before = color_counts(SCENE);
    const after = color_counts(yellow);
    const blue_only = [...color_counts(blue).keys()].filter((color) => !before.has(color));
    for (const color of blue_only) expect(after.get(color) ?? 0).toBe(0);
    for (const [color, count] of before) if (!SCARF.colors.includes(color)) expect(after.get(color)).toBe(count);
  });

  it('a thing that is not in the picture changes nothing', () => {
    const no_scarf = '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#123456"/></svg>';
    expect(recolor_svg(no_scarf, parse_recolor_note('목도리 파랗게')!)).toBeNull();
  });
});

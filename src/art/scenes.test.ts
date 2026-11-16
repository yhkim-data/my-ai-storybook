// Checks every scene x style SVG is safe, valid and distinct.
import { describe, expect, it } from 'vitest';
import type { StyleId } from '../types';
import { COVER_SCENE_INDEX, STORY_SCENE_COUNT, render_scene_svg } from './scenes';

const STYLES: StyleId[] = ['watercolor', 'crayon', 'clay', 'papercut', 'pencil', 'pixel'];
/** Max SVG length (approx. bytes). */
const MAX_SVG_LENGTH = 60 * 1024;
/** Scene indices 0-8. */
const SCENES = Array.from({ length: STORY_SCENE_COUNT + 1 }, (_v, i) => i);

describe('render_scene_svg', () => {
  it('cover index is 0 and there are 8 story scenes', () => {
    expect(COVER_SCENE_INDEX).toBe(0);
    expect(STORY_SCENE_COUNT).toBe(8);
  });

  for (const scene of SCENES) {
    for (const style of STYLES) {
      it(`scene ${scene} / ${style}: valid and safe SVG`, () => {
        const svg = render_scene_svg(scene, style);
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg.endsWith('</svg>')).toBe(true);
        expect(svg.length).toBeLessThanOrEqual(MAX_SVG_LENGTH);
        expect(svg).not.toContain('<text');
        expect(svg).not.toContain('<script');
        expect(svg).not.toContain('foreignObject');
        expect(svg).not.toMatch(/href="\s*(https?:|\/\/)/i);
        const without_xmlns = svg.replace('xmlns="http://www.w3.org/2000/svg"', '');
        expect(without_xmlns).not.toContain('http');
        const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
        expect(doc.getElementsByTagName('parsererror').length).toBe(0);
        expect(doc.documentElement.getAttribute('viewBox')).toBe('0 0 1024 1024');
      });
    }
  }

  it('same scene with different styles gives different output', () => {
    for (const scene of SCENES) {
      const set = new Set(STYLES.map((style) => render_scene_svg(scene, style)));
      expect(set.size).toBe(STYLES.length);
    }
  });

  it('same style with different scenes gives different output', () => {
    for (const style of STYLES) {
      const set = new Set(SCENES.map((scene) => render_scene_svg(scene, style)));
      expect(set.size).toBe(SCENES.length);
    }
  });

  it('out-of-range indices wrap into 1-8', () => {
    expect(render_scene_svg(9, 'clay')).toBe(render_scene_svg(1, 'clay'));
    expect(render_scene_svg(-1, 'clay')).toBe(render_scene_svg(7, 'clay'));
    expect(render_scene_svg(16, 'clay')).toBe(render_scene_svg(8, 'clay'));
  });

  it('same input gives the same image', () => {
    expect(render_scene_svg(3, 'pixel')).toBe(render_scene_svg(3, 'pixel'));
  });
});

// 직접 그린 SVG 장면이 모든 장면×그림체 조합에서 안전하고 서로 다른지 확인하는 검사.
import { describe, expect, it } from 'vitest';
import type { StyleId } from '../types';
import { COVER_SCENE_INDEX, STORY_SCENE_COUNT, render_scene_svg } from './scenes';

/** 모든 그림체 */
const STYLES: StyleId[] = ['watercolor', 'crayon', 'clay', 'papercut', 'pencil', 'pixel'];
/** SVG 한 장의 길이 상한(바이트 근사) */
const MAX_SVG_LENGTH = 60 * 1024;
/** 장면 번호 0~8 */
const SCENES = Array.from({ length: STORY_SCENE_COUNT + 1 }, (_v, i) => i);

describe('render_scene_svg', () => {
  it('표지 번호는 0이고 본문 장면은 8개다', () => {
    expect(COVER_SCENE_INDEX).toBe(0);
    expect(STORY_SCENE_COUNT).toBe(8);
  });

  for (const scene of SCENES) {
    for (const style of STYLES) {
      it(`장면 ${scene} / ${style}: 올바르고 안전한 SVG다`, () => {
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

  it('같은 장면이라도 그림체가 다르면 문자열이 다르다', () => {
    for (const scene of SCENES) {
      const set = new Set(STYLES.map((style) => render_scene_svg(scene, style)));
      expect(set.size).toBe(STYLES.length);
    }
  });

  it('같은 그림체라도 장면이 다르면 문자열이 다르다', () => {
    for (const style of STYLES) {
      const set = new Set(SCENES.map((scene) => render_scene_svg(scene, style)));
      expect(set.size).toBe(SCENES.length);
    }
  });

  it('범위를 벗어난 번호는 1~8로 돌려 쓴다', () => {
    expect(render_scene_svg(9, 'clay')).toBe(render_scene_svg(1, 'clay'));
    expect(render_scene_svg(-1, 'clay')).toBe(render_scene_svg(7, 'clay'));
    expect(render_scene_svg(16, 'clay')).toBe(render_scene_svg(8, 'clay'));
  });

  it('같은 입력이면 같은 그림이다', () => {
    expect(render_scene_svg(3, 'pixel')).toBe(render_scene_svg(3, 'pixel'));
  });
});

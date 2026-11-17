// Checks the style treatments: every filter that is used is defined, and each piece is
// lit or shadowed on its own in the clay and paper-cut styles.
import { beforeAll, describe, expect, it } from 'vitest';
import { STYLE_IDS } from '../constants';
import { load_scene_art, render_base_scene_svg } from './scenes';
import { STYLE_TREATMENTS, apply_style } from './styles';

describe('apply_style', () => {
  let base = '';
  beforeAll(async () => {
    await load_scene_art();
    base = render_base_scene_svg(1);
  });

  it('the plain scene marks pieces for the clay and paper-cut styles', () => {
    expect(base).toContain('data-part="1"');
  });

  for (const style_id of STYLE_IDS) {
    it(`${style_id}: every referenced filter is defined`, () => {
      const svg = apply_style(base, style_id);
      const used = [...svg.matchAll(/filter="url\(#([\w-]+)\)"/g)].map((match) => match[1]);
      expect(used.length).toBeGreaterThan(0);
      for (const id of new Set(used)) expect(svg).toContain(`<filter id="${id}"`);
    });
  }

  it('clay and paper cut treat each piece on its own', () => {
    for (const style_id of ['clay', 'papercut'] as const) {
      const svg = apply_style(base, style_id);
      expect(svg).not.toContain('data-part="1"');
      expect(svg).toContain(`filter="url(#${STYLE_TREATMENTS[style_id].part})"`);
    }
  });

  it('an unknown style returns the plain scene', () => {
    expect(apply_style(base, 'custom')).toBe(base);
  });
});

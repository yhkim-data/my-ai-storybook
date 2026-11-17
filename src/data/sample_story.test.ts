import { describe, expect, it } from 'vitest';
import { PAGE_COUNT_MAX, PAGE_COUNT_MIN } from '../constants';
import type { Lang, PageCount } from '../types';
import {
  SAMPLE_HERO,
  find_sample_scene,
  get_sample_pages,
  get_sample_plots,
  plan_sample_scenes,
} from './sample_story';

const LANGS: Lang[] = ['ko', 'en'];
const PAGE_COUNTS: PageCount[] = [4, 6, 8];
const PLOT_IDS = ['sample-1', 'sample-2', 'sample-3'];
const SCENES_BY_COUNT: Record<number, number[]> = {
  4: [1, 3, 5, 8],
  6: [1, 2, 4, 5, 7, 8],
  8: [1, 2, 3, 4, 5, 6, 7, 8],
};
/** Hero names to test with, including blank. */
const NAMES = ['미소', 'Zed', '하늘이', ''];

describe('SAMPLE_HERO', () => {
  it('defines a hero for both languages', () => {
    expect(SAMPLE_HERO.ko.name).toBe('토리');
    expect(SAMPLE_HERO.en.name).toBe('Tori');
    expect(SAMPLE_HERO.ko.look).not.toBe('');
    expect(SAMPLE_HERO.en.look).not.toBe('');
  });
});

describe('get_sample_plots', () => {
  for (const lang of LANGS) {
    it(`${lang}: three plots with ids`, () => {
      const plots = get_sample_plots(lang, '');
      expect(plots.map((p) => p.id)).toEqual(PLOT_IDS);
      for (const plot of plots) {
        expect(plot.title.trim()).not.toBe('');
        expect(plot.summary.trim()).not.toBe('');
        expect(plot.title).toContain(SAMPLE_HERO[lang].name);
        expect(plot.title).not.toContain('{');
        expect(plot.summary).not.toContain('{');
      }
      expect(new Set(plots.map((p) => p.title)).size).toBe(3);
    });

    it(`${lang}: hero_name appears in title and summary`, () => {
      const plots = get_sample_plots(lang, '미소');
      for (const plot of plots) {
        expect(plot.title).toContain('미소');
        expect(plot.summary).toContain('미소');
        expect(plot.summary).not.toContain(SAMPLE_HERO[lang].name);
      }
    });
  }

  it('Korean names get the particle matching the final consonant', () => {
    expect(get_sample_plots('ko', '토리')[0]?.title).toBe('토리와 떨어진 별');
    expect(get_sample_plots('ko', '별')[0]?.title).toBe('별과 떨어진 별');
  });
});

describe('get_sample_pages', () => {
  for (const lang of LANGS) {
    for (const count of PAGE_COUNTS) {
      it(`${lang}: ${count} pages gives exactly ${count} non-empty drafts`, () => {
        for (const plot_id of PLOT_IDS) {
          const pages = get_sample_pages(plot_id, lang, '미소', count);
          expect(pages).toHaveLength(count);
          for (const page of pages) {
            expect(page.text.trim()).not.toBe('');
            expect(page.image_prompt.trim()).not.toBe('');
            expect(page.text).not.toContain('{');
            expect(page.image_prompt).not.toContain('{');
          }
        }
      });
    }

    it(`${lang}: each plot has different text`, () => {
      const texts = PLOT_IDS.map((id) =>
        get_sample_pages(id, lang, '미소', 8)
          .map((p) => p.text)
          .join('|'),
      );
      expect(new Set(texts).size).toBe(3);
    });
  }

  it('unknown plot_id falls back to sample-1', () => {
    expect(get_sample_pages('nope', 'ko', '미소', 6)).toEqual(
      get_sample_pages('sample-1', 'ko', '미소', 6),
    );
  });

  it('blank name uses the sample hero name', () => {
    const pages = get_sample_pages('sample-1', 'en', '', 4);
    expect(pages.some((p) => p.text.includes('Tori'))).toBe(true);
  });
});

describe('find_sample_scene', () => {
  for (const lang of LANGS) {
    for (const count of PAGE_COUNTS) {
      it(`${lang}: ${count}-page image prompts map to the right scenes (any name)`, () => {
        for (const name of NAMES) {
          for (const plot_id of PLOT_IDS) {
            const pages = get_sample_pages(plot_id, lang, name, count);
            const found = pages.map((p) => find_sample_scene(p.image_prompt));
            expect(found).toEqual(SCENES_BY_COUNT[count]);
          }
        }
      });
    }
  }

  it('scene image prompts are all distinct', () => {
    const prompts = get_sample_pages('sample-1', 'ko', '토리', 8).map((p) => p.image_prompt);
    expect(new Set(prompts).size).toBe(8);
  });

  it('returns null for unrelated text', () => {
    expect(find_sample_scene('')).toBeNull();
    expect(find_sample_scene('우주선을 타고 달에 가는 아이')).toBeNull();
    expect(find_sample_scene('a dragon eating pizza')).toBeNull();
  });
});

describe('plan_sample_scenes (any page count)', () => {
  const FIRST = 1;
  const LAST = 8;
  for (let count = PAGE_COUNT_MIN; count <= PAGE_COUNT_MAX; count += 1) {
    it(`${count} pages: starts at scene 1, ends at scene 8, scenes never go backwards`, () => {
      const plan = plan_sample_scenes(count);
      expect(plan).toHaveLength(count);
      expect(plan[0]).toEqual({ scene: FIRST, is_bridge: false });
      expect(plan[count - 1]).toEqual({ scene: LAST, is_bridge: false });
      for (let index = 1; index < plan.length; index += 1) {
        expect(plan[index]!.scene).toBeGreaterThanOrEqual(plan[index - 1]!.scene);
      }
    });
  }

  it('up to 8 pages: distinct scenes and no linking pages', () => {
    for (let count = PAGE_COUNT_MIN; count <= LAST; count += 1) {
      const plan = plan_sample_scenes(count);
      expect(new Set(plan.map((item) => item.scene)).size).toBe(count);
      expect(plan.some((item) => item.is_bridge)).toBe(false);
    }
  });

  it('more than 8 pages: every scene 1-8 once in order, extra pages repeat middle scenes only', () => {
    for (let count = LAST + 1; count <= PAGE_COUNT_MAX; count += 1) {
      const plan = plan_sample_scenes(count);
      expect(plan.filter((item) => !item.is_bridge).map((item) => item.scene)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      const bridges = plan.filter((item) => item.is_bridge).map((item) => item.scene);
      expect(bridges).toHaveLength(count - LAST);
      for (const scene of bridges) expect(scene === FIRST || scene === LAST).toBe(false);
    }
  });

  it('12 pages: linking pages use short linking text in both languages, and pictures follow the scene', () => {
    for (const lang of LANGS) {
      const pages = get_sample_pages('sample-1', lang, '토리', 12);
      const plan = plan_sample_scenes(12);
      expect(pages).toHaveLength(12);
      pages.forEach((page, index) => {
        expect(page.text.trim().length).toBeGreaterThan(0);
        expect(find_sample_scene(page.image_prompt)).toBe(plan[index]!.scene);
      });
      const bridge_texts = pages.filter((_, index) => plan[index]!.is_bridge).map((page) => page.text);
      expect(new Set(bridge_texts).size).toBe(bridge_texts.length);
    }
  });
});

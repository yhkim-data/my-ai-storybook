import { describe, expect, it } from 'vitest';
import type { Lang, PageCount } from '../types';
import {
  SAMPLE_HERO,
  find_sample_scene,
  get_sample_pages,
  get_sample_plots,
} from './sample_story';

const LANGS: Lang[] = ['ko', 'en'];
const PAGE_COUNTS: PageCount[] = [4, 6, 8];
const PLOT_IDS = ['sample-1', 'sample-2', 'sample-3'];
const SCENES_BY_COUNT: Record<PageCount, number[]> = {
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

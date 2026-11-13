// 예시 이야기(줄거리, 쪽 글, 그림 설명 찾기)가 약속한 모양과 개수를 지키는지 확인하는 검사.
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
/** 이름을 바꿔 시험할 값들 */
const NAMES = ['미소', 'Zed', '하늘이', ''];

describe('SAMPLE_HERO', () => {
  it('두 언어의 주인공이 정해져 있다', () => {
    expect(SAMPLE_HERO.ko.name).toBe('토리');
    expect(SAMPLE_HERO.en.name).toBe('Tori');
    expect(SAMPLE_HERO.ko.look).not.toBe('');
    expect(SAMPLE_HERO.en.look).not.toBe('');
  });
});

describe('get_sample_plots', () => {
  for (const lang of LANGS) {
    it(`${lang}: 줄거리 3개와 id`, () => {
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

    it(`${lang}: hero_name이 제목과 줄거리에 들어간다`, () => {
      const plots = get_sample_plots(lang, '미소');
      for (const plot of plots) {
        expect(plot.title).toContain('미소');
        expect(plot.summary).toContain('미소');
        expect(plot.summary).not.toContain(SAMPLE_HERO[lang].name);
      }
    });
  }

  it('한글 이름은 받침에 맞는 조사를 쓴다', () => {
    expect(get_sample_plots('ko', '토리')[0]?.title).toBe('토리와 떨어진 별');
    expect(get_sample_plots('ko', '별')[0]?.title).toBe('별과 떨어진 별');
  });
});

describe('get_sample_pages', () => {
  for (const lang of LANGS) {
    for (const count of PAGE_COUNTS) {
      it(`${lang}: ${count}쪽은 정확히 ${count}개이고 비어 있지 않다`, () => {
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

    it(`${lang}: 줄거리마다 글이 다르다`, () => {
      const texts = PLOT_IDS.map((id) =>
        get_sample_pages(id, lang, '미소', 8)
          .map((p) => p.text)
          .join('|'),
      );
      expect(new Set(texts).size).toBe(3);
    });
  }

  it('모르는 plot_id면 sample-1의 것을 쓴다', () => {
    expect(get_sample_pages('nope', 'ko', '미소', 6)).toEqual(
      get_sample_pages('sample-1', 'ko', '미소', 6),
    );
  });

  it('빈 이름이면 예시 주인공 이름을 쓴다', () => {
    const pages = get_sample_pages('sample-1', 'en', '', 4);
    expect(pages.some((p) => p.text.includes('Tori'))).toBe(true);
  });
});

describe('find_sample_scene', () => {
  for (const lang of LANGS) {
    for (const count of PAGE_COUNTS) {
      it(`${lang}: ${count}쪽의 그림 설명은 맞는 장면 번호를 돌려준다 (이름이 달라도)`, () => {
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

  it('장면 그림 설명이 서로 다르다', () => {
    const prompts = get_sample_pages('sample-1', 'ko', '토리', 8).map((p) => p.image_prompt);
    expect(new Set(prompts).size).toBe(8);
  });

  it('엉뚱한 글에는 null이다', () => {
    expect(find_sample_scene('')).toBeNull();
    expect(find_sample_scene('우주선을 타고 달에 가는 아이')).toBeNull();
    expect(find_sample_scene('a dragon eating pizza')).toBeNull();
  });
});

// Prompt tests: safety rules, hero card, style phrases, seed values, response parsing.
import { describe, expect, it } from 'vitest';
import { STYLE_IDS } from '../constants';
import type { Lang, StorySeed } from '../types';
import {
  build_hero_card,
  build_image_prompt,
  build_pages_prompt,
  build_pages_schema,
  build_plots_prompt,
  parse_pages,
  parse_plots,
  text_system_instruction,
} from './prompts';

const LANGS: Lang[] = ['ko', 'en'];
const SEED: StorySeed = { age_band: '8-10', topic: '우정과 모험', hero_name: '보리', hero_look: '노란 모자를 쓴 작은 곰', page_count: 6 };
/** Artist and company names that must never appear in a style phrase. */
const FORBIDDEN_NAMES = /disney|pixar|ghibli|dreamworks|nintendo|google|openai|midjourney|marvel|sanrio|디즈니|픽사|지브리|닌텐도|구글|마블|산리오/i;

describe('text_system_instruction', () => {
  it('Korean covers children, no violence, and no real people', () => {
    const text = text_system_instruction('ko');
    expect(text).toContain('어린이');
    expect(text).toContain('폭력');
    expect(text).toContain('실제 인물');
  });

  it('English covers the same rules', () => {
    const text = text_system_instruction('en');
    expect(text).toMatch(/children/i);
    expect(text).toMatch(/violence/i);
    expect(text).toMatch(/real people/i);
  });
});

describe('build_hero_card', () => {
  it('is empty when both name and look are empty', () => {
    for (const lang of LANGS) {
      expect(build_hero_card({ ...SEED, hero_name: '', hero_look: '' }, lang)).toBe('');
      expect(build_hero_card({ ...SEED, hero_name: '  ', hero_look: ' ' }, lang)).toBe('');
    }
  });

  it('includes the name and look', () => {
    for (const lang of LANGS) {
      const card = build_hero_card(SEED, lang);
      expect(card).toContain('보리');
      expect(card).toContain('노란 모자를 쓴 작은 곰');
    }
  });
});

describe('build_image_prompt', () => {
  it('includes hero card, description, style phrase, and safety rules (ko/en)', () => {
    for (const lang of LANGS) {
      const card = build_hero_card(SEED, lang);
      const prompt = build_image_prompt('숲속 길을 걷는 장면', 'clay', card, lang);
      const style_and_safety = build_image_prompt('', 'clay', '', lang);
      expect(prompt).toContain(card);
      expect(prompt).toContain('숲속 길을 걷는 장면');
      expect(prompt).toContain(style_and_safety);
      expect(prompt.indexOf(card)).toBeLessThan(prompt.indexOf('숲속 길을 걷는 장면'));
    }
    expect(build_image_prompt('x', 'clay', '', 'ko')).toContain('실제 인물');
    expect(build_image_prompt('x', 'clay', '', 'en')).toMatch(/real people/i);
  });

  it('all 6x2 style phrases are distinct, non-empty, and free of artist or company names', () => {
    const phrases = new Set<string>();
    for (const lang of LANGS) {
      for (const style_id of STYLE_IDS) {
        const prompt = build_image_prompt('', style_id, '', lang);
        const [style_line = ''] = prompt.split('\n');
        expect(style_line.length).toBeGreaterThan(0);
        expect(FORBIDDEN_NAMES.test(prompt)).toBe(false);
        phrases.add(style_line);
      }
    }
    expect(phrases.size).toBe(STYLE_IDS.length * LANGS.length);
  });
});

describe('plot and page split prompts', () => {
  it('include the seed values', () => {
    for (const lang of LANGS) {
      const plots_prompt = build_plots_prompt(SEED, lang);
      const pages_prompt = build_pages_prompt({ id: 'p', title: '곰의 하루', summary: '곰이 걷는다' }, SEED, lang);
      for (const prompt of [plots_prompt, pages_prompt]) {
        expect(prompt).toContain('우정과 모험');
        expect(prompt).toContain('보리');
        expect(prompt).toContain('노란 모자를 쓴 작은 곰');
        expect(prompt).toContain('6');
      }
      expect(pages_prompt).toContain('곰의 하루');
      expect(pages_prompt).toContain('곰이 걷는다');
    }
  });
});

describe('parse_plots', () => {
  it('parses a valid response into 3 plots', () => {
    const raw = JSON.stringify({ plots: [1, 2, 3].map((n) => ({ title: `제목${n}`, summary: `요약${n}` })) });
    const plots = parse_plots(raw);
    expect(plots).toHaveLength(3);
    expect(plots?.[1]).toEqual({ id: 'plot-2', title: '제목2', summary: '요약2' });
  });

  it('returns null for broken JSON, an empty array, or missing fields', () => {
    expect(parse_plots('{plots:')).toBeNull();
    expect(parse_plots('{"plots":[]}')).toBeNull();
    expect(parse_plots('{"other":1}')).toBeNull();
    expect(parse_plots('{"plots":[{"title":"a"}]}')).toBeNull();
    expect(parse_plots('{"plots":[{"title":"a","summary":3}]}')).toBeNull();
  });
});

describe('parse_pages', () => {
  const make_raw = (count: number) =>
    JSON.stringify({ pages: Array.from({ length: count }, (_, n) => ({ text: `글${n}`, image_prompt: `그림${n}` })) });

  it('returns drafts when the page count matches', () => {
    const drafts = parse_pages(make_raw(4), 4);
    expect(drafts).toHaveLength(4);
    expect(drafts?.[2]).toEqual({ text: '글2', image_prompt: '그림2' });
  });

  it('returns null for a wrong page count or broken input', () => {
    expect(parse_pages(make_raw(3), 4)).toBeNull();
    expect(parse_pages(make_raw(5), 4)).toBeNull();
    expect(parse_pages('oops', 4)).toBeNull();
    expect(parse_pages('{"pages":[{"text":"a"}]}', 1)).toBeNull();
  });
});

describe('custom page counts', () => {
  const make_raw = (count: number) =>
    JSON.stringify({ pages: Array.from({ length: count }, (_, n) => ({ text: `글${n}`, image_prompt: `그림${n}` })) });

  for (const count of [2, 5, 12, 20]) {
    it(`${count} pages: the prompt asks for exactly ${count}, the schema fixes the length, and parsing checks it`, () => {
      const seed = { ...SEED, page_count: count };
      expect(build_pages_prompt({ id: 'p', title: '곰', summary: '곰이 걷는다' }, seed, 'ko')).toContain(`정확히 ${count}쪽`);
      expect(build_pages_prompt({ id: 'p', title: 'Bear', summary: 'A bear walks' }, seed, 'en')).toContain(`exactly ${count} pages`);
      const schema = build_pages_schema(count) as { properties: { pages: { minItems: number; maxItems: number } } };
      expect(schema.properties.pages.minItems).toBe(count);
      expect(schema.properties.pages.maxItems).toBe(count);
      expect(parse_pages(make_raw(count), count)).toHaveLength(count);
      expect(parse_pages(make_raw(count - 1), count)).toBeNull();
    });
  }
});

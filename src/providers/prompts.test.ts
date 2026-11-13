// 지시문 검사: 안전 규칙, 주인공 카드, 그림체 문장, 응답 읽기, 씨앗 값 들어감.
import { describe, expect, it } from 'vitest';
import { STYLE_IDS } from '../constants';
import type { Lang, StorySeed } from '../types';
import {
  build_hero_card,
  build_image_prompt,
  build_pages_prompt,
  build_plots_prompt,
  parse_pages,
  parse_plots,
  text_system_instruction,
} from './prompts';

const LANGS: Lang[] = ['ko', 'en'];
const SEED: StorySeed = { age_band: '8-10', topic: '우정과 모험', hero_name: '보리', hero_look: '노란 모자를 쓴 작은 곰', page_count: 6 };
/** 그림체 문장에 있으면 안 되는 작가·회사 이름 */
const FORBIDDEN_NAMES = /disney|pixar|ghibli|dreamworks|nintendo|google|openai|midjourney|marvel|sanrio|디즈니|픽사|지브리|닌텐도|구글|마블|산리오/i;

describe('text_system_instruction', () => {
  it('한국어에 어린이·폭력 금지·실제 인물 금지 취지가 있다', () => {
    const text = text_system_instruction('ko');
    expect(text).toContain('어린이');
    expect(text).toContain('폭력');
    expect(text).toContain('실제 인물');
  });

  it('영어에도 같은 취지가 있다', () => {
    const text = text_system_instruction('en');
    expect(text).toMatch(/children/i);
    expect(text).toMatch(/violence/i);
    expect(text).toMatch(/real people/i);
  });
});

describe('build_hero_card', () => {
  it('이름과 모습이 모두 없으면 빈 글이다', () => {
    for (const lang of LANGS) {
      expect(build_hero_card({ ...SEED, hero_name: '', hero_look: '' }, lang)).toBe('');
      expect(build_hero_card({ ...SEED, hero_name: '  ', hero_look: ' ' }, lang)).toBe('');
    }
  });

  it('이름과 모습이 들어간다', () => {
    for (const lang of LANGS) {
      const card = build_hero_card(SEED, lang);
      expect(card).toContain('보리');
      expect(card).toContain('노란 모자를 쓴 작은 곰');
    }
  });
});

describe('build_image_prompt', () => {
  it('주인공 카드, 설명, 그림체 문장, 안전 규칙이 모두 들어간다 (ko/en)', () => {
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

  it('그림체 문장 6×2개가 모두 다르고 비어 있지 않으며 작가·회사 이름이 없다', () => {
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

describe('줄거리·쪽 나누기 지시문', () => {
  it('씨앗 값이 들어간다', () => {
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
  it('정상 응답은 줄거리 3개다', () => {
    const raw = JSON.stringify({ plots: [1, 2, 3].map((n) => ({ title: `제목${n}`, summary: `요약${n}` })) });
    const plots = parse_plots(raw);
    expect(plots).toHaveLength(3);
    expect(plots?.[1]).toEqual({ id: 'plot-2', title: '제목2', summary: '요약2' });
  });

  it('깨진 JSON, 빈 배열, 필드 빠짐은 null이다', () => {
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

  it('쪽수가 맞으면 초안 목록이다', () => {
    const drafts = parse_pages(make_raw(4), 4);
    expect(drafts).toHaveLength(4);
    expect(drafts?.[2]).toEqual({ text: '글2', image_prompt: '그림2' });
  });

  it('쪽수가 다르거나 깨졌으면 null이다', () => {
    expect(parse_pages(make_raw(3), 4)).toBeNull();
    expect(parse_pages(make_raw(5), 4)).toBeNull();
    expect(parse_pages('oops', 4)).toBeNull();
    expect(parse_pages('{"pages":[{"text":"a"}]}', 1)).toBeNull();
  });
});

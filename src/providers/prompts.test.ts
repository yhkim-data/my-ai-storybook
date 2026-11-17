// Prompt tests: safety rules, hero card, style phrases, seed values, response parsing.
import { describe, expect, it } from 'vitest';
import { STYLE_IDS } from '../constants';
import type { Lang, StorySeed } from '../types';
import type { AssistKind, AssistRequest } from './types';
import {
  build_assist_prompt,
  build_assist_schema,
  build_hero_card,
  build_image_prompt,
  build_pages_prompt,
  build_pages_schema,
  build_plots_prompt,
  parse_assist,
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

describe('my own style in the image prompt', () => {
  it('uses the words the user wrote, followed by the same safety sentence', () => {
    const ko_prompt = build_image_prompt('숲길', 'custom', '', 'ko', '파스텔 색 크레파스 느낌');
    expect(ko_prompt).toContain('그림체: 파스텔 색 크레파스 느낌');
    expect(ko_prompt).toContain('실제 인물');
    const en_prompt = build_image_prompt('a forest path', 'custom', '', 'en', 'pastel crayon look');
    expect(en_prompt).toContain('Art style: pastel crayon look');
    expect(en_prompt.indexOf('Art style: pastel crayon look')).toBeLessThan(en_prompt.indexOf('No text or letters'));
    expect(en_prompt).toMatch(/real people/i);
  });

  it('an empty description adds no style line, and the fixed style phrases are not used', () => {
    const prompt = build_image_prompt('숲길', 'custom', '', 'ko', '   ');
    expect(prompt).not.toContain('그림체:');
    expect(prompt).toContain('실제 인물');
  });
});

describe('build_assist_prompt', () => {
  const PLOT = { id: 'p', title: '곰의 하루', summary: '곰이 숲에서 친구를 만난다.' };
  const KINDS: AssistKind[] = ['hero_name', 'hero_look', 'topic', 'plot', 'page_text', 'page_image'];
  const request = (kind: AssistKind, lang: Lang, current = '', extra: Partial<AssistRequest> = {}): AssistRequest => ({
    kind,
    lang,
    seed: SEED,
    current,
    plot: PLOT,
    page_number: 2,
    previous_text: '앞 쪽 이야기',
    next_text: '뒤 쪽 이야기',
    page_text: '곰이 강을 건넌다.',
    ...extra,
  });

  it('every kind asks for a draft when the box is empty and polishes the words when it is not', () => {
    for (const lang of LANGS) {
      for (const kind of KINDS) {
        const draft = build_assist_prompt(request(kind, lang));
        expect(draft).toMatch(lang === 'ko' ? /새로 써 줘/ : /first draft/);
        const polish = build_assist_prompt(request(kind, lang, '학생이 쓴 문장'));
        expect(polish).toContain('학생이 쓴 문장');
        expect(polish).toMatch(lang === 'ko' ? /뜻은 바꾸지 않는다/ : /Do not change the meaning/);
        // The book seed always goes along, nothing else from the app.
        expect(polish).toContain('보리');
      }
    }
  });

  it('states the length for each box', () => {
    expect(build_assist_prompt(request('topic', 'ko'))).toContain('30자 안팎');
    expect(build_assist_prompt(request('hero_look', 'ko'))).toContain('한 문장');
    const plot = build_assist_prompt(request('plot', 'ko'));
    expect(plot).toContain('20자 안팎');
    expect(plot).toContain('2~3문장');
    expect(build_assist_prompt(request('page_image', 'en'))).toMatch(/one or two sentences/);
    // Page words follow the reader age.
    expect(build_assist_prompt(request('page_text', 'ko', '', { seed: { ...SEED, age_band: '5-7' } }))).toContain('아주 쉬운 1문장');
    expect(build_assist_prompt(request('page_text', 'ko', '', { seed: { ...SEED, age_band: '11-13' } }))).toContain('2~3문장');
  });

  it('page words get the plot and the pages before and after; picture notes get the page words and the hero card', () => {
    const text_prompt = build_assist_prompt(request('page_text', 'ko'));
    expect(text_prompt).toContain('곰이 숲에서 친구를 만난다.');
    expect(text_prompt).toContain('앞 쪽 이야기');
    expect(text_prompt).toContain('뒤 쪽 이야기');
    expect(text_prompt).toContain('2쪽');
    const image_prompt = build_assist_prompt(request('page_image', 'ko'));
    expect(image_prompt).toContain('곰이 강을 건넌다.');
    expect(image_prompt).toContain(build_hero_card(SEED, 'ko'));
    expect(image_prompt).toContain('그림 안에 글자를 넣으라는 말은 쓰지 않는다');
    expect(build_assist_prompt(request('page_image', 'en'))).toMatch(/Never ask for words or letters inside the picture/);
  });

  it('the plot box sends both the title and the summary the student wrote', () => {
    const prompt = build_assist_prompt(request('plot', 'ko', '곰이 걷는다', { current_title: '곰 이야기' }));
    expect(prompt).toContain('곰 이야기');
    expect(prompt).toContain('곰이 걷는다');
  });
});

describe('assist answers', () => {
  it('plot answers have a title and a summary; other answers have one text', () => {
    expect(JSON.stringify(build_assist_schema('plot'))).toContain('summary');
    expect(JSON.stringify(build_assist_schema('hero_name'))).toContain('"text"');
    expect(parse_assist('{"title":" 곰 ","summary":"걷는다"}', 'plot')).toEqual({ title: '곰', summary: '걷는다' });
    expect(parse_assist('{"text":" 보리 "}', 'hero_name')).toEqual({ text: '보리' });
  });

  it('broken or empty answers are null, so the provider retries once', () => {
    expect(parse_assist('oops', 'topic')).toBeNull();
    expect(parse_assist('{"text":"  "}', 'topic')).toBeNull();
    expect(parse_assist('{"title":"a"}', 'plot')).toBeNull();
  });
});

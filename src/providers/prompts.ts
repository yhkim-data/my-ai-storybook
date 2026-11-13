// AI에 보내는 지시문을 만드는 곳. 어린이 안전 규칙을 모든 지시문에 고정한다.
import type { AgeBand, Lang, PageDraft, Plot, StorySeed, StyleId } from '../types';

/** 제안받는 줄거리 수 */
export const PLOT_SUGGESTION_COUNT = 3;

/** 모든 글 지시문에 붙는 어린이 안전 규칙 */
const TEXT_SAFETY_RULES: Record<Lang, string> = {
  ko: [
    '너는 어린이용 그림책 작가다.',
    '폭력, 공포, 선정적인 내용을 쓰지 않는다.',
    '실제 인물, 기존 작품의 캐릭터, 상표를 쓰지 않는다.',
    '따뜻하고 쉬운 말로 쓴다. 한국어로 쓴다.',
  ].join(' '),
  en: [
    "You are a writer of children's picture books.",
    'Never include violence, horror, or sexual content.',
    'Never use real people, existing characters, or trademarks.',
    'Use warm, simple words. Write in English.',
  ].join(' '),
};

/** 모든 그림 설명 끝에 붙는 어린이 안전 규칙 */
const IMAGE_SAFETY_RULES: Record<Lang, string> = {
  ko: '어린이 그림책에 들어갈 정사각형 그림. 그림 안에 글자를 넣지 않는다. 무섭거나 폭력적이거나 선정적인 것은 그리지 않는다. 실제 인물, 기존 캐릭터, 상표는 그리지 않는다.',
  en: "A square illustration for a children's picture book. No text or letters in the picture. Nothing scary, violent, or sexual. No real people, existing characters, or trademarks.",
};

/** 그림체를 설명하는 문장. 작가나 회사 이름 없이 기법 이름만 쓴다. */
const STYLE_PHRASES: Record<StyleId, Record<Lang, string>> = {
  watercolor: {
    ko: '그림체: 물이 번진 부드러운 수채화, 연한 색',
    en: 'Art style: soft watercolor with gentle washes and light colors',
  },
  crayon: {
    ko: '그림체: 거친 선이 살아 있는 크레용 그림, 밝은 색',
    en: 'Art style: crayon drawing with rough, waxy strokes and bright colors',
  },
  clay: {
    ko: '그림체: 점토로 빚은 인형을 찍은 듯한 입체 그림',
    en: 'Art style: figures shaped from modeling clay, photographed like a small set',
  },
  papercut: {
    ko: '그림체: 색종이를 오려 붙인 그림, 겹친 종이의 그림자',
    en: 'Art style: cut paper collage with layered colored paper and soft shadows',
  },
  pencil: {
    ko: '그림체: 연필로 그린 스케치, 흑백에 가까운 부드러운 선',
    en: 'Art style: pencil sketch with soft graphite lines, nearly black and white',
  },
  pixel: {
    ko: '그림체: 네모난 점으로 찍은 도트 그림, 또렷한 색',
    en: 'Art style: pixel art made of small square dots with clear colors',
  },
};

/** 나이대를 설명하는 말 */
const AGE_PHRASES: Record<AgeBand, Record<Lang, string>> = {
  '5-7': { ko: '5~7살 (아주 짧고 쉬운 문장)', en: 'ages 5-7 (very short, simple sentences)' },
  '8-10': { ko: '8~10살 (쉬운 문장)', en: 'ages 8-10 (simple sentences)' },
  '11-13': { ko: '11~13살 (조금 긴 문장도 괜찮음)', en: 'ages 11-13 (slightly longer sentences are fine)' },
};

/**
 * 글 지시문에 고정하는 규칙을 돌려준다.
 */
export function text_system_instruction(lang: Lang): string {
  return TEXT_SAFETY_RULES[lang];
}

/**
 * 주인공 카드를 만든다. 모든 그림 설명 앞에 붙여 모습을 같게 유지한다.
 */
export function build_hero_card(seed: StorySeed, lang: Lang): string {
  const name = seed.hero_name.trim();
  const look = seed.hero_look.trim();
  if (!name && !look) return '';
  if (lang === 'ko') {
    return look
      ? `주인공 "${name}": ${look}. 모든 그림에서 같은 모습으로 그린다.`
      : `주인공 "${name}". 모든 그림에서 같은 모습으로 그린다.`;
  }
  return look
    ? `Main character "${name}": ${look}. Draw the character the same way in every picture.`
    : `Main character "${name}". Draw the character the same way in every picture.`;
}

/**
 * 완성된 그림 설명을 만든다. AI에 보낼 때와 "그림 설명 복사"에서 똑같이 쓴다.
 */
export function build_image_prompt(description: string, style_id: StyleId, hero_card: string, lang: Lang): string {
  return [hero_card, description.trim(), STYLE_PHRASES[style_id][lang], IMAGE_SAFETY_RULES[lang]]
    .filter((part) => part.length > 0)
    .join('\n');
}

/**
 * 표지 그림 설명을 만든다. AI를 부르지 않고 제목과 줄거리로 만든다.
 */
export function build_cover_description(title: string, summary: string, lang: Lang): string {
  const base = lang === 'ko' ? `책 표지 그림. 제목: ${title}.` : `Book cover picture. Title: ${title}.`;
  return summary.trim() ? `${base} ${summary.trim()}` : base;
}

/**
 * 이야기 씨앗을 지시문에 넣을 글로 바꾼다.
 */
function describe_seed(seed: StorySeed, lang: Lang): string {
  if (lang === 'ko') {
    return [
      `읽을 사람: ${AGE_PHRASES[seed.age_band].ko}`,
      `주제: ${seed.topic}`,
      `주인공 이름: ${seed.hero_name}`,
      `주인공 모습: ${seed.hero_look || '정해지지 않음'}`,
      `본문 쪽수: ${seed.page_count}쪽`,
    ].join('\n');
  }
  return [
    `Readers: ${AGE_PHRASES[seed.age_band].en}`,
    `Topic: ${seed.topic}`,
    `Main character's name: ${seed.hero_name}`,
    `Main character's look: ${seed.hero_look || 'not decided'}`,
    `Story pages: ${seed.page_count}`,
  ].join('\n');
}

/**
 * 줄거리 3개를 제안해 달라는 지시문.
 */
export function build_plots_prompt(seed: StorySeed, lang: Lang): string {
  const ask =
    lang === 'ko'
      ? `아래 조건으로 그림책 줄거리를 서로 다르게 ${PLOT_SUGGESTION_COUNT}개 제안해 줘. 각각 제목(title)과 두세 문장 줄거리(summary)를 쓴다.`
      : `Suggest ${PLOT_SUGGESTION_COUNT} different picture book plots for the conditions below. Give each a title and a two or three sentence summary.`;
  return `${ask}\n\n${describe_seed(seed, lang)}`;
}

/**
 * 고른 줄거리를 쪽별 글과 그림 설명으로 나눠 달라는 지시문.
 */
export function build_pages_prompt(plot: Plot, seed: StorySeed, lang: Lang): string {
  const ask =
    lang === 'ko'
      ? `아래 줄거리를 정확히 ${seed.page_count}쪽으로 나눠 줘. 쪽마다 책에 들어갈 글(text, 한두 문장)과 그 쪽의 그림 설명(image_prompt, 장면과 배경과 주인공이 하는 일을 한 문장으로)을 쓴다.`
      : `Split the plot below into exactly ${seed.page_count} pages. For each page write the words for the book (text, one or two sentences) and a picture note (image_prompt, one sentence about the scene, the place, and what the main character is doing).`;
  const plot_part = lang === 'ko' ? `제목: ${plot.title}\n줄거리: ${plot.summary}` : `Title: ${plot.title}\nPlot: ${plot.summary}`;
  return `${ask}\n\n${plot_part}\n\n${describe_seed(seed, lang)}`;
}

/** 줄거리 응답의 JSON 모양 */
export const PLOTS_SCHEMA = {
  type: 'object',
  properties: {
    plots: {
      type: 'array',
      minItems: PLOT_SUGGESTION_COUNT,
      maxItems: PLOT_SUGGESTION_COUNT,
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, summary: { type: 'string' } },
        required: ['title', 'summary'],
      },
    },
  },
  required: ['plots'],
};

/**
 * 쪽 나누기 응답의 JSON 모양을 쪽수에 맞춰 만든다.
 */
export function build_pages_schema(page_count: number): object {
  return {
    type: 'object',
    properties: {
      pages: {
        type: 'array',
        minItems: page_count,
        maxItems: page_count,
        items: {
          type: 'object',
          properties: { text: { type: 'string' }, image_prompt: { type: 'string' } },
          required: ['text', 'image_prompt'],
        },
      },
    },
    required: ['pages'],
  };
}

/**
 * 값이 문자열 필드를 가진 객체인지 본다.
 */
function has_string_fields(value: unknown, fields: string[]): value is Record<string, string> {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return fields.every((field) => typeof record[field] === 'string');
}

/**
 * 줄거리 응답 글을 읽는다. 형식이 어긋나면 null을 돌려준다.
 */
export function parse_plots(raw: string): Plot[] | null {
  try {
    const data = JSON.parse(raw) as { plots?: unknown };
    if (!Array.isArray(data.plots) || data.plots.length === 0) return null;
    const plots: Plot[] = [];
    for (const [index, item] of data.plots.entries()) {
      if (!has_string_fields(item, ['title', 'summary'])) return null;
      plots.push({ id: `plot-${index + 1}`, title: item.title ?? '', summary: item.summary ?? '' });
    }
    return plots.slice(0, PLOT_SUGGESTION_COUNT);
  } catch {
    return null;
  }
}

/**
 * 쪽 나누기 응답 글을 읽는다. 쪽수가 다르거나 형식이 어긋나면 null을 돌려준다.
 */
export function parse_pages(raw: string, page_count: number): PageDraft[] | null {
  try {
    const data = JSON.parse(raw) as { pages?: unknown };
    if (!Array.isArray(data.pages) || data.pages.length !== page_count) return null;
    const drafts: PageDraft[] = [];
    for (const item of data.pages) {
      if (!has_string_fields(item, ['text', 'image_prompt'])) return null;
      drafts.push({ text: item.text ?? '', image_prompt: item.image_prompt ?? '' });
    }
    return drafts;
  } catch {
    return null;
  }
}

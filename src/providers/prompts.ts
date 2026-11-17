// Builds the prompts sent to the AI. Every prompt carries the child-safety rules.
import type { AgeBand, ArtStyle, Lang, PageDraft, Plot, StorySeed, StyleId } from '../types';
import type { AssistKind, AssistRequest, AssistResult } from './types';

export const PLOT_SUGGESTION_COUNT = 3;

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

/** Appended to the end of every image prompt. */
const IMAGE_SAFETY_RULES: Record<Lang, string> = {
  ko: '어린이 그림책에 들어갈 정사각형 그림. 그림 안에 글자를 넣지 않는다. 무섭거나 폭력적이거나 선정적인 것은 그리지 않는다. 실제 인물, 기존 캐릭터, 상표는 그리지 않는다.',
  en: "A square illustration for a children's picture book. No text or letters in the picture. Nothing scary, violent, or sexual. No real people, existing characters, or trademarks.",
};

/** Name only the technique, never an artist or a company. */
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

const AGE_PHRASES: Record<AgeBand, Record<Lang, string>> = {
  '5-7': { ko: '5~7살 (아주 짧고 쉬운 문장)', en: 'ages 5-7 (very short, simple sentences)' },
  '8-10': { ko: '8~10살 (쉬운 문장)', en: 'ages 8-10 (simple sentences)' },
  '11-13': { ko: '11~13살 (조금 긴 문장도 괜찮음)', en: 'ages 11-13 (slightly longer sentences are fine)' },
};

/** System instruction (child-safety rules) for every text request. */
export function text_system_instruction(lang: Lang): string {
  return TEXT_SAFETY_RULES[lang];
}

/**
 * Builds the hero card. It goes before every image prompt so the hero looks the same on every page.
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

/** Label in front of the user's own style description. */
const CUSTOM_STYLE_LABEL: Record<Lang, string> = { ko: '그림체:', en: 'Art style:' };

/** The style sentence: a fixed phrase for the six styles, the user's words for 'custom' (nothing if empty). */
export function build_style_phrase(style_id: ArtStyle, custom_style: string, lang: Lang): string {
  if (style_id !== 'custom') return STYLE_PHRASES[style_id][lang];
  const words = custom_style.trim();
  return words ? `${CUSTOM_STYLE_LABEL[lang]} ${words}` : '';
}

/**
 * Builds the full image prompt. The same text is sent to the AI and used by "copy image prompt".
 * The safety sentence always comes last, also after a style the user wrote.
 */
export function build_image_prompt(description: string, style_id: ArtStyle, hero_card: string, lang: Lang, custom_style = ''): string {
  return [hero_card, description.trim(), build_style_phrase(style_id, custom_style, lang), IMAGE_SAFETY_RULES[lang]]
    .filter((part) => part.length > 0)
    .join('\n');
}

/**
 * Builds the cover image description from the title and summary, without calling the AI.
 */
export function build_cover_description(title: string, summary: string, lang: Lang): string {
  const base = lang === 'ko' ? `책 표지 그림. 제목: ${title}.` : `Book cover picture. Title: ${title}.`;
  return summary.trim() ? `${base} ${summary.trim()}` : base;
}

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

/** Prompt asking for PLOT_SUGGESTION_COUNT plot ideas. */
export function build_plots_prompt(seed: StorySeed, lang: Lang): string {
  const ask =
    lang === 'ko'
      ? `아래 조건으로 그림책 줄거리를 서로 다르게 ${PLOT_SUGGESTION_COUNT}개 제안해 줘. 각각 제목(title)과 두세 문장 줄거리(summary)를 쓴다.`
      : `Suggest ${PLOT_SUGGESTION_COUNT} different picture book plots for the conditions below. Give each a title and a two or three sentence summary.`;
  return `${ask}\n\n${describe_seed(seed, lang)}`;
}

/** Prompt asking to split the chosen plot into per-page text and image prompts. */
export function build_pages_prompt(plot: Plot, seed: StorySeed, lang: Lang): string {
  const ask =
    lang === 'ko'
      ? `아래 줄거리를 정확히 ${seed.page_count}쪽으로 나눠 줘. 쪽마다 책에 들어갈 글(text, 한두 문장)과 그 쪽의 그림 설명(image_prompt, 장면과 배경과 주인공이 하는 일을 한 문장으로)을 쓴다.`
      : `Split the plot below into exactly ${seed.page_count} pages. For each page write the words for the book (text, one or two sentences) and a picture note (image_prompt, one sentence about the scene, the place, and what the main character is doing).`;
  const plot_part = lang === 'ko' ? `제목: ${plot.title}\n줄거리: ${plot.summary}` : `Title: ${plot.title}\nPlot: ${plot.summary}`;
  return `${ask}\n\n${plot_part}\n\n${describe_seed(seed, lang)}`;
}

/** JSON schema for the plot suggestion response. */
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

/** JSON schema for the page split response, sized to the page count. */
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

function has_string_fields(value: unknown, fields: string[]): value is Record<string, string> {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return fields.every((field) => typeof record[field] === 'string');
}

/** Parses the plot response. Returns null if the format is wrong. */
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

/** Parses the page split response. Returns null if the page count or format is wrong. */
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

/** What each "Ask AI for help" box should hold, and how long it should be. */
const ASSIST_TASKS: Record<AssistKind, Record<Lang, string>> = {
  hero_name: {
    ko: '그림책 주인공의 이름을 하나 지어 줘(text). 실제 사람, 기존 작품의 캐릭터, 상표의 이름은 쓰지 않는다. 이름 하나만 10자 이내로 쓴다.',
    en: 'Make up one name for the main character of a picture book (text). Never use the name of a real person, an existing character, or a brand. Write only one name, at most 15 letters.',
  },
  hero_look: {
    ko: '주인공이 어떻게 생겼는지 한 문장으로 써 줘(text). 모든 그림에서 같은 모습으로 그릴 수 있게 눈에 보이는 특징을 쓴다.',
    en: 'Describe what the main character looks like in one sentence (text). Use features you can see, so every picture can draw the character the same way.',
  },
  topic: {
    ko: '그림책 이야기를 한 줄로 써 줘(text). 30자 안팎의 한 문장으로 쓴다.',
    en: 'Write the picture book story in one line (text). Use one sentence of about 8 words.',
  },
  plot: {
    ko: '그림책의 제목(title)과 줄거리(summary)를 써 줘. 제목은 20자 안팎, 줄거리는 2~3문장으로 쓴다.',
    en: 'Write a title and a plot summary for the picture book. The title has about 5 words; the summary has two or three sentences.',
  },
  page_text: {
    ko: '그림책 {n}쪽에 들어갈 글을 써 줘(text). 줄거리와 앞뒤 쪽 글에 자연스럽게 이어지게 쓴다. 길이는 {length}.',
    en: 'Write the words for page {n} of the picture book (text). They must flow from the plot and the pages before and after. Length: {length}.',
  },
  page_image: {
    ko: '그림책 {n}쪽의 그림 설명을 써 줘(text). 장면, 배경, 주인공이 하는 일처럼 그림에서 눈에 보이는 것만 1~2문장으로 쓴다. 그림 안에 글자를 넣으라는 말은 쓰지 않는다.',
    en: 'Write the picture note for page {n} of the picture book (text). In one or two sentences, describe only what can be seen: the scene, the place, and what the main character is doing. Never ask for words or letters inside the picture.',
  },
};

/** Page word length for each reader age. */
const PAGE_TEXT_LENGTH: Record<AgeBand, Record<Lang, string>> = {
  '5-7': { ko: '아주 쉬운 1문장', en: 'one very simple sentence' },
  '8-10': { ko: '쉬운 1~2문장', en: 'one or two simple sentences' },
  '11-13': { ko: '2~3문장', en: 'two or three sentences' },
};

/** Draft or polish: an empty box gets a first draft; written words are kept and polished. */
function assist_mode(req: AssistRequest): string {
  const is_plot = req.kind === 'plot';
  const written = is_plot ? [req.current_title ?? '', req.current].some((part) => part.trim()) : req.current.trim() !== '';
  if (!written) return req.lang === 'ko' ? '칸이 비어 있으니 처음부터 새로 써 줘.' : 'The box is empty, so write a first draft.';
  const quoted = is_plot
    ? req.lang === 'ko'
      ? `학생이 쓴 제목: «${(req.current_title ?? '').trim()}»\n학생이 쓴 줄거리: «${req.current.trim()}»`
      : `The student's title: «${(req.current_title ?? '').trim()}»\nThe student's summary: «${req.current.trim()}»`
    : req.lang === 'ko'
      ? `학생이 쓴 글: «${req.current.trim()}»`
      : `The student wrote: «${req.current.trim()}»`;
  const rule =
    req.lang === 'ko'
      ? '학생의 생각과 표현을 살려서 다듬거나 이어 써 줘. 뜻은 바꾸지 않는다.'
      : "Keep the student's ideas and words, and polish or continue them. Do not change the meaning.";
  return `${quoted}\n${rule}`;
}

/** The book content the box depends on. */
function assist_context(req: AssistRequest): string {
  const ko = req.lang === 'ko';
  const parts = [describe_seed(req.seed, req.lang)];
  if ((req.kind === 'page_text' || req.kind === 'page_image') && req.plot) {
    parts.push(ko ? `제목: ${req.plot.title}\n줄거리: ${req.plot.summary}` : `Title: ${req.plot.title}\nPlot: ${req.plot.summary}`);
  }
  if (req.kind === 'page_text') {
    const none = ko ? '없음' : 'none';
    parts.push(
      ko
        ? `앞 쪽 글: ${req.previous_text?.trim() || none}\n뒤 쪽 글: ${req.next_text?.trim() || none}`
        : `Words on the page before: ${req.previous_text?.trim() || none}\nWords on the page after: ${req.next_text?.trim() || none}`,
    );
  }
  if (req.kind === 'page_image') {
    const card = build_hero_card(req.seed, req.lang);
    parts.push(ko ? `이 쪽 글: ${req.page_text?.trim() ?? ''}` : `Words on this page: ${req.page_text?.trim() ?? ''}`);
    if (card) parts.push(card);
  }
  return parts.join('\n\n');
}

/** Prompt for "Ask AI for help". The system instruction stays the usual child-safety rules. */
export function build_assist_prompt(req: AssistRequest): string {
  const task = ASSIST_TASKS[req.kind][req.lang]
    .replace('{n}', String(req.page_number ?? 1))
    .replace('{length}', PAGE_TEXT_LENGTH[req.seed.age_band][req.lang]);
  return `${task}\n${assist_mode(req)}\n\n${assist_context(req)}`;
}

/** JSON schema for an "Ask AI for help" answer. */
export function build_assist_schema(kind: AssistKind): object {
  if (kind === 'plot') {
    return {
      type: 'object',
      properties: { title: { type: 'string' }, summary: { type: 'string' } },
      required: ['title', 'summary'],
    };
  }
  return { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] };
}

/** Parses an "Ask AI for help" answer. Returns null if the format is wrong or the answer is empty. */
export function parse_assist(raw: string, kind: AssistKind): AssistResult | null {
  try {
    const data = JSON.parse(raw) as unknown;
    if (kind === 'plot') {
      if (!has_string_fields(data, ['title', 'summary'])) return null;
      const title = (data.title ?? '').trim();
      const summary = (data.summary ?? '').trim();
      return title || summary ? { title, summary } : null;
    }
    if (!has_string_fields(data, ['text'])) return null;
    const text = (data.text ?? '').trim();
    return text ? { text } : null;
  } catch {
    return null;
  }
}


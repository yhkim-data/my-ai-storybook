// Original sample story (3 plots, 8 scenes) used by the mock AI provider and the demo book.
import type { Lang, PageCount, PageDraft, Plot } from '../types';

/** Hero of the demo book. */
export const SAMPLE_HERO: Record<Lang, { name: string; look: string }> = {
  ko: { name: '토리', look: '빨간 목도리를 한 작은 여우, 꼬리 끝이 하얘요' },
  en: { name: 'Tori', look: 'A small fox with a red scarf and a white tail tip' },
};

const SCENE_COUNT = 8;
/** 1-based scenes used per page count, chosen so shorter books still read as one story. */
const SCENES_BY_PAGE_COUNT: Record<PageCount, number[]> = {
  4: [1, 3, 5, 8],
  6: [1, 2, 4, 5, 7, 8],
  8: [1, 2, 3, 4, 5, 6, 7, 8],
};
/** Placeholder for the hero's name in text. */
const HERO_MARK = '{hero}';
/** Unicode range of precomposed Hangul syllables. */
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
/** Number of final-consonant variants per Hangul syllable, including none. */
const FINAL_CONSONANT_COUNT = 28;
const PLOT_ID_PREFIX = 'sample-';
/** Fallback for unknown plot ids. */
const DEFAULT_PLOT_ID = 'sample-1';

/** Text of one plot in one language. */
interface PlotText {
  title: string;
  summary: string;
  /** Page text for scenes 1-8. */
  pages: string[];
}

/** One image description template per scene; {hero} is replaced by the name. */
const IMAGE_TEMPLATES: Record<Lang, string[]> = {
  ko: [
    '아침 햇살이 비치는 작은 집 앞에 서 있는 {hero}의 모습',
    '꽃이 핀 들판 길을 걸어가는 {hero}의 모습',
    '키 큰 나무가 가득한 숲 속을 걷는 {hero}의 모습',
    '강 위의 나무다리를 조심스럽게 건너는 {hero}의 모습',
    '작은 파란 새 친구를 만나 인사하는 {hero}의 모습',
    '별이 가득한 밤 언덕 위에 앉아 하늘을 보는 {hero}의 모습',
    '풀밭에서 반짝이는 빛을 발견하고 놀라는 {hero}의 모습',
    '노을 지는 집 앞으로 파란 새 친구와 함께 돌아온 {hero}의 모습',
  ],
  en: [
    '{hero} standing in front of a small house in the morning sunshine',
    '{hero} walking along a path through a meadow full of flowers',
    '{hero} walking through a forest full of tall trees',
    '{hero} carefully crossing a wooden bridge over a river',
    '{hero} meeting and greeting a small blue bird friend',
    '{hero} sitting on a hill under a night sky full of stars',
    '{hero} finding a sparkling light in the grass and looking amazed',
    '{hero} coming home at sunset together with a blue bird friend',
  ],
};

/** Three plots that all follow the same eight-scene outline. */
const PLOT_TEXTS: Record<Lang, PlotText[]> = {
  ko: [
    {
      title: '{hero:과/와} 떨어진 별',
      summary:
        '어느 날 아침 {hero:은/는} 밤사이 떨어진 작은 별을 찾으러 길을 나서요. 숲과 강을 지나 파란 새 친구를 만나고, 밤 언덕에서 반짝이는 별을 찾아내요.',
      pages: [
        '아침 해가 뜨자 {hero:은/는} 집 앞에서 하늘을 올려다봤어요. 어젯밤 작은 별 하나가 떨어지는 걸 봤거든요. “내가 그 별을 찾아 줄 거야!”',
        '{hero:은/는} 목도리를 단단히 두르고 들판 길을 걸었어요. 길가의 꽃들이 고개를 끄덕이며 인사했어요.',
        '길은 키 큰 나무가 가득한 숲으로 이어졌어요. 나뭇잎 사이로 햇빛이 조각조각 내려와 길을 비춰 주었어요.',
        '숲을 지나자 넓은 강이 나타났어요. {hero:은/는} 흔들리는 나무다리를 한 걸음 한 걸음 조심해서 건넜어요.',
        '걷고 있는 {hero} 앞에 작은 파란 새가 내려앉았어요. “나도 별을 찾고 있었어. 같이 가자!” 둘은 함께 가기로 했어요.',
        '해가 지고 둘은 높은 언덕에 올랐어요. 하늘에는 별이 하나둘 켜졌지만, 떨어진 별은 아직 보이지 않았어요.',
        '그때 풀밭 한쪽에서 작은 빛이 반짝였어요. 바로 떨어진 별이었어요! 별은 “찾아 줘서 고마워” 하고 속삭였어요.',
        '둘은 찾아낸 별을 하늘로 돌려보내고, 노을빛 길을 따라 함께 집으로 돌아왔어요. 이제 {hero}에게는 새로운 친구가 생겼어요.',
      ],
    },
    {
      title: '{hero}의 잃어버린 노래',
      summary:
        '노래를 좋아하는 {hero:은/는} 어느 아침 노래가 사라진 것을 알아요. 길에서 만난 파란 새와 함께 작은 노랫소리를 따라가요.',
      pages: [
        '{hero:은/는} 노래 부르기를 제일 좋아해요. 그런데 오늘 아침, 입을 열었는데 노래가 나오지 않았어요. “내 노래가 어디로 갔지?”',
        '{hero:은/는} 노래를 찾으러 들판 길을 걸었어요. 바람에게 물었더니 “저 멀리서 작은 소리가 들렸어” 하고 알려 주었어요.',
        '숲 속은 조용했어요. 귀를 기울이자 나뭇잎 사이에서 아주 작은 노랫소리가 들렸어요. {hero:은/는} 소리를 따라 더 깊이 들어갔어요.',
        '강물이 졸졸졸 리듬을 타고 흘렀어요. {hero:은/는} 다리 위에서 발걸음을 맞춰 걸으며 노래의 첫 소절을 떠올려 봤어요.',
        '그때 작은 파란 새가 날아와 말했어요. “그 노래, 내가 조금 가지고 있어. 같이 찾아보자!” 둘은 함께 길을 갔어요.',
        '밤이 되어 둘은 언덕에 올랐어요. 별들이 반짝이는 하늘 아래에서 둘은 숨을 고르고 조용히 귀를 기울였어요.',
        '풀밭 한가운데에서 작은 빛이 노랫소리처럼 반짝였어요. {hero:은/는} 그 빛을 가만히 안았어요. 그러자 노래가 가슴속으로 돌아왔어요!',
        '{hero:은/는} 새 친구와 함께 노래를 부르며 집으로 돌아왔어요. 노랫소리가 노을빛 하늘 가득 퍼졌어요.',
      ],
    },
    {
      title: '{hero}의 첫 번째 친구',
      summary:
        '친구가 없어 조금 외로웠던 {hero:은/는} 용기를 내어 길을 나서요. 숲과 다리를 지나 만난 파란 새와 따뜻한 친구가 돼요.',
      pages: [
        '{hero:은/는} 친구가 한 명도 없어서 조금 외로웠어요. 아침 햇살 속에서 “오늘은 꼭 친구를 만들 거야!” 하고 마음먹었어요.',
        '{hero:은/는} 들판 길을 걸으며 인사말을 연습했어요. “안녕, 내 이름은 {hero}!” 말할 때마다 가슴이 콩콩 뛰었어요.',
        '숲 속에서 바스락 소리가 났어요. {hero:은/는} 깜짝 놀라 멈췄지만, 용기를 내어 “누구 있니?” 하고 불러 보았어요.',
        '다리 위에서 강물에 비친 자기 얼굴을 보았어요. “괜찮아, 나도 좋은 친구가 될 수 있어.” {hero:은/는} 크게 숨을 쉬었어요.',
        '그때 작은 파란 새가 나무 위에서 폴짝 내려왔어요. “안녕! 나도 친구가 필요했어.” 둘은 활짝 웃었어요.',
        '둘은 밤 언덕에 나란히 앉아 별을 보았어요. 서로의 이야기를 나누다 보니 외로움은 어느새 사라졌어요.',
        '풀밭에서 따뜻한 빛이 반짝였어요. 둘이 함께 있어서 더 환하게 빛나는 것 같았어요. 친구가 된 마음이 빛이 되었나 봐요.',
        '{hero:은/는} 새 친구와 함께 집으로 돌아왔어요. 이제 {hero:은/는} 더 이상 외롭지 않았어요.',
      ],
    },
  ],
  en: [
    {
      title: '{hero} and the Fallen Star',
      summary:
        'One morning, {hero} sets out to find a little star that fell in the night. After the forest and the river, {hero} meets a blue bird and finds the star on a hill at night.',
      pages: [
        'When the sun came up, {hero} looked at the sky from the front door. Last night, a little star had fallen. “I will find it!”',
        '{hero} wrapped the scarf tight and walked down the meadow path. The flowers nodded hello along the way.',
        'The path led into a forest full of tall trees. Sunlight fell in little pieces between the leaves and lit the way.',
        'After the forest came a wide river. {hero} crossed the wobbly wooden bridge, one careful step at a time.',
        'A small blue bird landed in front of {hero}. “I am looking for the star too. Let’s go together!” they said.',
        'The sun went down, and the two climbed a high hill. Stars came out one by one, but the fallen star was still hidden.',
        'Then a tiny light sparkled in the grass. It was the fallen star! “Thank you for finding me,” it whispered.',
        'They sent the star back up to the sky and walked home together in the sunset glow. Now {hero} had a new friend.',
      ],
    },
    {
      title: '{hero}’s Lost Song',
      summary:
        '{hero} loves to sing, but one morning the song is gone. With a blue bird, {hero} follows a tiny sound to bring it back.',
      pages: [
        '{hero} loved singing more than anything. But this morning, no song came out. “Where did my song go?”',
        '{hero} walked down the meadow path to look for it. The wind said, “I heard a small sound far away.”',
        'The forest was quiet. When {hero} listened closely, a very tiny tune drifted between the leaves. {hero} followed it deeper in.',
        'The river flowed with a splashy beat. On the bridge, {hero} walked in rhythm and remembered the first notes.',
        'A small blue bird flew down. “I have a piece of that song. Let’s look for the rest together!”',
        'At night the two climbed a hill. Under the sparkling stars, they took a deep breath and listened quietly.',
        'In the middle of the grass, a small light twinkled like a tune. {hero} hugged it gently, and the song came back home!',
        '{hero} and the new friend sang all the way home. The song filled the whole sunset sky.',
      ],
    },
    {
      title: '{hero}’s First Friend',
      summary:
        '{hero} feels a little lonely with no friends, so {hero} bravely sets out. Past the forest and the bridge, a blue bird becomes a warm friend.',
      pages: [
        '{hero} had no friends and felt a little lonely. In the morning sun, {hero} decided, “Today I will make a friend!”',
        '{hero} practiced saying hello on the meadow path. “Hi, my name is {hero}!” Each time, a happy heart went thump-thump.',
        'Something rustled in the forest. {hero} stopped, surprised, then bravely called out, “Is anyone there?”',
        'On the bridge, {hero} saw a face in the river. “It’s okay. I can be a good friend.” {hero} took a big breath.',
        'A small blue bird hopped down from a tree. “Hello! I needed a friend too.” They both smiled wide.',
        'The two sat side by side on the hill and watched the stars. As they shared stories, the lonely feeling melted away.',
        'A warm light sparkled in the grass. It seemed to shine brighter because they were together. Friendship had become light.',
        '{hero} went home with the new friend. Now {hero} did not feel lonely anymore.',
      ],
    },
  ],
};

/**
 * Picks a Korean particle by whether the name ends in a final consonant.
 * In 'A/B', A follows a final consonant; B is used otherwise and for non-Hangul names.
 */
function pick_josa(name: string, pair: string): string {
  const [with_final = '', without_final = ''] = pair.split('/');
  const last_code = name.charCodeAt(name.length - 1);
  const is_hangul = last_code >= HANGUL_START && last_code <= HANGUL_END;
  if (!is_hangul) return without_final;
  const has_final = (last_code - HANGUL_START) % FINAL_CONSONANT_COUNT !== 0;
  return has_final ? with_final : without_final;
}

/** Replaces {hero} with the name; {hero:A/B} also appends the matching Korean particle. */
function fill_hero(text: string, name: string): string {
  return text.replace(/\{hero(?::([^}]+))?\}/g, (_m, pair: string | undefined) =>
    pair === undefined ? name : name + pick_josa(name, pair),
  );
}

/** Falls back to the sample hero name when the name is blank. */
function resolve_hero_name(lang: Lang, hero_name: string): string {
  const trimmed = hero_name.trim();
  return trimmed === '' ? SAMPLE_HERO[lang].name : trimmed;
}

/** Returns the three sample plots with hero_name filled into title and summary. */
export function get_sample_plots(lang: Lang, hero_name: string): Plot[] {
  const name = resolve_hero_name(lang, hero_name);
  return PLOT_TEXTS[lang].map((plot, index) => ({
    id: `${PLOT_ID_PREFIX}${index + 1}`,
    title: fill_hero(plot.title, name),
    summary: fill_hero(plot.summary, name),
  }));
}

/** Returns exactly page_count drafts for plot_id; unknown ids fall back to the first plot. */
export function get_sample_pages(
  plot_id: string,
  lang: Lang,
  hero_name: string,
  page_count: PageCount,
): PageDraft[] {
  const name = resolve_hero_name(lang, hero_name);
  const plots = PLOT_TEXTS[lang];
  const known_index = plots.findIndex((_p, index) => `${PLOT_ID_PREFIX}${index + 1}` === plot_id);
  const fallback_index = plots.findIndex(
    (_p, index) => `${PLOT_ID_PREFIX}${index + 1}` === DEFAULT_PLOT_ID,
  );
  const plot = plots[known_index >= 0 ? known_index : fallback_index];
  const templates = IMAGE_TEMPLATES[lang];
  return SCENES_BY_PAGE_COUNT[page_count].map((scene) => ({
    text: fill_hero(plot?.pages[scene - 1] ?? '', name),
    image_prompt: fill_hero(templates[scene - 1] ?? '', name),
  }));
}

/**
 * Returns the scene number (1-8) if image_prompt matches a sample template, else null.
 * Matches on the fixed text around the name, so any hero name works.
 */
export function find_sample_scene(image_prompt: string): number | null {
  let best_scene: number | null = null;
  let best_length = -1;
  for (const lang of ['ko', 'en'] as const) {
    for (let scene = 1; scene <= SCENE_COUNT; scene += 1) {
      const template = IMAGE_TEMPLATES[lang][scene - 1] ?? '';
      const mark_at = template.indexOf(HERO_MARK);
      const prefix = template.slice(0, mark_at);
      const suffix = template.slice(mark_at + HERO_MARK.length);
      const fixed_length = prefix.length + suffix.length;
      const is_match =
        image_prompt.length >= fixed_length &&
        image_prompt.startsWith(prefix) &&
        image_prompt.endsWith(suffix);
      if (is_match && fixed_length > best_length) {
        best_scene = scene;
        best_length = fixed_length;
      }
    }
  }
  return best_scene;
}

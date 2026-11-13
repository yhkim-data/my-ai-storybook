// 앱 전체에서 쓰는 자료 모양. 책, 쪽, 글상자, 이야기 씨앗.

/** 화면 언어 */
export type Lang = 'ko' | 'en';
/** 읽을 사람 나이대 */
export type AgeBand = '5-7' | '8-10' | '11-13';
/** 본문 쪽수 */
export type PageCount = 4 | 6 | 8;
/** 그림체 */
export type StyleId = 'watercolor' | 'crayon' | 'clay' | 'papercut' | 'pencil' | 'pixel';
/** 글과 그림 배치 */
export type LayoutId = 'image_top' | 'text_top' | 'image_left' | 'text_left' | 'full';
/** 책에 쓰는 글꼴 */
export type FontId = 'round' | 'plain' | 'hand';
/** 글상자 바탕 */
export type BoxBackground = 'none' | 'white' | 'bubble';
/** 글 정렬 */
export type TextAlign = 'left' | 'center' | 'right';
/** 글을 누가 쓰는가 */
export type WriteMode = 'ai' | 'self';
/** 그림이 어디서 왔는가 */
export type ImageSource = 'ai' | 'upload';

/** 화면 이름. 앞의 셋은 단계에 들지 않는 화면이다. */
export type Screen =
  | 'start'
  | 'connect'
  | 'rights'
  | 'seed'
  | 'plot'
  | 'pages'
  | 'style'
  | 'pictures'
  | 'editor'
  | 'finish';

/** 2단계에서 받는 이야기 씨앗 */
export interface StorySeed {
  age_band: AgeBand;
  topic: string;
  hero_name: string;
  hero_look: string;
  page_count: PageCount;
}

/** 줄거리 하나 */
export interface Plot {
  id: string;
  title: string;
  summary: string;
}

/** AI가 돌려주는 쪽 초안: 글과 그림 설명 */
export interface PageDraft {
  text: string;
  image_prompt: string;
}

/** 글상자. 위치와 크기는 쪽 크기에 대한 퍼센트(0~100)다. */
export interface TextBox {
  x: number;
  y: number;
  w: number;
  h: number;
  font_id: FontId;
  /** 쪽 너비를 PAGE_REF_SIZE로 봤을 때의 글자 크기(px) */
  font_size: number;
  color: string;
  align: TextAlign;
  background: BoxBackground;
}

/** 쪽에 들어간 그림 */
export interface PageImage {
  data_url: string;
  source: ImageSource;
  /** AI로 만들었을 때 쓴 AI 이름 */
  model_name?: string;
}

/** 책의 쪽 하나. 표지도 쪽이다. */
export interface BookPage {
  id: string;
  kind: 'cover' | 'story';
  text: string;
  image_prompt: string;
  image: PageImage | null;
  layout: LayoutId;
  text_box: TextBox;
}

/** 책 한 권. 작업 파일(.storybook.json)에 이 모양 그대로 들어간다. */
export interface Book {
  format_version: 1;
  id: string;
  lang: Lang;
  author: string;
  seed: StorySeed;
  write_mode: WriteMode;
  /** AI가 제안한 줄거리와, 그 제안을 만든 입력의 열쇠 (같은 입력이면 다시 부르지 않는다) */
  plots: Plot[];
  plots_key: string;
  chosen_plot: Plot | null;
  /** 쪽 나누기를 만든 입력의 열쇠 */
  pages_key: string;
  style_id: StyleId;
  /** pages[0]은 표지, 그 뒤가 본문이다. 표지의 글이 책 제목이다. */
  pages: BookPage[];
  /** 마지막으로 있던 단계 화면 */
  step: Screen;
  updated_at: number;
}

/** 사각형 (퍼센트) */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

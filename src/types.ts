// Shared data types: book, page, text box, story seed.

export type Lang = 'ko' | 'en';
/** Reader age band. */
export type AgeBand = '5-7' | '8-10' | '11-13';
/** Number of story pages (excluding the cover), PAGE_COUNT_MIN to PAGE_COUNT_MAX. */
export type PageCount = number;
/** Illustration style. */
export type StyleId = 'watercolor' | 'crayon' | 'clay' | 'papercut' | 'pencil' | 'pixel';
/** One of the six styles, or 'custom': a style the user describes in words. */
export type ArtStyle = StyleId | 'custom';
/** Text and image layout. */
export type LayoutId = 'image_top' | 'text_top' | 'image_left' | 'text_left' | 'full';
export type FontId = 'round' | 'plain' | 'hand';
export type BoxBackground = 'none' | 'white' | 'bubble';
export type TextAlign = 'left' | 'center' | 'right';
/** Whether the AI or the user writes the text. */
export type WriteMode = 'ai' | 'self';
export type ImageSource = 'ai' | 'upload';

/** Screen name. start, connect and rights are not wizard steps. */
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

/** Story seed entered in step 2. */
export interface StorySeed {
  age_band: AgeBand;
  topic: string;
  hero_name: string;
  hero_look: string;
  page_count: PageCount;
}

export interface Plot {
  id: string;
  title: string;
  summary: string;
}

/** Page draft returned by the AI: text and image description. */
export interface PageDraft {
  text: string;
  image_prompt: string;
}

/** Position and size are percent (0-100) of the page. */
export interface TextBox {
  x: number;
  y: number;
  w: number;
  h: number;
  font_id: FontId;
  /** Font size (px) relative to a page width of PAGE_REF_SIZE. */
  font_size: number;
  color: string;
  align: TextAlign;
  background: BoxBackground;
}

export interface PageImage {
  data_url: string;
  source: ImageSource;
  /** Model name, when the image was AI-generated. */
  model_name?: string;
  /** Style the AI image was made in (see style_key), so a later style change can offer a redraw. */
  style_key?: string;
}

/** One page of the book. The cover is a page too. */
export interface BookPage {
  id: string;
  kind: 'cover' | 'story';
  text: string;
  image_prompt: string;
  image: PageImage | null;
  layout: LayoutId;
  text_box: TextBox;
  /** This page's own art style; when missing the page follows the book's style. */
  style?: ArtStyle;
  /** This page's own style description, used when style is 'custom'. */
  custom_style?: string;
}

/** An art style together with the user's description for 'custom'. */
export interface StyleChoice {
  style_id: ArtStyle;
  custom_style: string;
}

/** Saved as-is in the work file (.storybook.json). */
export interface Book {
  format_version: 1;
  id: string;
  lang: Lang;
  author: string;
  seed: StorySeed;
  write_mode: WriteMode;
  /** AI plot suggestions and the key of the input that produced them (same input skips the call). */
  plots: Plot[];
  plots_key: string;
  chosen_plot: Plot | null;
  /** Key of the input that produced the page split. */
  pages_key: string;
  style_id: ArtStyle;
  /** The user's own style description, used when style_id is 'custom' (one line, at most CUSTOM_STYLE_MAX_LENGTH). */
  custom_style: string;
  /** pages[0] is the cover; its text is the book title. The rest are story pages. */
  pages: BookPage[];
  /** Last step screen the user was on. */
  step: Screen;
  updated_at: number;
}

/** Rectangle in percent. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

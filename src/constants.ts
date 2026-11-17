// App-wide constants and fixed option lists.
import type { AgeBand, FontId, LayoutId, PageCount, Rect, Screen, StyleId, TextBox } from './types';

/** Order of the step screens (steps 1-8). */
export const STEP_SCREENS: Screen[] = ['start', 'seed', 'plot', 'pages', 'style', 'pictures', 'editor', 'finish'];

export const AGE_BANDS: AgeBand[] = ['5-7', '8-10', '11-13'];
/** Page counts offered as buttons; any count from PAGE_COUNT_MIN to PAGE_COUNT_MAX can also be set. */
export const PAGE_COUNTS: PageCount[] = [4, 6, 8];
export const DEFAULT_PAGE_COUNT: PageCount = 8;
export const PAGE_COUNT_MIN = 2;
export const PAGE_COUNT_MAX = 20;
/** First value when the user switches to setting the page count. */
export const CUSTOM_PAGE_COUNT_START: PageCount = 10;
/** Above this many pages the seed screen warns that pictures take longer. */
export const MANY_PAGES_FROM = 9;
export const DEFAULT_AGE_BAND: AgeBand = '8-10';
export const STYLE_IDS: StyleId[] = ['watercolor', 'crayon', 'clay', 'papercut', 'pencil', 'pixel'];
export const DEFAULT_STYLE_ID: StyleId = 'watercolor';
/** In characters. */
export const CUSTOM_STYLE_MAX_LENGTH = 200;
export const LAYOUT_IDS: LayoutId[] = ['image_top', 'text_top', 'image_left', 'text_left', 'full'];
export const DEFAULT_LAYOUT_ID: LayoutId = 'image_top';
/** Topic chips; translation key is seed.topic.<id>. */
export const TOPIC_IDS = ['friendship', 'adventure', 'family', 'animals', 'space'] as const;

/** css_family must match the @font-face name in global.css. */
export const FONTS: Record<FontId, { css_family: string; file: string; weight: string }> = {
  round: { css_family: 'Gowun Dodum', file: 'GowunDodum-Regular.woff2', weight: '400' },
  plain: { css_family: 'Noto Sans KR', file: 'NotoSansKR-VF.woff2', weight: '100 900' },
  hand: { css_family: 'Gaegu', file: 'Gaegu-Regular.woff2', weight: '400' },
};
export const FONT_IDS: FontId[] = ['round', 'plain', 'hand'];

/** Text colors; translation key is editor.color.<id>. */
export const TEXT_COLORS: { id: string; value: string }[] = [
  { id: 'navy', value: '#17233A' },
  { id: 'white', value: '#FFFFFF' },
  { id: 'blue', value: '#2459C4' },
  { id: 'orange', value: '#B4410E' },
  { id: 'green', value: '#145C33' },
];

/** Reference page width (px) that font sizes are defined against. */
export const PAGE_REF_SIZE = 560;
export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 48;
export const DEFAULT_FONT_SIZE = 20;
export const COVER_FONT_SIZE = 36;

/** Square 200 mm page with a 3 mm print bleed. */
export const PAGE_MM = 200;
export const BLEED_MM = 3;

/** Image area per layout, in percent of the page. */
export const LAYOUT_IMAGE_RECT: Record<LayoutId, Rect> = {
  image_top: { x: 5, y: 5, w: 90, h: 60 },
  text_top: { x: 5, y: 35, w: 90, h: 60 },
  image_left: { x: 5, y: 5, w: 55, h: 90 },
  text_left: { x: 40, y: 5, w: 55, h: 90 },
  full: { x: 0, y: 0, w: 100, h: 100 },
};

/** Initial text box area per layout, in percent of the page. */
export const LAYOUT_TEXT_RECT: Record<LayoutId, Rect> = {
  image_top: { x: 5, y: 68, w: 90, h: 27 },
  text_top: { x: 5, y: 5, w: 90, h: 27 },
  image_left: { x: 63, y: 5, w: 32, h: 90 },
  text_left: { x: 5, y: 5, w: 32, h: 90 },
  full: { x: 8, y: 68, w: 84, h: 24 },
};

export const DEFAULT_TEXT_BOX: Omit<TextBox, 'x' | 'y' | 'w' | 'h'> = {
  font_id: 'round',
  font_size: DEFAULT_FONT_SIZE,
  color: '#17233A',
  align: 'left',
  background: 'none',
};

/** Minimum box size and snap distance, in percent. */
export const BOX_MIN_SIZE = 12;
/** Smallest picture box: this percent of the page width, on both sides. */
export const IMAGE_BOX_MIN_SIZE = 10;
export const SNAP_DISTANCE = 1.5;
/** Snap lines: page edges, inner margin, center. */
export const SNAP_LINES = [0, 5, 50, 95, 100];
/** Arrow-key move and resize step for a box, in percent; Shift+arrow uses the big step. */
export const KEY_MOVE_STEP = 1;
export const KEY_MOVE_BIG_STEP = 5;

/** Number of undo steps kept. */
export const HISTORY_LIMIT = 50;
/** Autosave debounce (ms). */
export const AUTOSAVE_DELAY_MS = 300;
/** Uploaded images are scaled so the long side is at most this many px, then saved as JPEG. */
export const UPLOAD_MAX_PX = 1600;
export const UPLOAD_JPEG_QUALITY = 0.9;
/** Gap (ms) between images in "generate all", to stay under the per-minute rate limit. */
export const BATCH_IMAGE_GAP_MS = 4000;
/** Wait (seconds) after hitting the per-minute rate limit. */
export const RATE_LIMIT_WAIT_SECONDS = 60;
/** Number of trailing API key characters shown on screen. */
export const KEY_TAIL_LENGTH = 4;

export const BOOK_FILE_EXTENSION = '.storybook.json';

// 앱 전체에서 쓰는 상수. 숫자와 고정 목록은 여기 모은다.
import type { AgeBand, FontId, LayoutId, PageCount, Rect, Screen, StyleId, TextBox } from './types';

/** 단계 화면 순서 (1~8단계) */
export const STEP_SCREENS: Screen[] = ['start', 'seed', 'plot', 'pages', 'style', 'pictures', 'editor', 'finish'];

/** 고를 수 있는 나이대, 쪽수, 그림체, 배치 */
export const AGE_BANDS: AgeBand[] = ['5-7', '8-10', '11-13'];
export const PAGE_COUNTS: PageCount[] = [4, 6, 8];
export const DEFAULT_PAGE_COUNT: PageCount = 8;
export const DEFAULT_AGE_BAND: AgeBand = '8-10';
export const STYLE_IDS: StyleId[] = ['watercolor', 'crayon', 'clay', 'papercut', 'pencil', 'pixel'];
export const DEFAULT_STYLE_ID: StyleId = 'watercolor';
export const LAYOUT_IDS: LayoutId[] = ['image_top', 'text_top', 'image_left', 'text_left', 'full'];
export const DEFAULT_LAYOUT_ID: LayoutId = 'image_top';
/** 주제 칩 (번역 키는 seed.topic.<id>) */
export const TOPIC_IDS = ['friendship', 'adventure', 'family', 'animals', 'space'] as const;

/** 책에 쓰는 글꼴. css_family는 global.css의 @font-face 이름과 같다. */
export const FONTS: Record<FontId, { css_family: string; file: string; weight: string }> = {
  round: { css_family: 'Gowun Dodum', file: 'GowunDodum-Regular.woff2', weight: '400' },
  plain: { css_family: 'Noto Sans KR', file: 'NotoSansKR-VF.woff2', weight: '100 900' },
  hand: { css_family: 'Gaegu', file: 'Gaegu-Regular.woff2', weight: '400' },
};
export const FONT_IDS: FontId[] = ['round', 'plain', 'hand'];

/** 글자 색 (번역 키는 editor.color.<id>) */
export const TEXT_COLORS: { id: string; value: string }[] = [
  { id: 'navy', value: '#17233A' },
  { id: 'white', value: '#FFFFFF' },
  { id: 'blue', value: '#2459C4' },
  { id: 'orange', value: '#B4410E' },
  { id: 'green', value: '#145C33' },
];

/** 글자 크기의 기준이 되는 쪽 너비(px). 시안의 쪽 미리보기 너비다. */
export const PAGE_REF_SIZE = 560;
export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 48;
export const DEFAULT_FONT_SIZE = 20;
export const COVER_FONT_SIZE = 36;

/** 판형: 정사각형 200mm, 인쇄용 재단 여백 3mm */
export const PAGE_MM = 200;
export const BLEED_MM = 3;

/** 배치마다 그림이 놓이는 자리 (퍼센트) */
export const LAYOUT_IMAGE_RECT: Record<LayoutId, Rect> = {
  image_top: { x: 5, y: 5, w: 90, h: 60 },
  text_top: { x: 5, y: 35, w: 90, h: 60 },
  image_left: { x: 5, y: 5, w: 55, h: 90 },
  text_left: { x: 40, y: 5, w: 55, h: 90 },
  full: { x: 0, y: 0, w: 100, h: 100 },
};

/** 배치마다 글상자가 처음 놓이는 자리 (퍼센트) */
export const LAYOUT_TEXT_RECT: Record<LayoutId, Rect> = {
  image_top: { x: 5, y: 68, w: 90, h: 27 },
  text_top: { x: 5, y: 5, w: 90, h: 27 },
  image_left: { x: 63, y: 5, w: 32, h: 90 },
  text_left: { x: 5, y: 5, w: 32, h: 90 },
  full: { x: 8, y: 68, w: 84, h: 24 },
};

/** 새 글상자의 기본 모양 */
export const DEFAULT_TEXT_BOX: Omit<TextBox, 'x' | 'y' | 'w' | 'h'> = {
  font_id: 'round',
  font_size: DEFAULT_FONT_SIZE,
  color: '#17233A',
  align: 'left',
  background: 'none',
};

/** 글상자 최소 크기와 자석 붙기 거리 (퍼센트) */
export const BOX_MIN_SIZE = 12;
export const SNAP_DISTANCE = 1.5;
/** 자석이 붙는 선: 쪽 가장자리, 안쪽 여백, 가운데 */
export const SNAP_LINES = [0, 5, 50, 95, 100];
/** 키보드로 글상자를 옮길 때 한 번에 가는 거리 (퍼센트) */
export const KEY_MOVE_STEP = 1;

/** 되돌리기 단계 수 */
export const HISTORY_LIMIT = 50;
/** 자동 저장을 미루는 시간(ms) */
export const AUTOSAVE_DELAY_MS = 300;
/** 올린 그림을 줄일 때 긴 변의 최대 길이(px)와 JPEG 품질 */
export const UPLOAD_MAX_PX = 1600;
export const UPLOAD_JPEG_QUALITY = 0.9;
/** "모두 만들기"에서 그림 사이에 두는 간격(ms). 분당 한도를 넘지 않게 한다. */
export const BATCH_IMAGE_GAP_MS = 4000;
/** 분당 한도에 걸렸을 때 기다리는 시간(초) */
export const RATE_LIMIT_WAIT_SECONDS = 60;
/** 화면에 보여 주는 키 끝자리 수 */
export const KEY_TAIL_LENGTH = 4;

/** 작업 파일 확장자 */
export const BOOK_FILE_EXTENSION = '.storybook.json';

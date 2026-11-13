// Gemini 연결 설정. 값의 근거는 docs/PROVIDER_NOTES.md (2026-11-14 확인)에 있다.

/** 제공사 주소. 실제 연결부는 이 주소로만 요청을 보낸다. */
export const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com';
export const GEMINI_INTERACTIONS_URL = `${GEMINI_ORIGIN}/v1beta/interactions`;
export const GEMINI_MODELS_URL = `${GEMINI_ORIGIN}/v1beta/models`;
/** 키를 받는 곳 */
export const GEMINI_KEY_PAGE_URL = 'https://aistudio.google.com/apikey';
/** 그림 요청 예시에 붙어 있는 머리글 값 */
export const GEMINI_API_REVISION = '2026-05-20';

/** 기본 AI 종류 */
export const DEFAULT_TEXT_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-lite-image';
/** 설정 화면에서 고를 수 있는 AI 종류 */
export const TEXT_MODEL_CHOICES = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
export const IMAGE_MODEL_CHOICES = ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1', 'gemini-3.1-flash-image'];
/** 공식 문서에서 참고 그림 입력을 확인한 그림 AI */
export const REFERENCE_IMAGE_MODELS = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-image'];

/** 그림 크기와 비율 */
export const IMAGE_ASPECT_RATIO = '1:1';
export const IMAGE_SIZE = '1K';
export const IMAGE_MIME_TYPE = 'image/png';

/** 안전 설정: 제공사 기본값(Off)보다 엄격하게 보낸다. */
export const SAFETY_SETTINGS = [
  { type: 'harassment', threshold: 'block_low_and_above' },
  { type: 'hate_speech', threshold: 'block_low_and_above' },
  { type: 'sexually_explicit', threshold: 'block_low_and_above' },
  { type: 'dangerous_content', threshold: 'block_low_and_above' },
];

/** 하루 한도가 풀리는 시간대 (태평양 시간 자정) */
export const QUOTA_RESET_TIME_ZONE = 'America/Los_Angeles';

/** 오류 코드 묶음 */
export const BLOCKED_ERROR_CODES = [
  'safety',
  'jailbreak',
  'prohibited_content',
  'blocklist',
  'image_safety',
  'image_prohibited_content',
  'image_recitation',
  'image_other',
  'content_blocked',
  'no_image',
];
export const DAILY_QUOTA_ERROR_CODES = ['quota_exceeded'];
export const RATE_ERROR_CODES = ['rate_limit_exceeded', 'too_many_requests'];

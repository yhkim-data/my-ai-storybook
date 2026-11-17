// Gemini connection settings. Sources for these values are in docs/PROVIDER_NOTES.md (checked 2026-11-14).
import type { PageShape } from '../types';

/** The real providers send requests to this origin only. */
export const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com';
export const GEMINI_INTERACTIONS_URL = `${GEMINI_ORIGIN}/v1beta/interactions`;
export const GEMINI_MODELS_URL = `${GEMINI_ORIGIN}/v1beta/models`;
export const GEMINI_KEY_PAGE_URL = 'https://aistudio.google.com/apikey';

export const DEFAULT_TEXT_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-lite-image';
/** Models selectable on the settings screen. */
export const TEXT_MODEL_CHOICES = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
export const IMAGE_MODEL_CHOICES = ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1', 'gemini-3.1-flash-image'];
/** Image models whose official docs confirm reference image input. */
export const REFERENCE_IMAGE_MODELS = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-image'];
/**
 * Image models whose docs show editing a picture sent with a text instruction (checked 2026-11-17).
 * The docs do not say whether gemini-3.1-flash-lite-image can, so "Fix the picture" is off for it.
 */
export const EDIT_IMAGE_MODELS = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-image'];

export const IMAGE_ASPECT_RATIO = '1:1';
/** Image models whose docs list the 3:4 and 4:3 ratios (checked 2026-11-17); other models stay square. */
export const SHAPE_ASPECT_MODELS = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-image'];
export const SHAPE_ASPECT_RATIOS: Record<PageShape, string> = { square: '1:1', portrait: '3:4', landscape: '4:3' };
export const IMAGE_SIZE = '1K';
export const IMAGE_MIME_TYPE = 'image/png';

/** Stricter than the provider default (Off). */
export const SAFETY_SETTINGS = [
  { type: 'harassment', threshold: 'block_low_and_above' },
  { type: 'hate_speech', threshold: 'block_low_and_above' },
  { type: 'sexually_explicit', threshold: 'block_low_and_above' },
  { type: 'dangerous_content', threshold: 'block_low_and_above' },
];

/** The daily quota resets at midnight in this time zone (Pacific time). */
export const QUOTA_RESET_TIME_ZONE = 'America/Los_Angeles';

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

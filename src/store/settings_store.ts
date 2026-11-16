// Settings store: language, keys, models and today's usage count. Kept only in localStorage, never sent to a server.
import { create } from 'zustand';
import type { Lang } from '../types';
import { KEY_TAIL_LENGTH } from '../constants';
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL } from '../providers/gemini_config';

/** localStorage keys. */
export const SETTINGS_STORAGE_KEY = 'storybook.settings';
export const USAGE_STORAGE_KEY = 'storybook.usage';
/** URL query parameter that enables practice mode (mock AI). */
const PRACTICE_PARAM = 'mock';

interface UsageRecord {
  date: string;
  count: number;
}

interface SavedSettings {
  lang: Lang;
  text_key: string;
  image_key: string;
  text_model: string;
  image_model: string;
}

export interface SettingsState extends SavedSettings {
  /** Practice mode: ?mock in the URL switches to the mock AI providers. */
  practice: boolean;
  usage_count: number;
  set_lang: (lang: Lang) => void;
  set_text_key: (key: string) => void;
  set_image_key: (key: string) => void;
  set_text_model: (model: string) => void;
  set_image_model: (model: string) => void;
  clear_keys: () => void;
  add_usage: () => void;
}

/** Today's date as YYYY-MM-DD in local time. */
function today_string(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function detect_lang(): Lang {
  const browser_lang = typeof navigator === 'undefined' ? 'ko' : navigator.language;
  return browser_lang.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

/** Reads saved settings, falling back to defaults when missing or corrupt. */
function read_saved_settings(): SavedSettings {
  const defaults: SavedSettings = {
    lang: detect_lang(),
    text_key: '',
    image_key: '',
    text_model: DEFAULT_TEXT_MODEL,
    image_model: DEFAULT_IMAGE_MODEL,
  };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<SavedSettings>) };
  } catch {
    return defaults;
  }
}

/** Today's usage count; resets to 0 on a new day. */
function read_usage_count(): number {
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) return 0;
    const record = JSON.parse(raw) as UsageRecord;
    return record.date === today_string() ? record.count : 0;
  } catch {
    return 0;
  }
}

function read_practice_flag(): boolean {
  if (typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).has(PRACTICE_PARAM);
}

function write_saved_settings(state: SavedSettings): void {
  const saved: SavedSettings = {
    lang: state.lang,
    text_key: state.text_key,
    image_key: state.image_key,
    text_model: state.text_model,
    image_model: state.image_model,
  };
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // If storage is unavailable, settings last only for this visit.
  }
}

export const useSettings = create<SettingsState>((set, get) => {
  const update = (patch: Partial<SavedSettings>) => {
    set(patch);
    write_saved_settings(get());
  };
  return {
    ...read_saved_settings(),
    practice: read_practice_flag(),
    usage_count: read_usage_count(),
    set_lang: (lang) => {
      update({ lang });
      if (typeof document !== 'undefined') document.documentElement.lang = lang;
    },
    set_text_key: (key) => update({ text_key: key.trim() }),
    set_image_key: (key) => update({ image_key: key.trim() }),
    set_text_model: (model) => update({ text_model: model.trim() || DEFAULT_TEXT_MODEL }),
    set_image_model: (model) => update({ image_model: model.trim() || DEFAULT_IMAGE_MODEL }),
    clear_keys: () => update({ text_key: '', image_key: '' }),
    add_usage: () => {
      const count = read_usage_count() + 1;
      try {
        const record: UsageRecord = { date: today_string(), count };
        localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(record));
      } catch {
        // Failing to persist the count is harmless.
      }
      set({ usage_count: count });
    },
  };
});

/** Last few characters of a key; only this part is ever shown on screen. */
export function key_tail(key: string): string {
  return key.slice(-KEY_TAIL_LENGTH);
}

/** Key for image calls; falls back to the text key when no image key is set. */
export function effective_image_key(state: Pick<SettingsState, 'text_key' | 'image_key'>): string {
  return state.image_key || state.text_key;
}

export type AiStatus = 'practice' | 'on' | 'off';

/** AI connection status: practice mode, connected, or not connected. */
export function ai_status(state: Pick<SettingsState, 'practice' | 'text_key' | 'image_key'>): AiStatus {
  if (state.practice) return 'practice';
  return state.text_key || state.image_key ? 'on' : 'off';
}

// 설정 저장소. 언어, 키, AI 종류, 오늘 쓴 횟수를 localStorage에만 둔다. 서버로 보내지 않는다.
import { create } from 'zustand';
import type { Lang } from '../types';
import { KEY_TAIL_LENGTH } from '../constants';
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL } from '../providers/gemini_config';

/** localStorage 항목 이름 */
export const SETTINGS_STORAGE_KEY = 'storybook.settings';
export const USAGE_STORAGE_KEY = 'storybook.usage';
/** 연습 모드(가짜 AI 연결부)를 켜는 주소 꼬리표 */
const PRACTICE_PARAM = 'mock';

/** 오늘 쓴 횟수 기록 */
interface UsageRecord {
  date: string;
  count: number;
}

/** localStorage에 남기는 설정 */
interface SavedSettings {
  lang: Lang;
  text_key: string;
  image_key: string;
  text_model: string;
  image_model: string;
}

export interface SettingsState extends SavedSettings {
  /** 연습 모드: 주소에 ?mock=1 이 있으면 가짜 AI 연결부를 쓴다 */
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

/**
 * 오늘 날짜를 YYYY-MM-DD로 돌려준다 (이 기기 시간 기준).
 */
function today_string(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * 브라우저 언어를 보고 처음 화면 언어를 정한다.
 */
function detect_lang(): Lang {
  const browser_lang = typeof navigator === 'undefined' ? 'ko' : navigator.language;
  return browser_lang.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

/**
 * localStorage에서 설정을 읽는다. 없거나 깨졌으면 기본값을 쓴다.
 */
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

/**
 * 오늘 쓴 횟수를 읽는다. 날짜가 바뀌었으면 0이다.
 */
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

/**
 * 주소에 연습 모드 꼬리표가 있는지 본다.
 */
function read_practice_flag(): boolean {
  if (typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).has(PRACTICE_PARAM);
}

/**
 * 설정을 localStorage에 쓴다.
 */
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
    // 저장 공간을 못 쓰는 브라우저에서는 이번 방문 동안만 기억한다.
  }
}

export const useSettings = create<SettingsState>((set, get) => {
  /** 설정 일부를 바꾸고 localStorage에 남긴다. */
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
        // 횟수를 남기지 못해도 동작에는 문제가 없다.
      }
      set({ usage_count: count });
    },
  };
});

/**
 * 키의 끝 몇 자리만 돌려준다. 화면에는 이것만 보여 준다.
 */
export function key_tail(key: string): string {
  return key.slice(-KEY_TAIL_LENGTH);
}

/**
 * 그림에 쓸 키를 돌려준다. 그림용 키가 없으면 글용 키를 함께 쓴다.
 */
export function effective_image_key(state: Pick<SettingsState, 'text_key' | 'image_key'>): string {
  return state.image_key || state.text_key;
}

/** AI 연결 상태: 연습 모드, 연결됨, 연결 안 됨 */
export type AiStatus = 'practice' | 'on' | 'off';

/**
 * 지금 AI 연결 상태를 돌려준다.
 */
export function ai_status(state: Pick<SettingsState, 'practice' | 'text_key' | 'image_key'>): AiStatus {
  if (state.practice) return 'practice';
  return state.text_key || state.image_key ? 'on' : 'off';
}

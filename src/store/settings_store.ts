// Settings store: language, AI connections, usage counts, picture limit and the away time.
// Keys live only in this JavaScript memory: they are never written to localStorage, sessionStorage, IndexedDB or any
// file, so a reload, a closed tab or the away timer forgets them. Everything else here is saved in localStorage.
import { create } from 'zustand';
import { IDLE_MINUTES_DEFAULT, IDLE_MINUTES_MAX, IDLE_MINUTES_MIN, KEY_TAIL_LENGTH } from '../constants';
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL } from '../providers/gemini_config';
import { PROVIDER_INFO, detect_provider, resolve_image_model, resolve_text_model, type ProviderKind } from '../providers/provider_kinds';
import type { Lang } from '../types';

/** localStorage keys. */
export const SETTINGS_STORAGE_KEY = 'storybook.settings';
export const USAGE_STORAGE_KEY = 'storybook.usage';
/** URL query parameter that enables practice mode (mock AI). */
const PRACTICE_PARAM = 'mock';

/** One AI connection. The key is kept in memory only; a connection read back from storage or a settings file has none. */
export interface Connection {
  id: string;
  kind: ProviderKind;
  /** Name shown in the list, e.g. "3반 수업용"; empty shows the provider name. */
  label: string;
  text_model: string;
  /** '' for providers that cannot make pictures. */
  image_model: string;
  /** Memory only. '' means "needs a key". */
  key: string;
}

/** Usage counted by this app: text requests and pictures (fixes included). */
export interface UsageCounts {
  text: number;
  image: number;
}

interface UsageRecord extends UsageCounts {
  date: string;
  /** text + image, kept for older readers of this record. */
  count: number;
}

/** What is saved in localStorage. There is no key in it. */
interface SavedSettings {
  lang: Lang;
  connections: Omit<Connection, 'key'>[];
  text_connection: string | null;
  /** null: pictures use the text connection. */
  image_connection: string | null;
  /** Today's picture limit on this computer; null is no limit. */
  image_limit: number | null;
  idle_minutes: number;
}

export interface SettingsState {
  lang: Lang;
  /** Practice mode: ?mock in the URL, or "practice mode" picked in the connection list. Uses the mock AI. */
  practice: boolean;
  connections: Connection[];
  text_connection: string | null;
  image_connection: string | null;
  image_limit: number | null;
  idle_minutes: number;
  /** Mirrors of the chosen connections, read by the providers. */
  text_key: string;
  image_key: string;
  text_model: string;
  image_model: string;
  /** Today's usage on this computer, and usage since this window opened. */
  usage_count: number;
  usage_today: UsageCounts;
  usage_session: UsageCounts;
  /** An older version had saved keys on this computer; they were removed on this start. */
  removed_saved_key: boolean;
  /** The small "enter your key again" window is open. */
  key_prompt_open: boolean;

  set_lang: (lang: Lang) => void;
  /** Adds (or refills) a connection for a checked key and makes it the text or picture connection. */
  connect_key: (key: string, role: 'text' | 'image') => void;
  /** Picks the text or picture connection by id, or practice mode; null for pictures means "same as text". */
  choose_connection: (role: 'text' | 'image', id: string | null) => void;
  set_text_model: (model: string) => void;
  set_image_model: (model: string) => void;
  /** Forgets every key; connections stay in the list as "needs a key". */
  clear_keys: () => void;
  /** Replaces the connection list and limits from a settings file (no keys in it). */
  load_settings: (settings: Partial<SavedSettings>) => void;
  set_image_limit: (limit: number | null) => void;
  /** Names a connection, e.g. "3반 수업용". */
  set_connection_label: (id: string, label: string) => void;
  set_idle_minutes: (minutes: number) => void;
  add_usage: (kind: keyof UsageCounts) => void;
  dismiss_removed_key: () => void;
  open_key_prompt: () => void;
  close_key_prompt: () => void;
}

/** Today's date as YYYY-MM-DD in local time. */
export function today_string(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function detect_lang(): Lang {
  const browser_lang = typeof navigator === 'undefined' ? 'ko' : navigator.language;
  return browser_lang.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

function make_connection_id(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Keeps the away time within IDLE_MINUTES_MIN..IDLE_MINUTES_MAX whole minutes. */
export function clamp_idle_minutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return IDLE_MINUTES_DEFAULT;
  return Math.max(IDLE_MINUTES_MIN, Math.min(Math.round(value), IDLE_MINUTES_MAX));
}

/** A whole number of pictures from 1 up, or null for no limit. */
export function clean_image_limit(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return null;
  return Math.round(value);
}

/** Longest connection name, in characters. */
export const CONNECTION_LABEL_MAX_LENGTH = 30;

/** A saved or loaded connection with a known provider and models that belong to it. */
export function clean_connection(value: unknown): Omit<Connection, 'key'> | null {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Partial<Connection>;
  if (item.kind !== 'gemini' && item.kind !== 'claude' && item.kind !== 'openai') return null;
  const label = typeof item.label === 'string' ? item.label.trim().slice(0, CONNECTION_LABEL_MAX_LENGTH) : '';
  return {
    id: typeof item.id === 'string' && item.id ? item.id : make_connection_id(),
    kind: item.kind,
    label,
    text_model: resolve_text_model(item.kind, typeof item.text_model === 'string' ? item.text_model : ''),
    image_model: resolve_image_model(item.kind, typeof item.image_model === 'string' ? item.image_model : '') ?? '',
  };
}

function default_settings(): SavedSettings {
  return { lang: detect_lang(), connections: [], text_connection: null, image_connection: null, image_limit: null, idle_minutes: IDLE_MINUTES_DEFAULT };
}

/** Fixes a settings object read from storage or a file; keys anywhere in it are ignored. */
export function clean_settings(raw: Partial<SavedSettings>, base: SavedSettings = default_settings()): SavedSettings {
  const connections = Array.isArray(raw.connections) ? raw.connections.map(clean_connection).filter((item) => item !== null) : base.connections;
  const has = (id: unknown) => typeof id === 'string' && connections.some((item) => item.id === id);
  return {
    lang: raw.lang === 'ko' || raw.lang === 'en' ? raw.lang : base.lang,
    connections,
    text_connection: has(raw.text_connection) ? (raw.text_connection as string) : null,
    image_connection: has(raw.image_connection) ? (raw.image_connection as string) : null,
    image_limit: 'image_limit' in raw ? clean_image_limit(raw.image_limit) : base.image_limit,
    idle_minutes: 'idle_minutes' in raw ? clamp_idle_minutes(raw.idle_minutes) : base.idle_minutes,
  };
}

/**
 * Reads saved settings. An older version saved keys here (text_key, image_key); they are removed now and
 * removed_key says so, so the start screen can tell the user once.
 */
function read_saved_settings(): { settings: SavedSettings; removed_key: boolean } {
  const defaults = default_settings();
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { settings: defaults, removed_key: false };
    const data = JSON.parse(raw) as Partial<SavedSettings> & { text_key?: unknown; image_key?: unknown };
    const removed_key = (typeof data.text_key === 'string' && data.text_key !== '') || (typeof data.image_key === 'string' && data.image_key !== '');
    const settings = clean_settings(data, defaults);
    if (removed_key || 'text_key' in data || 'image_key' in data) write_saved_settings(settings);
    return { settings, removed_key };
  } catch {
    return { settings: defaults, removed_key: false };
  }
}

function write_saved_settings(settings: SavedSettings): void {
  const saved: SavedSettings = {
    lang: settings.lang,
    connections: settings.connections.map(({ id, kind, label, text_model, image_model }) => ({ id, kind, label, text_model, image_model })),
    text_connection: settings.text_connection,
    image_connection: settings.image_connection,
    image_limit: settings.image_limit,
    idle_minutes: settings.idle_minutes,
  };
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // If storage is unavailable, settings last only for this visit.
  }
}

function read_usage(): UsageCounts {
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) return { text: 0, image: 0 };
    const record = JSON.parse(raw) as Partial<UsageRecord>;
    if (record.date !== today_string()) return { text: 0, image: 0 };
    return { text: Number(record.text) || 0, image: Number(record.image) || 0 };
  } catch {
    return { text: 0, image: 0 };
  }
}

function read_practice_flag(): boolean {
  if (typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).has(PRACTICE_PARAM);
}

/** The key, model mirrors for the chosen connections. Pictures fall back to the text connection. */
function mirrors(state: Pick<SettingsState, 'connections' | 'text_connection' | 'image_connection'>) {
  const text = state.connections.find((item) => item.id === state.text_connection);
  const image = state.connections.find((item) => item.id === state.image_connection);
  return {
    text_key: text?.key ?? '',
    image_key: image?.key ?? '',
    text_model: text?.text_model ?? DEFAULT_TEXT_MODEL,
    image_model: (image ?? text)?.image_model || DEFAULT_IMAGE_MODEL,
  };
}

const initial = typeof window === 'undefined' ? { settings: default_settings(), removed_key: false } : read_saved_settings();
const initial_usage = read_usage();

export const useSettings = create<SettingsState>((set, get) => {
  /** Applies a change, refreshes the mirrors and saves everything but the keys. */
  const update = (patch: Partial<SettingsState>) => {
    set(patch);
    const state = get();
    set(mirrors(state));
    write_saved_settings(state);
  };

  return {
    ...initial.settings,
    connections: initial.settings.connections.map((item) => ({ ...item, key: '' })),
    ...mirrors({ ...initial.settings, connections: initial.settings.connections.map((item) => ({ ...item, key: '' })) }),
    practice: read_practice_flag(),
    usage_today: initial_usage,
    usage_session: { text: 0, image: 0 },
    usage_count: initial_usage.text + initial_usage.image,
    removed_saved_key: initial.removed_key,
    key_prompt_open: false,

    set_lang: (lang) => {
      update({ lang });
      if (typeof document !== 'undefined') document.documentElement.lang = lang;
    },
    connect_key: (raw_key, role) => {
      const key = raw_key.trim();
      if (!key) return;
      const kind = detect_provider(key);
      const { connections } = get();
      // Same key again, or a connection of this provider still waiting for its key (after a reload or from a file).
      const same = connections.find((item) => item.key === key) ?? connections.find((item) => item.kind === kind && item.key === '');
      const connection: Connection = same
        ? { ...same, key }
        : {
            id: make_connection_id(),
            kind,
            label: '',
            text_model: PROVIDER_INFO[kind].text_model,
            image_model: PROVIDER_INFO[kind].image_model ?? '',
            key,
          };
      const next = same ? connections.map((item) => (item.id === same.id ? connection : item)) : [...connections, connection];
      update({
        connections: next,
        practice: false,
        ...(role === 'text' ? { text_connection: connection.id } : { image_connection: connection.id }),
        key_prompt_open: false,
      });
    },
    choose_connection: (role, id) => {
      if (id === 'practice') {
        update({ practice: true });
        return;
      }
      if (id === null) {
        if (role === 'image') update({ practice: false, image_connection: null });
        return;
      }
      if (!get().connections.some((item) => item.id === id)) return;
      update({ practice: false, ...(role === 'text' ? { text_connection: id } : { image_connection: id }) });
    },
    set_text_model: (model) => {
      const { connections, text_connection } = get();
      update({ connections: connections.map((item) => (item.id === text_connection ? { ...item, text_model: resolve_text_model(item.kind, model) } : item)) });
    },
    set_image_model: (model) => {
      const { connections, image_connection, text_connection } = get();
      const target = image_connection ?? text_connection;
      update({
        connections: connections.map((item) =>
          item.id === target ? { ...item, image_model: resolve_image_model(item.kind, model) ?? '' } : item,
        ),
      });
    },
    clear_keys: () => update({ connections: get().connections.map((item) => ({ ...item, key: '' })) }),
    load_settings: (raw) => {
      const settings = clean_settings(raw, { ...get(), connections: [] });
      const keep_keys = new Map(get().connections.map((item) => [item.id, item.key]));
      update({ ...settings, connections: settings.connections.map((item) => ({ ...item, key: keep_keys.get(item.id) ?? '' })) });
      if (typeof document !== 'undefined') document.documentElement.lang = settings.lang;
    },
    set_image_limit: (limit) => update({ image_limit: clean_image_limit(limit) }),
    set_connection_label: (id, label) =>
      update({ connections: get().connections.map((item) => (item.id === id ? { ...item, label: label.slice(0, CONNECTION_LABEL_MAX_LENGTH) } : item)) }),
    set_idle_minutes: (minutes) => update({ idle_minutes: clamp_idle_minutes(minutes) }),
    add_usage: (kind) => {
      const today = read_usage();
      today[kind] += 1;
      try {
        const record: UsageRecord = { date: today_string(), ...today, count: today.text + today.image };
        localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(record));
      } catch {
        // Failing to persist the count is harmless.
      }
      const session = { ...get().usage_session, [kind]: get().usage_session[kind] + 1 };
      set({ usage_today: today, usage_session: session, usage_count: today.text + today.image });
    },
    dismiss_removed_key: () => set({ removed_saved_key: false }),
    open_key_prompt: () => set({ key_prompt_open: true }),
    close_key_prompt: () => set({ key_prompt_open: false }),
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

/** True when a connection is remembered but its key is gone (after a reload or the away timer): ask for it again. */
export function needs_key(state: Pick<SettingsState, 'practice' | 'text_key' | 'image_key' | 'connections'>): boolean {
  return !state.practice && !state.text_key && !state.image_key && state.connections.length > 0;
}

/** Share of the picture limit at which the usage chip starts warning. */
export const IMAGE_LIMIT_WARN_SHARE = 0.8;

/** True when today's picture limit on this computer is set and used up. */
export function image_limit_reached(state: Pick<SettingsState, 'image_limit' | 'usage_today' | 'practice'>): boolean {
  return !state.practice && state.image_limit !== null && state.usage_today.image >= state.image_limit;
}

/** True when 80% or more of the picture limit is used. */
export function image_limit_near(state: Pick<SettingsState, 'image_limit' | 'usage_today' | 'practice'>): boolean {
  return !state.practice && state.image_limit !== null && state.usage_today.image >= state.image_limit * IMAGE_LIMIT_WARN_SHARE;
}

/** Name of a connection for lists: its label or the provider name, and the key's last characters when known. */
export function connection_name(connection: Connection): string {
  const name = connection.label || PROVIDER_INFO[connection.kind].label;
  return connection.key ? `${name} …${key_tail(connection.key)}` : name;
}

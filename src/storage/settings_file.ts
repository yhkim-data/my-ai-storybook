// Settings file: language, the connection list (provider, words or pictures, model names, name labels), the picture
// limit and the away time. A teacher can make one for a class; students load it and only enter their key.
// It never holds a key or any book content (the book has its own work file).
import { clean_settings, type SettingsState } from '../store/settings_store';
import type { Lang } from '../types';

export const SETTINGS_FILE_KIND = 'storybook-settings';
export const SETTINGS_FILE_VERSION = 1;
/** Bigger files are not settings files. */
export const SETTINGS_FILE_MAX_BYTES = 64 * 1024;
export const SETTINGS_FILE_NAMES: Record<Lang, string> = {
  ko: '나만의-AI-동화책-설정.json',
  en: 'my-ai-storybook-settings.json',
};
/** Text that starts like a provider key. Any string in a loaded file that contains one is thrown away. */
const KEY_LIKE = /(sk-ant-|sk-|AIza)[A-Za-z0-9_-]{4,}/;

export class SettingsFileError extends Error {
  constructor(reason: 'too_big' | 'not_settings') {
    super(reason);
    this.name = 'SettingsFileError';
  }
}

type SettingsSource = Pick<SettingsState, 'lang' | 'connections' | 'text_connection' | 'image_connection' | 'image_limit' | 'idle_minutes'>;

/** The settings file text for the current settings, without any key. */
export function build_settings_file(state: SettingsSource): string {
  const data = {
    kind: SETTINGS_FILE_KIND,
    version: SETTINGS_FILE_VERSION,
    lang: state.lang,
    connections: state.connections.map(({ id, kind, label, text_model, image_model }) => ({ id, kind, label, text_model, image_model })),
    text_connection: state.text_connection,
    image_connection: state.image_connection,
    image_limit: state.image_limit,
    idle_minutes: state.idle_minutes,
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}

/** Copies a JSON value, leaving out every string that looks like a key. Returns whether one was found. */
export function drop_key_like(value: unknown): { value: unknown; found: boolean } {
  if (typeof value === 'string') return KEY_LIKE.test(value) ? { value: undefined, found: true } : { value, found: false };
  if (Array.isArray(value)) {
    let found = false;
    const items = value.map((item) => {
      const result = drop_key_like(item);
      found ||= result.found;
      return result.value;
    });
    return { value: items, found };
  }
  if (typeof value === 'object' && value !== null) {
    let found = false;
    const copy: Record<string, unknown> = {};
    for (const [name, item] of Object.entries(value)) {
      const result = drop_key_like(item);
      found ||= result.found;
      if (result.value !== undefined) copy[name] = result.value;
    }
    return { value: copy, found };
  }
  return { value, found: false };
}

/**
 * Reads a settings file: checks the size, the format and the value ranges. Key-like text is thrown away and
 * reported in had_key. Throws SettingsFileError when the file is not a settings file.
 */
export function parse_settings_file(text: string): { settings: ReturnType<typeof clean_settings>; had_key: boolean } {
  if (new Blob([text]).size > SETTINGS_FILE_MAX_BYTES) throw new SettingsFileError('too_big');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SettingsFileError('not_settings');
  }
  const { value, found } = drop_key_like(raw);
  const data = value as Record<string, unknown> | null;
  if (typeof data !== 'object' || data === null || data.kind !== SETTINGS_FILE_KIND || data.version !== SETTINGS_FILE_VERSION) {
    throw new SettingsFileError('not_settings');
  }
  return { settings: clean_settings(data), had_key: found };
}

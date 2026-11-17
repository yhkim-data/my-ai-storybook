// Settings file: no key ever goes in, key-like text in a loaded file is thrown away, and size, format and ranges are checked.
import { beforeEach, describe, expect, it } from 'vitest';
import { useSettings } from '../store/settings_store';
import { SETTINGS_FILE_MAX_BYTES, SettingsFileError, build_settings_file, drop_key_like, parse_settings_file } from './settings_file';

const GEMINI_KEY = 'test-key-0000';
/** Built in pieces so the secret scanner does not see a key-shaped string. */
const OPENAI_LIKE = 'sk-' + 'abcdEFGH1234';
const GOOGLE_LIKE = 'AI' + 'za' + 'SyFakeFake1234';

beforeEach(() => {
  localStorage.clear();
  useSettings.setState({ lang: 'ko', practice: false, connections: [], text_connection: null, image_connection: null, text_key: '', image_key: '', image_limit: null, idle_minutes: 20 });
});

describe('settings file', () => {
  it('saves language, connections, roles, models, labels, limit and away time, never the key, and loads back the same', () => {
    useSettings.getState().connect_key(GEMINI_KEY, 'text');
    const id = useSettings.getState().text_connection!;
    useSettings.getState().set_connection_label(id, '3반 수업용');
    useSettings.getState().set_image_model('gemini-3.1-flash-image');
    useSettings.getState().set_image_limit(30);
    useSettings.getState().set_idle_minutes(10);
    const text = build_settings_file(useSettings.getState());
    expect(text).not.toContain(GEMINI_KEY);
    const data = JSON.parse(text);
    expect(data).toMatchObject({ kind: 'storybook-settings', version: 1, lang: 'ko', text_connection: id, image_limit: 30, idle_minutes: 10 });
    expect(data.connections).toEqual([{ id, kind: 'gemini', label: '3반 수업용', text_model: 'gemini-3.5-flash-lite', image_model: 'gemini-3.1-flash-image' }]);

    // A student loads it on another computer: the connection is there and waits for a key.
    useSettings.setState({ connections: [], text_connection: null, image_limit: null, idle_minutes: 20 });
    const { settings, had_key } = parse_settings_file(text);
    expect(had_key).toBe(false);
    useSettings.getState().load_settings(settings);
    const state = useSettings.getState();
    expect(state.connections).toHaveLength(1);
    expect(state.connections[0]).toMatchObject({ label: '3반 수업용', key: '' });
    expect(state.text_connection).toBe(id);
    expect(state.image_model).toBe('gemini-3.1-flash-image');
    expect(state.image_limit).toBe(30);
    expect(state.idle_minutes).toBe(10);
  });

  it('throws away anything that looks like a key, wherever it is, and says so', () => {
    const text = JSON.stringify({
      kind: 'storybook-settings',
      version: 1,
      lang: 'en',
      api_key: OPENAI_LIKE,
      connections: [{ id: 'a', kind: 'openai', label: GOOGLE_LIKE, text_model: 'gpt-6-luna', image_model: '', key: OPENAI_LIKE }],
      text_connection: 'a',
    });
    const { settings, had_key } = parse_settings_file(text);
    expect(had_key).toBe(true);
    expect(JSON.stringify(settings)).not.toContain(OPENAI_LIKE);
    expect(JSON.stringify(settings)).not.toContain(GOOGLE_LIKE);
    expect(settings.connections[0]?.label).toBe('');
    expect(drop_key_like({ a: ['ok', 'sk-ant-' + 'xxxxxxxx'] })).toEqual({ value: { a: ['ok', undefined] }, found: true });
  });

  it('keeps values in range', () => {
    const { settings } = parse_settings_file(JSON.stringify({ kind: 'storybook-settings', version: 1, lang: 'fr', image_limit: -3, idle_minutes: 2, connections: 'x' }));
    expect(['ko', 'en']).toContain(settings.lang);
    expect(settings.image_limit).toBeNull();
    expect(settings.idle_minutes).toBe(5);
    expect(settings.connections).toEqual([]);
  });

  it('refuses files that are not settings files or are too big', () => {
    expect(() => parse_settings_file('not json')).toThrow(SettingsFileError);
    expect(() => parse_settings_file(JSON.stringify({ kind: 'storybook', version: 1 }))).toThrow('not_settings');
    expect(() => parse_settings_file(JSON.stringify({ kind: 'storybook-settings', version: 2 }))).toThrow('not_settings');
    const big = JSON.stringify({ kind: 'storybook-settings', version: 1, pad: 'x'.repeat(SETTINGS_FILE_MAX_BYTES) });
    expect(() => parse_settings_file(big)).toThrow('too_big');
  });
});

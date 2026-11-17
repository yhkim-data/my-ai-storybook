import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL } from '../providers/gemini_config';
import {
  SETTINGS_STORAGE_KEY,
  USAGE_STORAGE_KEY,
  ai_status,
  clean_settings,
  connection_name,
  key_tail,
  needs_key,
  useSettings,
} from './settings_store';

const TEST_KEY = 'test-key-0000';
const OPENAI_TEST_KEY = 'sk-' + 'test-fake-A1b2';

function reset_all() {
  localStorage.clear();
  sessionStorage.clear();
  useSettings.setState({
    lang: 'ko',
    practice: false,
    connections: [],
    text_connection: null,
    image_connection: null,
    image_limit: null,
    idle_minutes: 20,
    text_key: '',
    image_key: '',
    text_model: DEFAULT_TEXT_MODEL,
    image_model: DEFAULT_IMAGE_MODEL,
    usage_count: 0,
    usage_today: { text: 0, image: 0 },
    usage_session: { text: 0, image: 0 },
  });
}

/** Today's date (YYYY-MM-DD) in local time. */
function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function read_saved(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}');
}

/** Every value in web storage, as one string. */
function all_storage(): string {
  const parts: string[] = [];
  for (const storage of [localStorage, sessionStorage]) {
    for (let index = 0; index < storage.length; index += 1) parts.push(storage.getItem(storage.key(index) ?? '') ?? '');
  }
  return parts.join('\n');
}

beforeEach(reset_all);

describe('keys stay in memory only', () => {
  it('a connected key is used but never written to localStorage or sessionStorage', () => {
    useSettings.getState().connect_key(`  ${TEST_KEY} `, 'text');
    useSettings.getState().connect_key(OPENAI_TEST_KEY, 'image');
    expect(useSettings.getState().text_key).toBe(TEST_KEY);
    expect(useSettings.getState().image_key).toBe(OPENAI_TEST_KEY);
    const stored = all_storage();
    expect(stored).not.toContain(TEST_KEY);
    expect(stored).not.toContain(OPENAI_TEST_KEY);
    // The connections themselves are remembered, without keys, so a reload can ask for the key again.
    expect((read_saved().connections as unknown[]).length).toBe(2);
  });

  it('clear_keys forgets every key; the connections wait for a key', () => {
    useSettings.getState().connect_key(TEST_KEY, 'text');
    useSettings.getState().clear_keys();
    expect(useSettings.getState().text_key).toBe('');
    expect(needs_key(useSettings.getState())).toBe(true);
    useSettings.getState().connect_key(TEST_KEY, 'text');
    expect(useSettings.getState().connections).toHaveLength(1);
    expect(needs_key(useSettings.getState())).toBe(false);
  });

  it('key_tail and connection names show only the last 4 characters', () => {
    expect(key_tail('abcdefgh1234')).toBe('1234');
    useSettings.getState().connect_key(OPENAI_TEST_KEY, 'text');
    const [connection] = useSettings.getState().connections;
    expect(connection_name(connection!)).toBe('OpenAI …A1b2');
    expect(connection_name({ ...connection!, key: '' })).toBe('OpenAI');
  });

  it('models follow the chosen connection and stay within its provider', () => {
    useSettings.getState().connect_key(TEST_KEY, 'text');
    useSettings.getState().set_text_model('gemini-3.8-flash');
    expect(useSettings.getState().text_model).toBe('gemini-3.8-flash');
    useSettings.getState().set_text_model('다른-종류');
    expect(useSettings.getState().text_model).toBe(DEFAULT_TEXT_MODEL);
    useSettings.getState().set_image_model('gemini-nano-banana-2.1');
    expect(useSettings.getState().image_model).toBe('gemini-nano-banana-2.1');
  });

  it('choosing practice mode and back', () => {
    useSettings.getState().connect_key(TEST_KEY, 'text');
    const id = useSettings.getState().text_connection!;
    useSettings.getState().choose_connection('text', 'practice');
    expect(ai_status(useSettings.getState())).toBe('practice');
    useSettings.getState().choose_connection('text', id);
    expect(ai_status(useSettings.getState())).toBe('on');
  });

  it('changing language saves it and updates the document lang', () => {
    useSettings.getState().set_lang('en');
    expect(read_saved().lang).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('clean_settings', () => {
  it('drops keys and unknown values, and keeps limits in range', () => {
    const cleaned = clean_settings({
      lang: 'en',
      connections: [{ id: 'a', kind: 'openai', label: '3반', text_model: 'nope', image_model: 'gpt-image-2.6-sunburst', key: OPENAI_TEST_KEY } as never, { kind: 'other' } as never],
      text_connection: 'a',
      image_connection: 'missing',
      image_limit: 0,
      idle_minutes: 500,
    });
    expect(JSON.stringify(cleaned)).not.toContain(OPENAI_TEST_KEY);
    expect(cleaned.connections).toEqual([{ id: 'a', kind: 'openai', label: '3반', text_model: 'gpt-6-luna', image_model: 'gpt-image-2.6-sunburst' }]);
    expect(cleaned.text_connection).toBe('a');
    expect(cleaned.image_connection).toBeNull();
    expect(cleaned.image_limit).toBeNull();
    expect(cleaned.idle_minutes).toBe(60);
  });
});

describe('ai_status', () => {
  it('practice, on and off', () => {
    expect(ai_status({ practice: true, text_key: '', image_key: '' })).toBe('practice');
    expect(ai_status({ practice: false, text_key: TEST_KEY, image_key: '' })).toBe('on');
    expect(ai_status({ practice: false, text_key: '', image_key: TEST_KEY })).toBe('on');
    expect(ai_status({ practice: false, text_key: '', image_key: '' })).toBe('off');
    expect(ai_status({ practice: true, text_key: TEST_KEY, image_key: '' })).toBe('practice');
  });
});

describe('add_usage', () => {
  it('counts text requests and pictures for today and for this window', () => {
    useSettings.getState().add_usage('text');
    useSettings.getState().add_usage('image');
    useSettings.getState().add_usage('image');
    expect(JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) ?? '{}')).toEqual({ date: today(), text: 1, image: 2, count: 3 });
    expect(useSettings.getState().usage_today).toEqual({ text: 1, image: 2 });
    expect(useSettings.getState().usage_session).toEqual({ text: 1, image: 2 });
    expect(useSettings.getState().usage_count).toBe(3);
  });

  it('restarts when the record is from yesterday', () => {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ date: '2000-01-01', text: 4, image: 9, count: 13 }));
    useSettings.getState().add_usage('image');
    expect(JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) ?? '{}')).toEqual({ date: today(), text: 0, image: 1, count: 1 });
  });
});

describe('keys saved by an older version', () => {
  it('are removed on start, and the start screen is told once', async () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ lang: 'ko', text_key: TEST_KEY, image_key: '', text_model: DEFAULT_TEXT_MODEL }));
    vi.resetModules();
    const fresh = await import('./settings_store');
    expect(fresh.useSettings.getState().removed_saved_key).toBe(true);
    expect(fresh.useSettings.getState().text_key).toBe('');
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).not.toContain(TEST_KEY);
    vi.resetModules();
    const again = await import('./settings_store');
    expect(again.useSettings.getState().removed_saved_key).toBe(false);
  });
});

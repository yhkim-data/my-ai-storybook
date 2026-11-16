import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL } from '../providers/gemini_config';
import { SETTINGS_STORAGE_KEY, USAGE_STORAGE_KEY, ai_status, key_tail, useSettings } from './settings_store';

const TEST_KEY = 'test-key-0000';

function reset_all() {
  localStorage.clear();
  useSettings.setState({
    lang: 'ko',
    practice: false,
    text_key: '',
    image_key: '',
    text_model: DEFAULT_TEXT_MODEL,
    image_model: DEFAULT_IMAGE_MODEL,
    usage_count: 0,
  });
}

/** Today's date (YYYY-MM-DD) in local time. */
function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function read_saved(): Record<string, string> {
  return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}');
}

beforeEach(reset_all);

describe('key storage', () => {
  it('stores keys in localStorage and clear_keys empties them', () => {
    useSettings.getState().set_text_key(`  ${TEST_KEY} `);
    useSettings.getState().set_image_key('image-key-1111');
    expect(useSettings.getState().text_key).toBe(TEST_KEY);
    expect(read_saved().text_key).toBe(TEST_KEY);
    expect(read_saved().image_key).toBe('image-key-1111');
    useSettings.getState().clear_keys();
    expect(read_saved().text_key).toBe('');
    expect(read_saved().image_key).toBe('');
    expect(useSettings.getState().text_key).toBe('');
  });

  it('key_tail returns only the last 4 characters', () => {
    expect(key_tail('abcdefgh1234')).toBe('1234');
    expect(key_tail('ab')).toBe('ab');
  });

  it('blank model names fall back to defaults', () => {
    useSettings.getState().set_text_model('다른-종류');
    expect(useSettings.getState().text_model).toBe('다른-종류');
    useSettings.getState().set_text_model('  ');
    expect(useSettings.getState().text_model).toBe(DEFAULT_TEXT_MODEL);
    useSettings.getState().set_image_model('');
    expect(useSettings.getState().image_model).toBe(DEFAULT_IMAGE_MODEL);
    expect(read_saved().image_model).toBe(DEFAULT_IMAGE_MODEL);
  });

  it('changing language saves it and updates the document lang', () => {
    useSettings.getState().set_lang('en');
    expect(read_saved().lang).toBe('en');
    expect(document.documentElement.lang).toBe('en');
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
  it('increments the count for today in localStorage', () => {
    useSettings.getState().add_usage();
    let record = JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) ?? '{}');
    expect(record).toEqual({ date: today(), count: 1 });
    useSettings.getState().add_usage();
    record = JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) ?? '{}');
    expect(record.count).toBe(2);
    expect(useSettings.getState().usage_count).toBe(2);
  });

  it('restarts at 1 when the record is from yesterday', () => {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ date: '2000-01-01', count: 9 }));
    useSettings.getState().add_usage();
    expect(JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) ?? '{}')).toEqual({ date: today(), count: 1 });
  });
});

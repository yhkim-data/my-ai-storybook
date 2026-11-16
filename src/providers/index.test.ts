// Provider selection tests: which text and image provider each key prefix yields.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSettings } from '../store/settings_store';
import { create_text_provider_for_key, get_image_provider, get_text_provider } from './index';

/** Fake keys, not real ones. */
const CLAUDE_KEY = 'sk-ant-' + 'test-fake-A1b2';
const OPENAI_KEY = 'sk-' + 'test-fake-A1b2';
const GEMINI_KEY = 'test-fake-A1b2';

beforeEach(() => useSettings.setState({ practice: false, text_key: '', image_key: '' }));
afterEach(() => useSettings.setState({ practice: false, text_key: '', image_key: '' }));

describe('get_text_provider', () => {
  it('is null without a key', () => {
    expect(get_text_provider()).toBeNull();
  });

  it('picks the provider by key prefix', () => {
    useSettings.setState({ text_key: GEMINI_KEY });
    expect(get_text_provider()?.id).toBe('gemini-text');
    useSettings.setState({ text_key: CLAUDE_KEY });
    expect(get_text_provider()?.id).toBe('claude-text');
    useSettings.setState({ text_key: OPENAI_KEY });
    expect(get_text_provider()?.id).toBe('openai-text');
  });

  it('the key-check provider also follows the key prefix', () => {
    expect(create_text_provider_for_key(CLAUDE_KEY).id).toBe('claude-text');
    expect(create_text_provider_for_key(OPENAI_KEY).id).toBe('openai-text');
  });
});

describe('get_image_provider', () => {
  it('is null with only a Claude key', () => {
    useSettings.setState({ text_key: CLAUDE_KEY });
    expect(get_image_provider()).toBeNull();
  });

  it('uses OpenAI for images when text is Claude and the image key is OpenAI', () => {
    useSettings.setState({ text_key: CLAUDE_KEY, image_key: OPENAI_KEY });
    expect(get_text_provider()?.id).toBe('claude-text');
    expect(get_image_provider()?.id).toBe('openai-image');
  });

  it('falls back to the text key when there is no image key', () => {
    useSettings.setState({ text_key: OPENAI_KEY });
    expect(get_image_provider()?.id).toBe('openai-image');
    useSettings.setState({ text_key: GEMINI_KEY });
    expect(get_image_provider()?.id).toBe('gemini-image');
  });
});

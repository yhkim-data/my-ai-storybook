// Tests for provider detection from key prefixes and per-provider model resolution.
import { describe, expect, it } from 'vitest';
import {
  CLAUDE_TEXT_MODEL,
  OPENAI_IMAGE_MODEL,
  OPENAI_TEXT_MODEL,
  PROVIDER_INFO,
  PROVIDER_ORDER,
  detect_provider,
  resolve_image_model,
  resolve_text_model,
} from './provider_kinds';

/** Fake keys, not real ones. */
const CLAUDE_FAKE = 'sk-ant-' + 'test-fake-A1b2';
const OPENAI_FAKE = 'sk-' + 'test-fake-A1b2';
const GEMINI_FAKE = 'test-fake-A1b2';

describe('detect_provider', () => {
  it('sk-ant- is Claude, sk- is OpenAI, anything else is Gemini', () => {
    expect(detect_provider(CLAUDE_FAKE)).toBe('claude');
    expect(detect_provider(OPENAI_FAKE)).toBe('openai');
    expect(detect_provider(GEMINI_FAKE)).toBe('gemini');
    expect(detect_provider('')).toBe('gemini');
  });

  it('ignores surrounding whitespace', () => {
    expect(detect_provider(`  ${CLAUDE_FAKE} `)).toBe('claude');
  });
});

describe('PROVIDER_INFO', () => {
  it('has the right order and fields, and only Claude has no image model', () => {
    expect(PROVIDER_ORDER).toEqual(['gemini', 'claude', 'openai']);
    for (const kind of PROVIDER_ORDER) {
      expect(PROVIDER_INFO[kind].kind).toBe(kind);
      expect(PROVIDER_INFO[kind].text_choices).toContain(PROVIDER_INFO[kind].text_model);
    }
    expect(PROVIDER_INFO.claude.image_model).toBeNull();
    expect(PROVIDER_INFO.openai.image_model).toBe(OPENAI_IMAGE_MODEL);
  });
});

describe('resolve_text_model / resolve_image_model', () => {
  it('keeps the saved model if it belongs to the provider', () => {
    expect(resolve_text_model('claude', 'claude-haiku-5-5')).toBe('claude-haiku-5-5');
    expect(resolve_image_model('openai', 'gpt-image-2.6-sunburst')).toBe('gpt-image-2.6-sunburst');
  });

  it("falls back to the provider default for another provider's model", () => {
    expect(resolve_text_model('claude', 'gemini-3.8-flash')).toBe(CLAUDE_TEXT_MODEL);
    expect(resolve_text_model('openai', 'claude-haiku-5-5')).toBe(OPENAI_TEXT_MODEL);
    expect(resolve_image_model('openai', 'gemini-x')).toBe(OPENAI_IMAGE_MODEL);
  });

  it('is null for a provider that cannot make images', () => {
    expect(resolve_image_model('claude', 'anything')).toBeNull();
  });
});

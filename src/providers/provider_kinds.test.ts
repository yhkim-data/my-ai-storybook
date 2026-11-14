// 키 모양으로 회사 알아내기와 회사별 AI 종류 고르기 검사.
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

/** 가짜 키. 실제 키가 아니다. */
const CLAUDE_FAKE = 'sk-ant-' + 'test-fake-A1b2';
const OPENAI_FAKE = 'sk-' + 'test-fake-A1b2';
const GEMINI_FAKE = 'test-fake-A1b2';

describe('detect_provider', () => {
  it('sk-ant- 는 Claude, sk- 는 OpenAI, 그 밖은 Gemini', () => {
    expect(detect_provider(CLAUDE_FAKE)).toBe('claude');
    expect(detect_provider(OPENAI_FAKE)).toBe('openai');
    expect(detect_provider(GEMINI_FAKE)).toBe('gemini');
    expect(detect_provider('')).toBe('gemini');
  });

  it('앞뒤 빈칸은 무시한다', () => {
    expect(detect_provider(`  ${CLAUDE_FAKE} `)).toBe('claude');
  });
});

describe('PROVIDER_INFO', () => {
  it('회사 순서와 정보 종류가 맞고 Claude만 그림이 없다', () => {
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
  it('저장된 값이 그 회사 것이면 그대로 쓴다', () => {
    expect(resolve_text_model('claude', 'claude-haiku-5-5')).toBe('claude-haiku-5-5');
    expect(resolve_image_model('openai', 'gpt-image-2.6-sunburst')).toBe('gpt-image-2.6-sunburst');
  });

  it('다른 회사 값이면 회사 기본값으로 바꾼다', () => {
    expect(resolve_text_model('claude', 'gemini-3.8-flash')).toBe(CLAUDE_TEXT_MODEL);
    expect(resolve_text_model('openai', 'claude-haiku-5-5')).toBe(OPENAI_TEXT_MODEL);
    expect(resolve_image_model('openai', 'gemini-x')).toBe(OPENAI_IMAGE_MODEL);
  });

  it('그림을 못 만드는 회사는 null이다', () => {
    expect(resolve_image_model('claude', 'anything')).toBeNull();
  });
});

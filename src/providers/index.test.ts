// 연결부 고르기 검사: 키 모양에 따라 어느 회사의 글·그림 연결부가 나오는지 본다.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSettings } from '../store/settings_store';
import { create_text_provider_for_key, get_image_provider, get_text_provider } from './index';

/** 가짜 키. 실제 키가 아니다. */
const CLAUDE_KEY = 'sk-ant-' + 'test-fake-A1b2';
const OPENAI_KEY = 'sk-' + 'test-fake-A1b2';
const GEMINI_KEY = 'test-fake-A1b2';

beforeEach(() => useSettings.setState({ practice: false, text_key: '', image_key: '' }));
afterEach(() => useSettings.setState({ practice: false, text_key: '', image_key: '' }));

describe('get_text_provider', () => {
  it('키가 없으면 null', () => {
    expect(get_text_provider()).toBeNull();
  });

  it('키 모양별로 회사가 갈린다', () => {
    useSettings.setState({ text_key: GEMINI_KEY });
    expect(get_text_provider()?.id).toBe('gemini-text');
    useSettings.setState({ text_key: CLAUDE_KEY });
    expect(get_text_provider()?.id).toBe('claude-text');
    useSettings.setState({ text_key: OPENAI_KEY });
    expect(get_text_provider()?.id).toBe('openai-text');
  });

  it('연결 확인용 연결부도 키 모양을 따른다', () => {
    expect(create_text_provider_for_key(CLAUDE_KEY).id).toBe('claude-text');
    expect(create_text_provider_for_key(OPENAI_KEY).id).toBe('openai-text');
  });
});

describe('get_image_provider', () => {
  it('Claude 키만 있으면 null', () => {
    useSettings.setState({ text_key: CLAUDE_KEY });
    expect(get_image_provider()).toBeNull();
  });

  it('글은 Claude, 그림용 키가 OpenAI면 OpenAI 그림 연결부', () => {
    useSettings.setState({ text_key: CLAUDE_KEY, image_key: OPENAI_KEY });
    expect(get_text_provider()?.id).toBe('claude-text');
    expect(get_image_provider()?.id).toBe('openai-image');
  });

  it('그림용 키가 없으면 글 키를 함께 쓴다', () => {
    useSettings.setState({ text_key: OPENAI_KEY });
    expect(get_image_provider()?.id).toBe('openai-image');
    useSettings.setState({ text_key: GEMINI_KEY });
    expect(get_image_provider()?.id).toBe('gemini-image');
  });
});

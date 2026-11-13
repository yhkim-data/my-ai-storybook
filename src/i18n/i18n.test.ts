// 번역 빠짐 검사와 쉬운 말 검사.
import { describe, expect, it } from 'vitest';
import { find_i18n_problems } from '../../scripts/check-i18n.mjs';
import { page_name, translate } from './index';
import ko from './ko.json';
import en from './en.json';

/** 학생이 보는 화면 문구에 쓰지 않는 말 (지시서 8-2) */
const BANNED_WORDS = ['프롬프트', 'API', '토큰', 'prompt', 'token'];

describe('번역', () => {
  it('ko.json과 en.json의 항목이 정확히 같다', () => {
    expect(Object.keys(ko).sort()).toEqual(Object.keys(en).sort());
  });

  it('번역 검사 스크립트가 문제를 찾지 못한다 (빠진 키, 다른 자리 표시, 어려운 말, 코드가 쓰는 키)', () => {
    expect(find_i18n_problems()).toEqual([]);
  });

  it('화면 문구에 어려운 말이 없다', () => {
    for (const table of [ko, en]) {
      for (const [key, text] of Object.entries(table)) {
        for (const word of BANNED_WORDS) {
          expect(text.toLowerCase().includes(word.toLowerCase()), `${key}: ${word}`).toBe(false);
        }
      }
    }
  });

  it('자리 표시를 채우고, 없는 키는 키를 그대로 돌려준다', () => {
    expect(translate('ko', 'common.page_n', { n: 3 })).toBe('3쪽');
    expect(translate('en', 'common.page_n', { n: 3 })).toBe('Page 3');
    expect(translate('ko', 'no.such.key')).toBe('no.such.key');
  });

  it('쪽 이름을 만든다', () => {
    const t = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);
    expect(page_name(t, 0)).toBe('표지');
    expect(page_name(t, 2)).toBe('2쪽');
  });

  it('권리 문장은 두 언어 파일에 한국어와 영어가 모두 있다', () => {
    for (const table of [ko, en]) {
      expect(table['rights.statement.ko']).toContain('만든 사람에게');
      expect(table['rights.statement.en']).toContain('belong to you');
    }
  });
});

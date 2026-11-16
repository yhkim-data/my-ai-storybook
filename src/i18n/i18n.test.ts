import { describe, expect, it } from 'vitest';
import { find_i18n_problems } from '../../scripts/check-i18n.mjs';
import { page_name, translate } from './index';
import ko from './ko.json';
import en from './en.json';

/** Jargon that must not appear in text shown to young users. */
const BANNED_WORDS = ['프롬프트', 'API', '토큰', 'prompt', 'token'];

describe('translations', () => {
  it('ko.json and en.json have exactly the same keys', () => {
    expect(Object.keys(ko).sort()).toEqual(Object.keys(en).sort());
  });

  it('i18n check script finds no problems (missing keys, placeholder mismatch, jargon, keys used in code)', () => {
    expect(find_i18n_problems()).toEqual([]);
  });

  it('UI text contains no jargon', () => {
    for (const table of [ko, en]) {
      for (const [key, text] of Object.entries(table)) {
        for (const word of BANNED_WORDS) {
          expect(text.toLowerCase().includes(word.toLowerCase()), `${key}: ${word}`).toBe(false);
        }
      }
    }
  });

  it('fills placeholders and returns missing keys unchanged', () => {
    expect(translate('ko', 'common.page_n', { n: 3 })).toBe('3쪽');
    expect(translate('en', 'common.page_n', { n: 3 })).toBe('Page 3');
    expect(translate('ko', 'no.such.key')).toBe('no.such.key');
  });

  it('builds page names', () => {
    const t = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);
    expect(page_name(t, 0)).toBe('표지');
    expect(page_name(t, 2)).toBe('2쪽');
  });

  it('both files contain the rights statement in Korean and English', () => {
    for (const table of [ko, en]) {
      expect(table['rights.statement.ko']).toContain('만든 사람에게');
      expect(table['rights.statement.en']).toContain('belong to you');
    }
  });
});

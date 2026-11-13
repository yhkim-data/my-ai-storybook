// 번역 도우미. ko.json과 en.json에서 문구를 찾아 {이름} 자리를 채운다.
import { useCallback } from 'react';
import type { Lang } from '../types';
import { useSettings } from '../store/settings_store';
import ko from './ko.json';
import en from './en.json';

/** 문구에 끼워 넣는 값 */
export type TParams = Record<string, string | number>;
/** 번역 함수 모양 */
export type TFunc = (key: string, params?: TParams) => string;

const TABLES: Record<Lang, Record<string, string>> = { ko, en };

/**
 * 주어진 언어로 문구를 찾는다. 없으면 키를 그대로 돌려준다 (검사에서 잡힌다).
 */
export function translate(lang: Lang, key: string, params?: TParams): string {
  const template = TABLES[lang][key];
  if (template === undefined) return key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/**
 * 지금 화면 언어에 묶인 번역 함수를 돌려주는 훅.
 */
export function useT(): TFunc {
  const lang = useSettings((state) => state.lang);
  return useCallback((key: string, params?: TParams) => translate(lang, key, params), [lang]);
}

/**
 * 쪽 이름을 만든다. 0번은 표지, 그 뒤는 "n쪽".
 */
export function page_name(t: TFunc, page_index: number): string {
  return page_index === 0 ? t('common.cover') : t('common.page_n', { n: page_index });
}

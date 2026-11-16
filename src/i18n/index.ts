// Translation helpers: look up text in ko.json/en.json and fill {name} placeholders.
import { useCallback } from 'react';
import type { Lang } from '../types';
import { useSettings } from '../store/settings_store';
import ko from './ko.json';
import en from './en.json';

export type TParams = Record<string, string | number>;
export type TFunc = (key: string, params?: TParams) => string;

const TABLES: Record<Lang, Record<string, string>> = { ko, en };

/** Translates key; a missing key returns the key itself (the i18n check catches it). */
export function translate(lang: Lang, key: string, params?: TParams): string {
  const template = TABLES[lang][key];
  if (template === undefined) return key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/** Hook returning a translate function bound to the current UI language. */
export function useT(): TFunc {
  const lang = useSettings((state) => state.lang);
  return useCallback((key: string, params?: TParams) => translate(lang, key, params), [lang]);
}

/** Page name: index 0 is the cover, the rest are "page n". */
export function page_name(t: TFunc, page_index: number): string {
  return page_index === 0 ? t('common.cover') : t('common.page_n', { n: page_index });
}

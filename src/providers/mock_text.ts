// 가짜 글 연결부. 키 없이 저장소에 넣어 둔 예시 이야기를 돌려준다. 자동 검사와 연습 모드에서 쓴다.
import type { Lang, PageDraft, Plot, StorySeed } from '../types';
import { get_sample_pages, get_sample_plots } from '../data/sample_story';
import { maybe_fail } from './mock_failure';
import type { TextProvider } from './types';

/** 기다리는 화면이 보이도록 두는 짧은 시간(ms) */
export const MOCK_DELAY_MS = 150;

/**
 * 잠깐 기다린다.
 */
export function mock_wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

/**
 * 가짜 글 연결부를 만든다.
 */
export function create_mock_text(): TextProvider {
  return {
    id: 'mock-text',
    suggestPlots: async (seed: StorySeed, lang: Lang): Promise<Plot[]> => {
      await mock_wait();
      maybe_fail('suggestPlots');
      return get_sample_plots(lang, seed.hero_name);
    },
    splitIntoPages: async (plot: Plot, seed: StorySeed, lang: Lang): Promise<PageDraft[]> => {
      await mock_wait();
      maybe_fail('splitIntoPages');
      return get_sample_pages(plot.id, lang, seed.hero_name, seed.page_count);
    },
    testConnection: async () => ({ ok: true }),
  };
}

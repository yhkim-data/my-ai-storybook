// Mock text provider. Returns the bundled sample story without a key; used by tests and practice mode.
import type { Lang, PageDraft, Plot, StorySeed } from '../types';
import { get_sample_assist, get_sample_pages, get_sample_plots } from '../data/sample_story';
import { maybe_fail } from './mock_failure';
import type { AssistRequest, AssistResult, TextProvider } from './types';

/** Short delay in ms so the loading screen is visible. */
export const MOCK_DELAY_MS = 150;

export function mock_wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

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
    assist: async (req: AssistRequest): Promise<AssistResult> => {
      await mock_wait();
      maybe_fail('assist');
      return get_sample_assist(req);
    },
    testConnection: async () => ({ ok: true }),
  };
}

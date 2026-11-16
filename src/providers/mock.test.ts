// Mock provider tests: plots and pages, images, simulated failures, provider selection, usage count, page images, image prompts.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import { USAGE_STORAGE_KEY, useSettings } from '../store/settings_store';
import type { ImageRequest, ProviderErrorKind } from './types';
import { ProviderError } from './types';
import { blob_to_data_url } from '../utils/image';
import { get_image_provider, get_text_provider } from './index';
import { generate_page_image, full_image_prompt } from './make_image';
import { reset_mock_failures } from './mock_failure';
import { create_mock_image } from './mock_image';
import { create_mock_text } from './mock_text';
import { build_hero_card, build_image_prompt } from './prompts';
import type { StorySeed } from '../types';

const TEST_KEY = 'test-key-0000';
const MS_PER_SECOND = 1000;
const SEED: StorySeed = { age_band: '8-10', topic: '우정', hero_name: '보리', hero_look: '작은 곰', page_count: 6 };
const IMAGE_REQ: ImageRequest = {
  description: '숲속 길',
  style_id: 'watercolor',
  hero_card: '',
  reference_image: null,
  page_index: 1,
  lang: 'ko',
};
const PAGE_COUNTS = [4, 6, 8] as const;

/** Resets settings and the URL. */
function reset_all() {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  reset_mock_failures();
  useSettings.setState({ lang: 'ko', practice: false, text_key: '', image_key: '', usage_count: 0 });
}

function set_mockfail(kind: string) {
  window.history.replaceState({}, '', `/?mock=1&mockfail=${kind}`);
}

/** Returns the rejection reason, asserting it is a ProviderError. */
async function catch_error(promise: Promise<unknown>): Promise<ProviderError> {
  const error = await promise.then(
    () => null,
    (cause: unknown) => cause,
  );
  expect(error).toBeInstanceOf(ProviderError);
  return error as ProviderError;
}

beforeEach(reset_all);
afterEach(reset_all);

describe('mock text provider', () => {
  it('returns 3 plots and page_count pages', async () => {
    const provider = create_mock_text();
    const plots = await provider.suggestPlots(SEED, 'ko');
    expect(plots).toHaveLength(3);
    for (const page_count of PAGE_COUNTS) {
      const pages = await provider.splitIntoPages(plots[0]!, { ...SEED, page_count }, 'ko');
      expect(pages).toHaveLength(page_count);
      expect(pages.every((page) => page.text.length > 0 && page.image_prompt.length > 0)).toBe(true);
    }
  });

  it('returns the same counts in English', async () => {
    const provider = create_mock_text();
    const plots = await provider.suggestPlots(SEED, 'en');
    expect(plots).toHaveLength(3);
    expect(await provider.splitIntoPages(plots[1]!, SEED, 'en')).toHaveLength(SEED.page_count);
  });
});

describe('mock image provider', () => {
  it('returns an image/svg+xml Blob, different for cover and story pages', async () => {
    const provider = create_mock_image();
    const cover = await provider.generate({ ...IMAGE_REQ, page_index: 0 });
    const story = await provider.generate({ ...IMAGE_REQ, page_index: 1 });
    expect(cover.type).toBe('image/svg+xml');
    expect(story.type).toBe('image/svg+xml');
    expect(await blob_to_data_url(cover)).not.toBe(await blob_to_data_url(story));
  });
});

describe('simulated failures (?mockfail)', () => {
  const CASES: [string, ProviderErrorKind][] = [
    ['quota', 'quota_daily'],
    ['rate', 'rate'],
    ['blocked', 'blocked'],
    ['network', 'network'],
  ];

  it.each(CASES)('?mockfail=%s: first call fails with %s, second succeeds', async (value, kind) => {
    set_mockfail(value);
    const text = create_mock_text();
    const first = await catch_error(text.suggestPlots(SEED, 'ko'));
    expect(first.kind).toBe(kind);
    if (kind === 'quota_daily' || kind === 'rate') expect(first.retry_at).toBeGreaterThan(Date.now() - MS_PER_SECOND);
    expect(await text.suggestPlots(SEED, 'ko')).toHaveLength(3);
    // The image provider also fails only the first time.
    const image = create_mock_image();
    expect((await catch_error(image.generate(IMAGE_REQ))).kind).toBe(kind);
    expect((await image.generate(IMAGE_REQ)).type).toBe('image/svg+xml');
  });

  it('fails again after reset_mock_failures()', async () => {
    set_mockfail('quota');
    const text = create_mock_text();
    await catch_error(text.suggestPlots(SEED, 'ko'));
    await text.suggestPlots(SEED, 'ko');
    reset_mock_failures();
    expect((await catch_error(text.suggestPlots(SEED, 'ko'))).kind).toBe('quota_daily');
  });

  it('does not fail without the parameter', async () => {
    expect(await create_mock_text().suggestPlots(SEED, 'ko')).toHaveLength(3);
  });
});

describe('provider selection', () => {
  it('get_text_provider: null without practice mode or a key', () => {
    expect(get_text_provider()).toBeNull();
  });

  it('get_text_provider: mock-text in practice mode, gemini-text with a key', () => {
    useSettings.setState({ practice: true });
    expect(get_text_provider()?.id).toBe('mock-text');
    useSettings.setState({ practice: false, text_key: TEST_KEY });
    expect(get_text_provider()?.id).toBe('gemini-text');
  });

  it('get_image_provider: works with only a text key', () => {
    expect(get_image_provider()).toBeNull();
    useSettings.setState({ text_key: TEST_KEY, image_key: '' });
    expect(get_image_provider()?.id).toBe('gemini-image');
    useSettings.setState({ practice: true });
    expect(get_image_provider()?.id).toBe('mock-image');
  });

  it('increments usage_count by 1 on every provider call', async () => {
    useSettings.setState({ practice: true });
    const text = get_text_provider()!;
    const plots = await text.suggestPlots(SEED, 'ko');
    expect(useSettings.getState().usage_count).toBe(1);
    await text.splitIntoPages(plots[0]!, SEED, 'ko');
    expect(useSettings.getState().usage_count).toBe(2);
    await text.testConnection();
    expect(useSettings.getState().usage_count).toBe(3);
    await get_image_provider()!.generate(IMAGE_REQ);
    expect(useSettings.getState().usage_count).toBe(4);
    expect(JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) ?? '{}').count).toBe(4);
  });
});

describe('page image generation', () => {
  it('returns AI image info and a data URL in practice mode', async () => {
    useSettings.setState({ practice: true });
    const book = build_demo_book('ko');
    const image = await generate_page_image(book, 1);
    expect(image).not.toBeNull();
    expect(image?.source).toBe('ai');
    expect(image?.model_name).toBe('mock-image');
    expect(image?.data_url.startsWith('data:image/svg+xml')).toBe(true);
    expect(useSettings.getState().usage_count).toBe(1);
  });

  it('returns null without a connection and does not count usage', async () => {
    expect(await generate_page_image(build_demo_book('ko'), 1)).toBeNull();
    expect(useSettings.getState().usage_count).toBe(0);
  });

  it('returns null for a missing page index', async () => {
    useSettings.setState({ practice: true });
    expect(await generate_page_image(build_demo_book('ko'), 99)).toBeNull();
  });

  it('full_image_prompt includes the hero card and style phrase', () => {
    const book = build_demo_book('ko');
    const prompt = full_image_prompt(book, 1);
    const card = build_hero_card(book.seed, book.lang);
    expect(card.length).toBeGreaterThan(0);
    expect(prompt).toContain(card);
    expect(prompt).toContain(build_image_prompt('', book.style_id, '', book.lang));
    expect(full_image_prompt(book, 99)).toBe('');
  });
});

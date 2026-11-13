// 6단계 그림 화면 검사: AI로 만들기, 올리기, 복사, 모두 만들기, 오류와 다시 하기.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import * as make_image from '../providers/make_image';
import { ProviderError } from '../providers/types';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import type { Book } from '../types';
import { PicturesScreen } from './PicturesScreen';

// jsdom에는 그림 디코딩이 없으므로 올린 그림 줄이기를 바꿔 둔다.
vi.mock('../utils/image', async (orig) => ({
  ...(await orig<typeof import('../utils/image')>()),
  prepare_upload_image: vi.fn(async () => 'data:image/png;base64,AAAA'),
}));
// 실패 흉내를 낼 수 있게 그림 만들기를 감싼다. 평소에는 원래대로 움직인다.
vi.mock('../providers/make_image', async (orig) => {
  const original = await orig<typeof import('../providers/make_image')>();
  return { ...original, generate_page_image: vi.fn(original.generate_page_image) };
});

/** 한국어 문구 */
const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);

/** 책의 본문 쪽 수 (체험판은 8쪽) */
const STORY_PAGES = 8;
/** 다시 하기가 켜질 때까지 기다리는 최대 시간(ms) */
const RETRY_WAIT_MS = 4000;
/** 이미 그림이 있는 쪽 번호 (모두 만들기에서 건너뛰는지 본다) */
const EXISTING_INDEXES = [2, 5];

/**
 * 모든 그림을 비운 체험판 책을 만든다.
 */
function make_empty_book(): Book {
  const book = build_demo_book('ko');
  return { ...book, pages: book.pages.map((page) => ({ ...page, image: null })) };
}

/**
 * 지금 책의 그림이 있는 쪽 번호들.
 */
function image_indexes(): number[] {
  const pages = useBook.getState().book?.pages ?? [];
  return pages.flatMap((page, index) => (page.image ? [index] : []));
}

beforeEach(() => {
  localStorage.clear();
  useSettings.setState({ lang: 'ko', practice: true, text_key: '', image_key: '', usage_count: 0 });
  useBook.setState({ book: make_empty_book(), is_demo: false, screen: 'pictures', current_page: 0 });
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(async () => undefined) },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.mocked(make_image.generate_page_image).mockClear();
});

describe('PicturesScreen', () => {
  it('쪽 목록에 표지와 8쪽이 있고 지금 쪽이 표시된다', async () => {
    const user = userEvent.setup();
    render(<PicturesScreen />);
    const list = screen.getByRole('navigation', { name: ko('pictures.list') });
    expect(within(list).getAllByRole('button').filter((button) => button.className.includes('pic-item'))).toHaveLength(STORY_PAGES + 1);
    expect(within(list).getByRole('button', { name: new RegExp(ko('common.cover')) })).toHaveAttribute('aria-current', 'true');
    await user.click(within(list).getByRole('button', { name: new RegExp(`^${ko('common.page_n', { n: 3 })}`) }));
    expect(useBook.getState().current_page).toBe(3);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(ko('common.page_n', { n: 3 }));
  });

  it('연습 모드에서 AI로 만들기를 누르면 그 쪽에만 그림이 생기고 횟수가 1 늘어난다', async () => {
    const user = userEvent.setup();
    useBook.getState().set_current_page(2);
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.ai.title')) }));
    await waitFor(() => expect(useBook.getState().book?.pages[2]?.image?.source).toBe('ai'));
    expect(image_indexes()).toEqual([2]);
    expect(useSettings.getState().usage_count).toBe(1);
    expect(make_image.generate_page_image).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('img', { name: ko('pictures.image_alt', { name: ko('common.page_n', { n: 2 }) }) })).toBeInTheDocument();
  });

  it('연결이 없으면 안내만 보여 주고 AI를 부르지 않는다', async () => {
    const user = userEvent.setup();
    useSettings.setState({ practice: false, text_key: '', image_key: '' });
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.ai.title')) }));
    expect(screen.getByText(ko('pictures.need_connect'))).toBeInTheDocument();
    expect(make_image.generate_page_image).not.toHaveBeenCalled();
    expect(useSettings.getState().usage_count).toBe(0);
    await user.click(screen.getByRole('button', { name: ko('pictures.connect_link') }));
    expect(useBook.getState().screen).toBe('connect');
  });

  it('그림을 올리면 source가 upload로 들어간다', async () => {
    render(<PicturesScreen />);
    const input = screen.getByTestId('upload-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    await waitFor(() => expect(useBook.getState().book?.pages[0]?.image?.source).toBe('upload'));
    expect(useBook.getState().book?.pages[0]?.image?.data_url).toBe('data:image/png;base64,AAAA');
  });

  it('그림 설명 복사는 주인공 카드와 그림체 문장이 든 글을 복사한다', async () => {
    const user = userEvent.setup();
    // userEvent.setup()이 클립보드를 바꿔 버리므로, 그 뒤에 검사용 클립보드를 다시 단다.
    const write_text = vi.fn(async (_text: string) => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write_text }, configurable: true });
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.copy.title')) }));
    expect(write_text).toHaveBeenCalledTimes(1);
    const copied = String(write_text.mock.calls[0]?.[0]);
    const book = useBook.getState().book;
    expect(copied).toContain(book?.seed.hero_name ?? '?');
    expect(copied).toContain('수채화');
    expect(await screen.findByText(ko('pictures.copied'))).toBeInTheDocument();
  });

  it('복사에 실패하면 직접 복사할 글을 보여 준다', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) },
      configurable: true,
    });
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.copy.title')) }));
    expect(await screen.findByText(ko('pictures.copy_manual'))).toBeInTheDocument();
    expect((screen.getByTestId('copy-fallback') as HTMLTextAreaElement).value).toContain('수채화');
  });

  it('남은 그림 모두 만들기는 그림 없는 쪽만 한 번씩 만든다', async () => {
    const user = userEvent.setup();
    const book = make_empty_book();
    const existing_url = 'data:image/png;base64,BBBB';
    useBook.setState({
      book: {
        ...book,
        pages: book.pages.map((page, index) =>
          EXISTING_INDEXES.includes(index) ? { ...page, image: { data_url: existing_url, source: 'upload' as const } } : page,
        ),
      },
    });
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: ko('pictures.make_all') }));
    await waitFor(() => expect(image_indexes()).toHaveLength(STORY_PAGES + 1), { timeout: RETRY_WAIT_MS });
    const missing_count = STORY_PAGES + 1 - EXISTING_INDEXES.length;
    expect(make_image.generate_page_image).toHaveBeenCalledTimes(missing_count);
    expect(useSettings.getState().usage_count).toBe(missing_count);
    for (const index of EXISTING_INDEXES) {
      expect(useBook.getState().book?.pages[index]?.image?.data_url).toBe(existing_url);
    }
    expect(await screen.findByRole('button', { name: ko('pictures.make_all') })).toBeEnabled();
  });

  it('제한에 걸리면 안내가 보이고, 시간이 지난 뒤 다시 하기로 그림이 생긴다', async () => {
    const user = userEvent.setup();
    vi.mocked(make_image.generate_page_image).mockRejectedValueOnce(new ProviderError('rate', Date.now() + 1000));
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.ai.title')) }));
    expect(await screen.findByText(/조금 뒤에 다시 해 볼게요/)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: new RegExp(ko('error.retry')) });
    await waitFor(() => expect(retry).toBeEnabled(), { timeout: RETRY_WAIT_MS });
    await user.click(retry);
    await waitFor(() => expect(useBook.getState().book?.pages[0]?.image?.source).toBe('ai'));
  });

  it('차단되면 쉬운 안내 문구가 보인다', async () => {
    const user = userEvent.setup();
    vi.mocked(make_image.generate_page_image).mockRejectedValueOnce(new ProviderError('blocked'));
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.ai.title')) }));
    expect(await screen.findByText(ko('error.blocked'))).toBeInTheDocument();
    expect(image_indexes()).toEqual([]);
  });

  it('쪽을 바꾸면 안내와 오류가 지워진다', async () => {
    const user = userEvent.setup();
    useSettings.setState({ practice: false });
    render(<PicturesScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('pictures.ai.title')) }));
    expect(screen.getByText(ko('pictures.need_connect'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: new RegExp(`^${ko('common.page_n', { n: 1 })}`) }));
    expect(screen.queryByText(ko('pictures.need_connect'))).not.toBeInTheDocument();
  });

  it('그림 설명을 고치면 책에 반영된다', async () => {
    const user = userEvent.setup();
    render(<PicturesScreen />);
    const box = screen.getByLabelText(ko('pictures.desc_label'));
    await user.clear(box);
    await user.type(box, '새 설명');
    expect(useBook.getState().book?.pages[0]?.image_prompt).toBe('새 설명');
  });
});

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import type { Book, BookPage } from '../types';
import { CreditsPageView, PageView } from './PageView';

const SIZE = 400;
/** Outer size ratio with bleed (206 mm / 200 mm). */
const BLEED_RATIO = 206 / 200;
const BANNED_WORDS = ['DI Lab', '나만의 AI 동화책', 'My AI Storybook'];

function story_page(): BookPage {
  return build_demo_book('ko').pages[1]!;
}

/** Book whose page 1 has an AI-generated image. */
function with_ai_image(book: Book, model_name: string): Book {
  const pages = book.pages.map((page, index) =>
    index === 1 ? { ...page, image: { data_url: 'data:image/png;base64,AAAA', source: 'ai' as const, model_name } } : page,
  );
  return { ...book, pages };
}

afterEach(() => cleanup());

describe('PageView', () => {
  it('renders text and image alt', () => {
    const page = story_page();
    render(<PageView page={page} size={SIZE} image_alt="숲 그림" />);
    expect(screen.getByAltText('숲 그림')).toBeInTheDocument();
    expect(screen.getByText(page.text)).toBeInTheDocument();
  });

  it('outer size is size without bleed and size * 206/200 with bleed', () => {
    const page = story_page();
    const { container, rerender } = render(<PageView page={page} size={SIZE} />);
    const outer = () => container.querySelector<HTMLElement>('.book-page')!;
    expect(outer().style.width).toBe(`${SIZE}px`);
    rerender(<PageView page={page} size={SIZE} bleed />);
    expect(parseFloat(outer().style.width)).toBeCloseTo(SIZE * BLEED_RATIO);
    expect(parseFloat(outer().style.height)).toBeCloseTo(SIZE * BLEED_RATIO);
  });

  it('omits the text box when text is blank', () => {
    const { container } = render(<PageView page={{ ...story_page(), text: '   ' }} size={SIZE} />);
    expect(container.querySelector('.text-box')).toBeNull();
  });

  it('omits the text box when hide_text is set', () => {
    const page = story_page();
    const { container } = render(<PageView page={page} size={SIZE} hide_text />);
    expect(container.querySelector('.text-box')).toBeNull();
    expect(screen.queryByText(page.text)).toBeNull();
  });

  it('shows the placeholder when there is no image', () => {
    render(<PageView page={{ ...story_page(), image: null }} size={SIZE} placeholder="그림 자리" />);
    expect(screen.getByText('그림 자리')).toBeInTheDocument();
  });
});

describe('CreditsPageView', () => {
  it('has no ai-notice without AI images', () => {
    render(<CreditsPageView book={build_demo_book('ko')} size={SIZE} />);
    expect(screen.queryByTestId('ai-notice')).toBeNull();
    expect(screen.getByText(translate('ko', 'credits.heading'))).toBeInTheDocument();
  });

  it('shows the practice-image name for mock-image', () => {
    render(<CreditsPageView book={with_ai_image(build_demo_book('ko'), 'mock-image')} size={SIZE} />);
    expect(screen.getByTestId('ai-notice')).toHaveTextContent('그림 일부는 AI(연습용 그림)로 만들었습니다');
  });

  it('shows other model names as-is', () => {
    render(<CreditsPageView book={with_ai_image(build_demo_book('ko'), 'gemini-x')} size={SIZE} />);
    expect(screen.getByTestId('ai-notice')).toHaveTextContent('gemini-x');
  });

  it('uses English text for an English book', () => {
    render(<CreditsPageView book={with_ai_image(build_demo_book('en'), 'gemini-x')} size={SIZE} />);
    expect(screen.getByTestId('ai-notice')).toHaveTextContent(translate('en', 'credits.ai_notice', { name: 'gemini-x' }));
    expect(screen.getByText(translate('en', 'credits.heading'))).toBeInTheDocument();
    expect(screen.queryByText(translate('ko', 'credits.heading'))).toBeNull();
  });

  it('shows credits.author when an author is set', () => {
    render(<CreditsPageView book={{ ...build_demo_book('ko'), author: '민지' }} size={SIZE} />);
    expect(screen.getByText(translate('ko', 'credits.author', { author: '민지' }))).toBeInTheDocument();
  });

  it('omits the author line without an author', () => {
    render(<CreditsPageView book={build_demo_book('ko')} size={SIZE} />);
    expect(screen.queryByText(translate('ko', 'credits.author', { author: '' }))).toBeNull();
  });

  it('never contains DI Lab or the app name', () => {
    const books: Book[] = [
      build_demo_book('ko'),
      build_demo_book('en'),
      { ...with_ai_image(build_demo_book('ko'), 'mock-image'), author: '민지' },
      { ...with_ai_image(build_demo_book('en'), 'gemini-x'), author: 'Mina' },
    ];
    for (const book of books) {
      const { container, unmount } = render(<CreditsPageView book={book} size={SIZE} bleed />);
      for (const word of BANNED_WORDS) expect(container.textContent ?? '').not.toContain(word);
      unmount();
    }
  });
});

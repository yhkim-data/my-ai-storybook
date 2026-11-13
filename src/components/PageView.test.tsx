// 쪽 그리기 검사: 글·그림, 재단 여백 크기, 글상자 숨기기, 만든 사람 쪽의 AI 표시와 지은이.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import type { Book, BookPage } from '../types';
import { CreditsPageView, PageView } from './PageView';

const SIZE = 400;
/** 재단 여백을 넣은 바깥 크기 비율 (206mm / 200mm) */
const BLEED_RATIO = 206 / 200;
const BANNED_WORDS = ['DI Lab', '나만의 AI 동화책', 'My AI Storybook'];

/** 체험판 본문 쪽 하나 */
function story_page(): BookPage {
  return build_demo_book('ko').pages[1]!;
}

/** 지정한 쪽의 그림을 AI 그림으로 바꾼 책 */
function with_ai_image(book: Book, model_name: string): Book {
  const pages = book.pages.map((page, index) =>
    index === 1 ? { ...page, image: { data_url: 'data:image/png;base64,AAAA', source: 'ai' as const, model_name } } : page,
  );
  return { ...book, pages };
}

afterEach(() => cleanup());

describe('PageView', () => {
  it('글과 그림(alt)을 그린다', () => {
    const page = story_page();
    render(<PageView page={page} size={SIZE} image_alt="숲 그림" />);
    expect(screen.getByAltText('숲 그림')).toBeInTheDocument();
    expect(screen.getByText(page.text)).toBeInTheDocument();
  });

  it('bleed가 아니면 바깥 크기가 size이고, bleed면 size * 206/200이다', () => {
    const page = story_page();
    const { container, rerender } = render(<PageView page={page} size={SIZE} />);
    const outer = () => container.querySelector<HTMLElement>('.book-page')!;
    expect(outer().style.width).toBe(`${SIZE}px`);
    rerender(<PageView page={page} size={SIZE} bleed />);
    expect(parseFloat(outer().style.width)).toBeCloseTo(SIZE * BLEED_RATIO);
    expect(parseFloat(outer().style.height)).toBeCloseTo(SIZE * BLEED_RATIO);
  });

  it('글이 비면 글상자를 안 그린다', () => {
    const { container } = render(<PageView page={{ ...story_page(), text: '   ' }} size={SIZE} />);
    expect(container.querySelector('.text-box')).toBeNull();
  });

  it('hide_text면 글상자를 안 그린다', () => {
    const page = story_page();
    const { container } = render(<PageView page={page} size={SIZE} hide_text />);
    expect(container.querySelector('.text-box')).toBeNull();
    expect(screen.queryByText(page.text)).toBeNull();
  });

  it('그림이 없고 placeholder가 있으면 자리 표시를 보인다', () => {
    render(<PageView page={{ ...story_page(), image: null }} size={SIZE} placeholder="그림 자리" />);
    expect(screen.getByText('그림 자리')).toBeInTheDocument();
  });
});

describe('CreditsPageView', () => {
  it('AI 그림이 없으면 ai-notice가 없다', () => {
    render(<CreditsPageView book={build_demo_book('ko')} size={SIZE} />);
    expect(screen.queryByTestId('ai-notice')).toBeNull();
    expect(screen.getByText(translate('ko', 'credits.heading'))).toBeInTheDocument();
  });

  it('mock-image 그림이면 "연습용 그림" 문구가 보인다', () => {
    render(<CreditsPageView book={with_ai_image(build_demo_book('ko'), 'mock-image')} size={SIZE} />);
    expect(screen.getByTestId('ai-notice')).toHaveTextContent('그림 일부는 AI(연습용 그림)로 만들었습니다');
  });

  it('다른 AI 이름이면 그 이름이 보인다', () => {
    render(<CreditsPageView book={with_ai_image(build_demo_book('ko'), 'gemini-x')} size={SIZE} />);
    expect(screen.getByTestId('ai-notice')).toHaveTextContent('gemini-x');
  });

  it('영어 책이면 영어 문구다', () => {
    render(<CreditsPageView book={with_ai_image(build_demo_book('en'), 'gemini-x')} size={SIZE} />);
    expect(screen.getByTestId('ai-notice')).toHaveTextContent(translate('en', 'credits.ai_notice', { name: 'gemini-x' }));
    expect(screen.getByText(translate('en', 'credits.heading'))).toBeInTheDocument();
    expect(screen.queryByText(translate('ko', 'credits.heading'))).toBeNull();
  });

  it('지은이가 있으면 credits.author 문구가 보인다', () => {
    render(<CreditsPageView book={{ ...build_demo_book('ko'), author: '민지' }} size={SIZE} />);
    expect(screen.getByText(translate('ko', 'credits.author', { author: '민지' }))).toBeInTheDocument();
  });

  it('지은이가 없으면 지은이 줄이 없다', () => {
    render(<CreditsPageView book={build_demo_book('ko')} size={SIZE} />);
    expect(screen.queryByText(translate('ko', 'credits.author', { author: '' }))).toBeNull();
  });

  it('어떤 경우에도 DI Lab과 앱 이름 글자가 없다', () => {
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

// 책의 쪽 하나를 그린다. 꾸미기 화면, 넘겨보기, PDF 내보내기가 모두 이 부품을 쓴다.
import type { CSSProperties, ReactNode } from 'react';
import { BLEED_MM, FONTS, LAYOUT_IMAGE_RECT, PAGE_MM, PAGE_REF_SIZE } from '../constants';
import { translate } from '../i18n';
import { MOCK_IMAGE_MODEL } from '../providers/mock_image';
import { get_ai_model_names, get_book_title } from '../store/book_model';
import type { Book, BookPage, Rect, TextBox } from '../types';

const PERCENT = 100;
/** 글상자 안쪽 여백 (쪽 너비에 대한 비율) */
const BOX_PADDING_RATIO = 0.025;
/** 글상자와 그림의 둥근 모서리 (쪽 너비에 대한 비율) */
const BOX_RADIUS_RATIO = 0.02;
const BUBBLE_RADIUS_RATIO = 0.05;
const IMAGE_RADIUS_RATIO = 0.015;
/** 만든 사람 쪽의 글자 크기 (기준 쪽 너비에서의 px) */
const CREDITS_HEADING_SIZE = 30;
const CREDITS_TITLE_SIZE = 24;
const CREDITS_BODY_SIZE = 18;
const CREDITS_NOTICE_SIZE = 15;
const CREDITS_GAP_RATIO = 0.035;
const CREDITS_PADDING_RATIO = 0.12;
/** 그림 자리 표시 글자 크기 (기준 쪽 너비에서의 px) */
const PLACEHOLDER_FONT_SIZE = 16;

/**
 * 재단 여백을 넣었을 때 바깥 틀의 크기와 안쪽 쪽의 시작 위치를 계산한다.
 */
export function page_frame(size: number, bleed: boolean): { outer: number; offset: number } {
  if (!bleed) return { outer: size, offset: 0 };
  const offset = (size * BLEED_MM) / PAGE_MM;
  return { outer: size + offset * 2, offset };
}

/**
 * 퍼센트 사각형을 px 위치 모양으로 바꾼다.
 */
export function rect_style(rect: Rect, size: number): CSSProperties {
  return {
    left: (rect.x * size) / PERCENT,
    top: (rect.y * size) / PERCENT,
    width: (rect.w * size) / PERCENT,
    height: (rect.h * size) / PERCENT,
  };
}

/**
 * 글상자의 글꼴, 크기, 색, 정렬, 여백 모양을 만든다. 꾸미기 화면의 고치는 글상자도 같은 모양을 쓴다.
 */
export function text_box_style(box: TextBox, size: number): CSSProperties {
  const font = FONTS[box.font_id];
  return {
    // 손글씨 글꼴에 없는 글자는 또박또박 글씨로 대신 보인다.
    fontFamily: `'${font.css_family}', '${FONTS.plain.css_family}', sans-serif`,
    fontSize: (box.font_size * size) / PAGE_REF_SIZE,
    color: box.color,
    textAlign: box.align,
    padding: size * BOX_PADDING_RATIO,
    borderRadius: size * (box.background === 'bubble' ? BUBBLE_RADIUS_RATIO : BOX_RADIUS_RATIO),
  };
}

/**
 * 글상자 바탕에 맞는 클래스 이름을 돌려준다.
 */
export function text_box_class(box: TextBox): string {
  return box.background === 'none' ? 'text-box' : `text-box bg-${box.background}`;
}

interface PageViewProps {
  page: BookPage;
  /** 쪽 한 변의 길이(px). 재단 여백은 여기에 더해진다. */
  size: number;
  /** 인쇄용 재단 여백을 넣을지 */
  bleed?: boolean;
  /** 그림이 없을 때 자리 표시를 보여 줄지 (꾸미기 화면에서만) */
  placeholder?: string;
  /** 그림의 대체 문구 */
  image_alt?: string;
  /** 글상자를 그리지 않는다 (꾸미기 화면이 직접 그린다) */
  hide_text?: boolean;
  /** 쪽 위에 얹을 것 (꾸미기 화면의 고치는 글상자) */
  children?: ReactNode;
  class_name?: string;
}

/**
 * 쪽 하나를 그린다. 그림 자리는 배치에 따라, 글상자는 쪽에 저장된 자리에 놓인다.
 */
export function PageView({ page, size, bleed = false, placeholder, image_alt = '', hide_text = false, children, class_name = '' }: PageViewProps) {
  const { outer, offset } = page_frame(size, bleed);
  const image_rect = LAYOUT_IMAGE_RECT[page.layout];
  const is_full = page.layout === 'full';
  // 그림 가득 배치는 재단 여백까지 그림을 채운다.
  const image_style: CSSProperties = is_full
    ? { left: -offset, top: -offset, width: outer, height: outer }
    : { ...rect_style(image_rect, size), borderRadius: size * IMAGE_RADIUS_RATIO };

  return (
    <div className={`book-page ${class_name}`} style={{ width: outer, height: outer }} data-page-id={page.id}>
      <div className="page-inner" style={{ left: offset, top: offset, width: size, height: size }}>
        {page.image ? (
          <div className="page-image" style={image_style}>
            <img src={page.image.data_url} alt={image_alt} draggable={false} />
          </div>
        ) : (
          placeholder !== undefined && (
            <div className="page-image empty" style={{ ...image_style, fontSize: (PLACEHOLDER_FONT_SIZE * size) / PAGE_REF_SIZE }}>
              {placeholder}
            </div>
          )
        )}
        {!hide_text && page.text.trim().length > 0 && (
          <div className={text_box_class(page.text_box)} style={{ ...rect_style(page.text_box, size), ...text_box_style(page.text_box, size) }}>
            {page.text}
            {page.text_box.background === 'bubble' && <span className="bubble-tail" aria-hidden="true" />}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

interface CreditsPageViewProps {
  book: Book;
  size: number;
  bleed?: boolean;
  class_name?: string;
}

/**
 * 책 마지막의 "만든 사람" 쪽을 그린다. AI로 만든 그림이 있을 때만 AI 표시가 들어간다.
 * 도구 이름과 DI Lab 표기는 넣지 않는다. 책은 만든 사람의 것이다.
 */
export function CreditsPageView({ book, size, bleed = false, class_name = '' }: CreditsPageViewProps) {
  const { outer, offset } = page_frame(size, bleed);
  const scale = size / PAGE_REF_SIZE;
  const model_names = get_ai_model_names(book).map((name) =>
    name === MOCK_IMAGE_MODEL ? translate(book.lang, 'credits.practice_name') : name,
  );
  const author = book.author.trim();
  return (
    <div className={`book-page ${class_name}`} style={{ width: outer, height: outer }} data-page-id="credits">
      <div
        className="page-inner"
        style={{
          left: offset,
          top: offset,
          width: size,
          height: size,
          padding: size * CREDITS_PADDING_RATIO,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: size * CREDITS_GAP_RATIO,
          textAlign: 'center',
          color: '#17233A',
          fontFamily: "'Noto Sans KR', sans-serif",
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontFamily: "'Gowun Dodum', sans-serif", fontSize: CREDITS_HEADING_SIZE * scale }}>
          {translate(book.lang, 'credits.heading')}
        </div>
        <div style={{ fontSize: CREDITS_TITLE_SIZE * scale, fontWeight: 700 }}>{get_book_title(book)}</div>
        {author && <div style={{ fontSize: CREDITS_BODY_SIZE * scale }}>{translate(book.lang, 'credits.author', { author })}</div>}
        {model_names.length > 0 && (
          <div style={{ fontSize: CREDITS_NOTICE_SIZE * scale, color: '#4A5872' }} data-testid="ai-notice">
            {translate(book.lang, 'credits.ai_notice', { name: model_names.join(', ') })}
          </div>
        )}
      </div>
    </div>
  );
}

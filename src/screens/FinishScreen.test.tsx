// 완성 화면 검사: 넘겨보기, AI 표시, 지은이, 받기, 체험판.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import { export_image_zip, export_pdf } from '../export/export_book';
import { translate } from '../i18n';
import { download_blob } from '../storage/book_file';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import type { Book } from '../types';
import { FinishScreen } from './FinishScreen';

vi.mock('../export/export_book', () => ({
  export_pdf: vi.fn(),
  export_image_zip: vi.fn(),
}));
vi.mock('../storage/book_file', async (orig) => ({
  ...(await orig<typeof import('../storage/book_file')>()),
  download_blob: vi.fn(),
}));

/** 한국어 문구를 찾는다. */
const t = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);
/** 체험판 책의 전체 쪽 수(표지 + 8쪽 + 만든 사람) */
const TOTAL_PAGES = 10;
/** 진행 검사에서 쓰는 끝낸 쪽 수 */
const PROGRESS_DONE = 3;

/** 책과 체험판 여부를 저장소에 넣고 화면을 그린다. */
function setup(book: Book, is_demo = false) {
  useSettings.setState({ lang: 'ko' });
  useBook.setState({ book, is_demo, screen: 'finish' });
  return render(<FinishScreen />);
}

/** 다음 쪽 단추를 n번 누른다. */
function click_next(times: number) {
  for (let i = 0; i < times; i += 1) fireEvent.click(screen.getByRole('button', { name: t('finish.next_page') }));
}

describe('FinishScreen', () => {
  beforeEach(() => {
    vi.mocked(export_pdf).mockReset();
    vi.mocked(export_image_zip).mockReset();
    vi.mocked(download_blob).mockReset();
  });
  afterEach(() => cleanup());

  it('넘겨보기: 1 / 10에서 시작해 마지막에 만든 사람 쪽이 보인다', () => {
    setup(build_demo_book('ko'));
    expect(screen.getByText(`1 / ${TOTAL_PAGES}`)).toBeInTheDocument();
    click_next(TOTAL_PAGES - 1);
    expect(screen.getByText(`${TOTAL_PAGES} / ${TOTAL_PAGES}`)).toBeInTheDocument();
    expect(screen.getByText(t('credits.heading'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('finish.next_page') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('finish.prev_page') })).toBeEnabled();
  });

  it('화살표 키로 넘어간다', () => {
    setup(build_demo_book('ko'));
    const viewer = screen.getByRole('region', { name: t('finish.viewer_aria') });
    fireEvent.keyDown(viewer, { key: 'ArrowRight' });
    expect(screen.getByText(`2 / ${TOTAL_PAGES}`)).toBeInTheDocument();
    fireEvent.keyDown(viewer, { key: 'ArrowLeft' });
    expect(screen.getByText(`1 / ${TOTAL_PAGES}`)).toBeInTheDocument();
  });

  it('AI 표시: 직접 올린 그림만 있으면 없고, AI 그림이 있으면 보인다', () => {
    const book = build_demo_book('ko');
    const { unmount } = setup(book);
    click_next(TOTAL_PAGES - 1);
    expect(screen.queryByTestId('ai-notice')).toBeNull();
    unmount();

    const pages = book.pages.map((page, index) =>
      index === 1 && page.image
        ? { ...page, image: { data_url: page.image.data_url, source: 'ai' as const, model_name: 'mock-image' } }
        : page,
    );
    setup({ ...book, pages });
    click_next(TOTAL_PAGES - 1);
    expect(screen.getByTestId('ai-notice')).toHaveTextContent(t('credits.ai_notice', { name: t('credits.practice_name') }));
  });

  it('책 쪽 안에 DI Lab과 도구 이름이 없다', () => {
    setup(build_demo_book('ko'));
    for (let i = 0; i < TOTAL_PAGES; i += 1) {
      const text = document.querySelector('.book-page')?.textContent ?? '';
      expect(text).not.toContain('DI Lab');
      expect(text).not.toContain(t('app.name'));
      if (i < TOTAL_PAGES - 1) click_next(1);
    }
  });

  it('지은이를 쓰면 책이 바뀌고 만든 사람 쪽에 보인다. 체험판에는 칸이 없다', () => {
    const { unmount } = setup(build_demo_book('ko'));
    fireEvent.change(screen.getByLabelText(t('finish.author_label')), { target: { value: '토리' } });
    expect(useBook.getState().book?.author).toBe('토리');
    click_next(TOTAL_PAGES - 1);
    expect(screen.getByText(t('credits.author', { author: '토리' }))).toBeInTheDocument();
    unmount();
    setup(build_demo_book('ko'), true);
    expect(screen.queryByLabelText(t('finish.author_label'))).toBeNull();
  });

  it('PDF 받기: 이름이 .pdf로 끝나고 완료 문구가 보인다', async () => {
    vi.mocked(export_pdf).mockResolvedValue(new Blob(['x']));
    setup(build_demo_book('ko'));
    fireEvent.click(screen.getByTestId('download-pdf'));
    expect(await screen.findByText(t('finish.done'))).toBeInTheDocument();
    expect(vi.mocked(export_pdf).mock.calls[0]?.[1]).toBe(false);
    expect(vi.mocked(download_blob).mock.calls[0]?.[1]).toMatch(/\.pdf$/);
  });

  it('인쇄용은 print=true로 부르고, 그림 묶음은 zip 이름이다', async () => {
    vi.mocked(export_pdf).mockResolvedValue(new Blob(['x']));
    vi.mocked(export_image_zip).mockResolvedValue(new Blob(['x']));
    setup(build_demo_book('ko'));
    fireEvent.click(screen.getByTestId('download-print'));
    await waitFor(() => expect(download_blob).toHaveBeenCalledTimes(1));
    expect(vi.mocked(export_pdf).mock.calls[0]?.[1]).toBe(true);
    expect(vi.mocked(download_blob).mock.calls[0]?.[1]).toMatch(/-print\.pdf$/);
    fireEvent.click(screen.getByTestId('download-zip'));
    await waitFor(() => expect(download_blob).toHaveBeenCalledTimes(2));
    expect(vi.mocked(download_blob).mock.calls[1]?.[1]).toMatch(/-pages\.zip$/);
  });

  it('만드는 동안 단추가 잠기고 진행이 보인다', async () => {
    let finish: (blob: Blob) => void = () => undefined;
    vi.mocked(export_pdf).mockImplementation((_book, _print, on_progress) => {
      on_progress?.(PROGRESS_DONE, TOTAL_PAGES);
      return new Promise<Blob>((resolve) => {
        finish = resolve;
      });
    });
    setup(build_demo_book('ko'));
    fireEvent.click(screen.getByTestId('download-pdf'));
    expect(screen.getByTestId('download-zip')).toBeDisabled();
    expect(await screen.findByText(t('finish.working', { n: PROGRESS_DONE, total: TOTAL_PAGES }))).toBeInTheDocument();
    await act(async () => finish(new Blob(['x'])));
    expect(screen.getByTestId('download-zip')).toBeEnabled();
  });

  it('만들다 실패하면 오류 문구를 보여 준다', async () => {
    vi.mocked(export_pdf).mockRejectedValue(new Error('fail'));
    setup(build_demo_book('ko'));
    fireEvent.click(screen.getByTestId('download-pdf'));
    expect(await screen.findByRole('alert')).toHaveTextContent(t('finish.error'));
    expect(download_blob).not.toHaveBeenCalled();
  });

  it('작업 파일은 .storybook.json 이름으로 받는다', async () => {
    setup(build_demo_book('ko'));
    fireEvent.click(screen.getByTestId('download-file'));
    expect(await screen.findByText(t('finish.done'))).toBeInTheDocument();
    expect(vi.mocked(download_blob).mock.calls[0]?.[1]).toMatch(/\.storybook\.json$/);
  });

  it('체험판: 안내가 보이고 시작 단추로 시작 화면에 돌아간다', () => {
    setup(build_demo_book('ko'), true);
    const notice = screen.getByText(t('finish.demo_badge')).closest('.notice') as HTMLElement;
    fireEvent.click(within(notice).getByRole('button', { name: t('finish.demo_start') }));
    expect(useBook.getState().screen).toBe('start');
  });
});

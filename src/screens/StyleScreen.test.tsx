// 5단계 그림체 화면 검사: 6개가 보이고, 누르면 고른 그림체가 바뀐다.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STYLE_IDS } from '../constants';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { StyleScreen } from './StyleScreen';

/** 한국어 문구 */
const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);

beforeEach(() => {
  useSettings.setState({ lang: 'ko', practice: false, text_key: '', image_key: '' });
  useBook.setState({ book: build_demo_book('ko'), is_demo: false, screen: 'style', current_page: 0 });
});

afterEach(() => cleanup());

describe('StyleScreen', () => {
  it('그림체 6개가 보이고 그림마다 대체 문구가 있다', () => {
    render(<StyleScreen />);
    expect(screen.getByRole('heading', { level: 1, name: ko('style.heading') })).toBeInTheDocument();
    for (const style_id of STYLE_IDS) {
      const name = ko(`style.name.${style_id}`);
      expect(screen.getByRole('img', { name: ko('style.sample_alt', { name }) })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button', { pressed: false }).length + screen.getAllByRole('button', { pressed: true }).length).toBe(
      STYLE_IDS.length,
    );
  });

  it('누르면 book.style_id가 바뀌고 선택 표시가 옮겨 간다', async () => {
    const user = userEvent.setup();
    render(<StyleScreen />);
    const first_name = ko(`style.name.${useBook.getState().book?.style_id ?? 'watercolor'}`);
    expect(screen.getByRole('button', { name: new RegExp(first_name) })).toHaveAttribute('aria-pressed', 'true');

    const crayon = screen.getByRole('button', { name: new RegExp(ko('style.name.crayon')) });
    await user.click(crayon);
    expect(useBook.getState().book?.style_id).toBe('crayon');
    expect(crayon).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
  });

  it('이전과 다음 단추가 화면을 옮긴다', async () => {
    const user = userEvent.setup();
    render(<StyleScreen />);
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(useBook.getState().screen).toBe('pictures');
  });
});

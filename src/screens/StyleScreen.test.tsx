// Step 5 style screen tests.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STYLE_IDS } from '../constants';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { StyleScreen } from './StyleScreen';

const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);

beforeEach(() => {
  useSettings.setState({ lang: 'ko', practice: false, text_key: '', image_key: '' });
  useBook.setState({ book: build_demo_book('ko'), is_demo: false, screen: 'style', current_page: 0 });
});

afterEach(() => cleanup());

describe('StyleScreen', () => {
  it('shows six styles, each sample with alt text', () => {
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

  it('clicking changes book.style_id and moves the selection', async () => {
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

  it('next button moves to the next screen', async () => {
    const user = userEvent.setup();
    render(<StyleScreen />);
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(useBook.getState().screen).toBe('pictures');
  });
});

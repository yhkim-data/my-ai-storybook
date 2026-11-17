// Step 5 style screen tests.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CUSTOM_STYLE_MAX_LENGTH, STYLE_IDS } from '../constants';
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
    // Six style cards plus the "my own style" card.
    expect(screen.getAllByRole('button', { pressed: false }).length + screen.getAllByRole('button', { pressed: true }).length).toBe(
      STYLE_IDS.length + 1,
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

  it('typing a style description picks "my own style"; another style keeps the words', async () => {
    const user = userEvent.setup();
    render(<StyleScreen />);
    const input = screen.getByLabelText(ko('style.custom.label'));
    fireEvent.change(input, { target: { value: '크레파스로 칠한 듯\n따뜻한 느낌' } });
    expect(useBook.getState().book?.style_id).toBe('custom');
    // Line breaks become spaces.
    expect(useBook.getState().book?.custom_style).toBe('크레파스로 칠한 듯 따뜻한 느낌');
    expect(screen.getByRole('button', { name: new RegExp(ko('style.custom.title')) })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: new RegExp(ko('style.name.pencil')) }));
    expect(useBook.getState().book?.style_id).toBe('pencil');
    expect(screen.getByLabelText(ko('style.custom.label'))).toHaveValue('크레파스로 칠한 듯 따뜻한 느낌');
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
  });

  it('"my own style" with no words blocks next and asks for a description', async () => {
    const user = userEvent.setup();
    render(<StyleScreen />);
    await user.click(screen.getByRole('button', { name: new RegExp(ko('style.custom.title')) }));
    expect(useBook.getState().book?.style_id).toBe('custom');
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(useBook.getState().screen).toBe('style');
    expect(screen.getByRole('alert')).toHaveTextContent(ko('style.need_custom'));

    fireEvent.change(screen.getByLabelText(ko('style.custom.label')), { target: { value: '파스텔 색' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(useBook.getState().screen).toBe('pictures');
  });

  it('the description is limited to 200 characters', () => {
    render(<StyleScreen />);
    fireEvent.change(screen.getByLabelText(ko('style.custom.label')), { target: { value: '가'.repeat(250) } });
    expect(useBook.getState().book?.custom_style).toHaveLength(CUSTOM_STYLE_MAX_LENGTH);
  });
});

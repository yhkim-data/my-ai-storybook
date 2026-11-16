// Start screen tests: cards, language toggle, demo, new book, confirm dialog, bad file.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { StartScreen } from './StartScreen';

const ko = (key: string) => translate('ko', key);

beforeEach(() => {
  useSettings.setState({ lang: 'ko', practice: false, text_key: '', image_key: '' });
  useBook.setState({ screen: 'start', book: null, is_demo: false, has_saved_book: false });
});
afterEach(() => cleanup());

describe('StartScreen', () => {
  it('shows the title, three cards, DI Lab and the maker footer', () => {
    render(<StartScreen />);
    expect(screen.getByRole('heading', { level: 1, name: ko('start.title') })).toBeInTheDocument();
    expect(screen.getByText(ko('start.new.title'))).toBeInTheDocument();
    expect(screen.getByText(ko('start.resume.title'))).toBeInTheDocument();
    expect(screen.getByText(ko('start.demo.title'))).toBeInTheDocument();
    expect(screen.getAllByText('DI Lab').length).toBeGreaterThan(0);
    expect(screen.getByText(new RegExp(ko('common.made_by')))).toBeInTheDocument();
  });

  it('language button switches to English', async () => {
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: ko('common.lang_toggle_aria') }));
    expect(screen.getByRole('heading', { level: 1, name: translate('en', 'start.title') })).toBeInTheDocument();
    expect(useSettings.getState().lang).toBe('en');
  });

  it('resume is disabled when there is no saved book', () => {
    render(<StartScreen />);
    const resume = screen.getByRole('button', { name: new RegExp(ko('start.resume.title')) });
    expect(resume).toBeDisabled();
    expect(screen.getByText(ko('start.resume.none'))).toBeInTheDocument();
  });

  it('demo button opens the demo book', async () => {
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ko('start.demo.title')) }));
    expect(useBook.getState().is_demo).toBe(true);
    expect(useBook.getState().screen).toBe('finish');
  });

  it('new book goes to the seed screen', async () => {
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ko('start.new.title')) }));
    expect(useBook.getState().screen).toBe('seed');
  });

  it('with a book in progress shows a confirm dialog that Esc closes', async () => {
    useBook.setState({ has_saved_book: true });
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ko('start.new.title')) }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(ko('start.replace.body'))).toBeInTheDocument();
    expect(useBook.getState().screen).toBe('start');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('confirming in the dialog goes to the seed screen', async () => {
    useBook.setState({ has_saved_book: true });
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ko('start.new.title')) }));
    await userEvent.click(screen.getByRole('button', { name: ko('start.replace.confirm') }));
    await waitFor(() => expect(useBook.getState().screen).toBe('seed'));
  });

  it('shows a notice for an invalid file', async () => {
    render(<StartScreen />);
    const file = new File(['이건 책 파일이 아니에요'], 'bad.json', { type: 'application/json' });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(ko('start.load_error'));
    expect(useBook.getState().book).toBeNull();
  });

  it('rights link opens the side screen', async () => {
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: ko('start.rights_link') }));
    expect(useBook.getState().screen).toBe('rights');
    expect(useBook.getState().return_screen).toBe('start');
  });
});

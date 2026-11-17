// Away timer, "clear keys and finish", deleting the book, and the "enter your key again" window.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import * as db from '../storage/db';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { EndSessionButton, IdleGuard, KeyPromptDialog, ask_key_again } from './KeySafety';

vi.mock('../storage/db', async (orig) => ({ ...(await orig<typeof import('../storage/db')>()), delete_current_book: vi.fn(async () => undefined) }));
vi.mock('../storage/autosave', () => ({ flush_autosave: vi.fn(async () => undefined), start_autosave: vi.fn() }));

const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);
const TEST_KEY = 'test-key-0000';
const MINUTE_MS = 60_000;

beforeEach(() => {
  localStorage.clear();
  useSettings.setState({ lang: 'ko', practice: false, connections: [], text_connection: null, image_connection: null, text_key: '', image_key: '', idle_minutes: 20 });
  useBook.setState({ book: build_demo_book('ko'), screen: 'editor', has_saved_book: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.mocked(db.delete_current_book).mockClear();
});

describe('away timer', () => {
  it('warns a minute before, "keep using" starts over, and the keys go after the set minutes', () => {
    vi.useFakeTimers();
    useSettings.getState().connect_key(TEST_KEY, 'text');
    render(<IdleGuard />);
    act(() => vi.advanceTimersByTime(18 * MINUTE_MS));
    expect(screen.queryByText(ko('idle.warning'))).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(MINUTE_MS + 1000));
    expect(screen.getByText(ko('idle.warning'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: ko('idle.keep') }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText(ko('idle.warning'))).not.toBeInTheDocument();
    expect(useSettings.getState().text_key).toBe(TEST_KEY);
    act(() => vi.advanceTimersByTime(20 * MINUTE_MS + 1000));
    expect(useSettings.getState().text_key).toBe('');
    expect(screen.getByText(ko('idle.cleared'))).toBeInTheDocument();
  });

  it('follows the minutes from the settings', () => {
    vi.useFakeTimers();
    useSettings.setState({ idle_minutes: 5 });
    useSettings.getState().connect_key(TEST_KEY, 'text');
    render(<IdleGuard />);
    act(() => vi.advanceTimersByTime(5 * MINUTE_MS + 1000));
    expect(useSettings.getState().text_key).toBe('');
  });
});

describe('clear keys and finish', () => {
  it('clears the keys and goes home; the book stays unless the box is ticked', async () => {
    useSettings.getState().connect_key(TEST_KEY, 'text');
    render(<EndSessionButton />);
    fireEvent.click(screen.getByRole('button', { name: ko('end.button') }));
    expect(screen.getByRole('checkbox', { name: ko('end.delete_book') })).not.toBeChecked();
    expect(screen.getByText(ko('end.save_hint'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: ko('end.confirm') }));
    await waitFor(() => expect(useBook.getState().screen).toBe('start'));
    expect(useSettings.getState().text_key).toBe('');
    expect(db.delete_current_book).not.toHaveBeenCalled();
    expect(useBook.getState().has_saved_book).toBe(true);
  });

  it('with the box ticked, the book on this computer is deleted too', async () => {
    render(<EndSessionButton />);
    fireEvent.click(screen.getByRole('button', { name: ko('end.button') }));
    fireEvent.click(screen.getByRole('checkbox', { name: ko('end.delete_book') }));
    fireEvent.click(screen.getByRole('button', { name: ko('end.confirm') }));
    await waitFor(() => expect(db.delete_current_book).toHaveBeenCalledTimes(1));
    expect(useBook.getState().has_saved_book).toBe(false);
  });
});

describe('enter your key again', () => {
  it('opens only when a remembered connection lost its key, and connects it again', async () => {
    expect(ask_key_again()).toBe(false);
    useSettings.getState().connect_key(TEST_KEY, 'text');
    useSettings.getState().clear_keys();
    useSettings.setState({ practice: false });
    render(<KeyPromptDialog />);
    act(() => {
      expect(ask_key_again()).toBe(true);
    });
    const dialog = screen.getByRole('dialog', { name: ko('key_prompt.title') });
    expect(dialog).toHaveTextContent(ko('key_prompt.body'));
    fireEvent.change(screen.getByLabelText(ko('connect.key_label')), { target: { value: TEST_KEY } });
    fireEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    expect(await screen.findByText(ko('connect.own_key_need'))).toBeInTheDocument();
    // With practice off, the fake check goes to the network; practice makes the check pass without a request.
    useSettings.setState({ practice: true });
    fireEvent.click(screen.getByRole('checkbox', { name: ko('connect.own_key') }));
    fireEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    await waitFor(() => expect(useSettings.getState().text_key).toBe(TEST_KEY));
    expect(useSettings.getState().key_prompt_open).toBe(false);
    expect(useBook.getState().book).not.toBeNull();
  });
});

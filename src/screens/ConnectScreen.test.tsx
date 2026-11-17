// Connect screen tests in practice mode.
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import { PROVIDER_INFO } from '../providers/provider_kinds';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { ConnectScreen } from './ConnectScreen';

const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);
/** Fake key for tests, not a real key. */
const FAKE_KEY = 'FAKE-KEY-for-test-ABCD1234';
const FAKE_TAIL = '1234';
/** Keys of unknown shape are treated as Gemini. */
const FAKE_NAME = 'Google Gemini';
/** Fake keys shaped like other providers' keys, not real keys. */
const CLAUDE_FAKE_KEY = 'sk-ant-' + 'test-fake-A1b2';
const OPENAI_FAKE_KEY = 'sk-' + 'test-fake-A1b2';

/** Ticks "this is my own key" (needed before any check). */
async function tick_own_key() {
  await userEvent.click(screen.getByRole('checkbox', { name: ko('connect.own_key') }));
}

/** Connects a key the way the screen does (memory only). */
function connect(key: string) {
  useSettings.getState().connect_key(key, 'text');
  useSettings.setState({ practice: true });
}

beforeEach(() => {
  localStorage.clear();
  useSettings.setState({ lang: 'ko', practice: true, connections: [], text_connection: null, image_connection: null, text_key: '', image_key: '' });
  useBook.setState({ screen: 'connect', return_screen: 'seed' });
});
afterEach(() => cleanup());

describe('ConnectScreen', () => {
  it('asks for the "my own key" tick before checking', async () => {
    render(<ConnectScreen />);
    await userEvent.type(screen.getByLabelText(ko('connect.key_label')), FAKE_KEY);
    await userEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    expect(screen.getByRole('alert')).toHaveTextContent(ko('connect.own_key_need'));
    expect(useSettings.getState().text_key).toBe('');
  });

  it('shows an empty-input notice when checking an empty field', async () => {
    render(<ConnectScreen />);
    await tick_own_key();
    await userEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    expect(screen.getByRole('alert')).toHaveTextContent(ko('connect.empty'));
    expect(useSettings.getState().text_key).toBe('');
  });

  it('shows only the last 4 characters after a check and never the full key', async () => {
    render(<ConnectScreen />);
    await tick_own_key();
    await userEvent.type(screen.getByLabelText(ko('connect.key_label')), FAKE_KEY);
    await userEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    await waitFor(() => expect(screen.getByText(ko('connect.ok', { name: FAKE_NAME, tail: FAKE_TAIL }))).toBeInTheDocument());
    expect(useSettings.getState().text_key).toBe(FAKE_KEY);
    expect(document.body.textContent).not.toContain(FAKE_KEY);
    document.querySelectorAll('input').forEach((input) => expect(input.value).not.toContain(FAKE_KEY));
  });

  it('checks the key on Enter', async () => {
    render(<ConnectScreen />);
    await tick_own_key();
    await userEvent.type(screen.getByLabelText(ko('connect.key_label')), `${FAKE_KEY}{Enter}`);
    await waitFor(() => expect(useSettings.getState().text_key).toBe(FAKE_KEY));
  });

  it('shows only the tail of a connected key', () => {
    connect(FAKE_KEY);
    render(<ConnectScreen />);
    expect(screen.getByText(ko('connect.saved_tail', { name: FAKE_NAME, tail: FAKE_TAIL }))).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(FAKE_KEY);
  });

  it('clears the keys and shows a notice', async () => {
    connect(FAKE_KEY);
    render(<ConnectScreen />);
    await userEvent.click(screen.getByRole('button', { name: ko('connect.clear') }));
    expect(useSettings.getState().text_key).toBe('');
    expect(useSettings.getState().image_key).toBe('');
    expect(screen.getByText(ko('connect.cleared'))).toBeInTheDocument();
    expect(screen.queryByText(ko('connect.saved_tail', { name: FAKE_NAME, tail: FAKE_TAIL }))).toBeNull();
  });

  it('skip returns to the previous screen', async () => {
    render(<ConnectScreen />);
    await userEvent.click(screen.getByRole('button', { name: ko('connect.skip') }));
    expect(useBook.getState().screen).toBe('seed');
  });

  it('shows the age notice and today\'s usage count', () => {
    useSettings.setState({ usage_count: 3 });
    render(<ConnectScreen />);
    expect(screen.getByText(ko('connect.age_line'))).toBeInTheDocument();
    expect(screen.getByTestId('usage-line')).toHaveTextContent(ko('connect.usage', { n: 3 }));
  });

  it('changes and resets the model in advanced settings once a key is connected', async () => {
    connect(FAKE_KEY);
    render(<ConnectScreen />);
    await userEvent.click(screen.getByText(ko('connect.details')));
    await userEvent.selectOptions(screen.getByLabelText(ko('connect.text_kind_label')), 'gemini-3.8-flash');
    expect(useSettings.getState().text_model).toBe('gemini-3.8-flash');
    await userEvent.click(screen.getByRole('button', { name: ko('connect.kind_reset') }));
    expect(useSettings.getState().text_model).toBe('gemini-3.5-flash-lite');
  });

  it('a Claude key shows the no-image notice and Claude text models', async () => {
    render(<ConnectScreen />);
    await tick_own_key();
    await userEvent.type(screen.getByLabelText(ko('connect.key_label')), CLAUDE_FAKE_KEY);
    await userEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    await waitFor(() => expect(screen.getByText(ko('connect.no_image'))).toBeInTheDocument());
    expect(useSettings.getState().text_key).toBe(CLAUDE_FAKE_KEY);
    const options = Array.from(document.querySelectorAll<HTMLOptionElement>('#text-model-select option')).map((option) => option.value);
    expect(options).toEqual(PROVIDER_INFO.claude.text_choices);
    expect(document.querySelector('#image-model-select')).toBeNull();
  });

  it('an OpenAI key shows OpenAI image models and no no-image notice', () => {
    connect(OPENAI_FAKE_KEY);
    render(<ConnectScreen />);
    expect(screen.queryByText(ko('connect.no_image'))).toBeNull();
    const options = Array.from(document.querySelectorAll<HTMLOptionElement>('#image-model-select option')).map((option) => option.value);
    expect(options).toEqual(PROVIDER_INFO.openai.image_choices);
  });

  it('warns and does not save a Claude key in the image key field', async () => {
    render(<ConnectScreen />);
    await tick_own_key();
    await userEvent.click(screen.getByText(ko('connect.details')));
    await userEvent.type(screen.getByLabelText(ko('connect.image_key_label')), CLAUDE_FAKE_KEY);
    await userEvent.click(screen.getByRole('button', { name: ko('connect.image_key_save') }));
    expect(screen.getByRole('alert')).toHaveTextContent(ko('connect.image_key_claude'));
    expect(useSettings.getState().image_key).toBe('');
  });

  it('a checked key is kept in memory only, never in web storage', async () => {
    render(<ConnectScreen />);
    await tick_own_key();
    await userEvent.type(screen.getByLabelText(ko('connect.key_label')), `${FAKE_KEY}{Enter}`);
    await waitFor(() => expect(useSettings.getState().text_key).toBe(FAKE_KEY));
    for (const storage of [localStorage, sessionStorage]) {
      for (let index = 0; index < storage.length; index += 1) expect(storage.getItem(storage.key(index) ?? '')).not.toContain(FAKE_KEY);
    }
  });
});

// Connect screen failure tests with a mocked provider.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { ConnectScreen } from './ConnectScreen';

/** Failure reason the fake provider returns; tests change it per case. */
const fake = vi.hoisted(() => ({ reason: 'bad_key' }));

vi.mock('../providers/index', () => ({
  create_text_provider_for_key: () => ({
    id: 'fake',
    testConnection: () => Promise.resolve({ ok: false, reason: fake.reason }),
  }),
}));

const ko = (key: string) => translate('ko', key);

beforeEach(() => {
  fake.reason = 'bad_key';
  useSettings.setState({ lang: 'ko', practice: true, connections: [], text_connection: null, image_connection: null, text_key: '', image_key: '' });
  useBook.setState({ screen: 'connect', return_screen: 'start' });
});
afterEach(() => cleanup());

describe('ConnectScreen failures', () => {
  it('shows a notice and does not save a wrong key', async () => {
    render(<ConnectScreen />);
    await userEvent.click(screen.getByRole('checkbox', { name: ko('connect.own_key') }));
    await userEvent.type(screen.getByLabelText(ko('connect.key_label')), 'FAKE-BAD-KEY');
    await userEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    expect(await screen.findByText(ko('connect.bad_key'))).toBeInTheDocument();
    expect(useSettings.getState().text_key).toBe('');
  });

  it('shows the browser-blocked notice instead of the wrong-key notice when the org disables browser use', async () => {
    fake.reason = 'browser_blocked';
    render(<ConnectScreen />);
    await userEvent.click(screen.getByRole('checkbox', { name: ko('connect.own_key') }));
    await userEvent.type(screen.getByLabelText(ko('connect.key_label')), 'FAKE-ORG-KEY');
    await userEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    expect(await screen.findByText(ko('connect.browser_blocked'))).toBeInTheDocument();
    expect(screen.queryByText(ko('connect.bad_key'))).not.toBeInTheDocument();
    expect(useSettings.getState().text_key).toBe('');
  });
});

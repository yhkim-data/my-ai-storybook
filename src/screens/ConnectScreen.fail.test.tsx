// 연결 화면 실패 검사: 연결부가 틀린 키라고 답하면 안내를 보이고 키를 저장하지 않는다.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { ConnectScreen } from './ConnectScreen';

vi.mock('../providers/index', () => ({
  create_text_provider_for_key: () => ({
    id: 'fake',
    testConnection: () => Promise.resolve({ ok: false, reason: 'bad_key' }),
  }),
}));

const ko = (key: string) => translate('ko', key);

beforeEach(() => {
  useSettings.setState({ lang: 'ko', practice: true, text_key: '', image_key: '' });
  useBook.setState({ screen: 'connect', return_screen: 'start' });
});
afterEach(() => cleanup());

describe('ConnectScreen 실패', () => {
  it('틀린 키면 안내가 뜨고 저장하지 않는다', async () => {
    render(<ConnectScreen />);
    await userEvent.type(screen.getByLabelText(ko('connect.key_label')), 'FAKE-BAD-KEY');
    await userEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    expect(await screen.findByText(ko('connect.bad_key'))).toBeInTheDocument();
    expect(useSettings.getState().text_key).toBe('');
  });
});

// 연결 화면 실패 검사: 연결부가 틀린 키나 브라우저 사용 꺼짐이라고 답하면 맞는 안내를 보이고 키를 저장하지 않는다.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { ConnectScreen } from './ConnectScreen';

/** 가짜 연결부가 답할 실패 이유. 검사마다 바꾼다. */
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

  it('조직 설정에서 브라우저 사용이 꺼져 있으면 "키가 맞지 않아요" 대신 그 안내가 뜬다', async () => {
    fake.reason = 'browser_blocked';
    render(<ConnectScreen />);
    await userEvent.type(screen.getByLabelText(ko('connect.key_label')), 'FAKE-ORG-KEY');
    await userEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    expect(await screen.findByText(ko('connect.browser_blocked'))).toBeInTheDocument();
    expect(screen.queryByText(ko('connect.bad_key'))).not.toBeInTheDocument();
    expect(useSettings.getState().text_key).toBe('');
  });
});

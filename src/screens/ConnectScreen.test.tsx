// 연결 화면 검사 (연습 모드): 빈 칸, 성공, 키 가림, 지우기, 건너뛰기.
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { ConnectScreen } from './ConnectScreen';

const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);
/** 검사용 가짜 키. 실제 키가 아니다. */
const FAKE_KEY = 'FAKE-KEY-for-test-ABCD1234';
/** 가짜 키의 끝 4자리 */
const FAKE_TAIL = '1234';

beforeEach(() => {
  useSettings.setState({ lang: 'ko', practice: true, text_key: '', image_key: '' });
  useBook.setState({ screen: 'connect', return_screen: 'seed' });
});
afterEach(() => cleanup());

describe('ConnectScreen', () => {
  it('빈 칸으로 확인하면 비었다는 안내가 뜬다', async () => {
    render(<ConnectScreen />);
    await userEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    expect(screen.getByRole('alert')).toHaveTextContent(ko('connect.empty'));
    expect(useSettings.getState().text_key).toBe('');
  });

  it('키를 넣고 확인하면 끝 4자리만 보이고 키 전체는 어디에도 없다', async () => {
    render(<ConnectScreen />);
    await userEvent.type(screen.getByLabelText(ko('connect.key_label')), FAKE_KEY);
    await userEvent.click(screen.getByRole('button', { name: ko('connect.check') }));
    await waitFor(() => expect(screen.getByText(ko('connect.ok', { tail: FAKE_TAIL }))).toBeInTheDocument());
    expect(useSettings.getState().text_key).toBe(FAKE_KEY);
    expect(document.body.textContent).not.toContain(FAKE_KEY);
    document.querySelectorAll('input').forEach((input) => expect(input.value).not.toContain(FAKE_KEY));
  });

  it('Enter를 눌러도 확인한다', async () => {
    render(<ConnectScreen />);
    await userEvent.type(screen.getByLabelText(ko('connect.key_label')), `${FAKE_KEY}{Enter}`);
    await waitFor(() => expect(useSettings.getState().text_key).toBe(FAKE_KEY));
  });

  it('저장된 키가 있으면 끝자리만 보여 준다', () => {
    useSettings.setState({ text_key: FAKE_KEY });
    render(<ConnectScreen />);
    expect(screen.getByText(ko('connect.saved_tail', { tail: FAKE_TAIL }))).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(FAKE_KEY);
  });

  it('키 지우기를 누르면 키가 지워지고 안내가 뜬다', async () => {
    useSettings.setState({ text_key: FAKE_KEY, image_key: FAKE_KEY });
    render(<ConnectScreen />);
    await userEvent.click(screen.getByRole('button', { name: ko('connect.clear') }));
    expect(useSettings.getState().text_key).toBe('');
    expect(useSettings.getState().image_key).toBe('');
    expect(screen.getByText(ko('connect.cleared'))).toBeInTheDocument();
    expect(screen.queryByText(ko('connect.saved_tail', { tail: FAKE_TAIL }))).toBeNull();
  });

  it('건너뛰기를 누르면 돌아갈 화면으로 간다', async () => {
    render(<ConnectScreen />);
    await userEvent.click(screen.getByRole('button', { name: ko('connect.skip') }));
    expect(useBook.getState().screen).toBe('seed');
  });

  it('나이 조건 안내와 오늘 쓴 횟수가 보인다', () => {
    useSettings.setState({ usage_count: 3 });
    render(<ConnectScreen />);
    expect(screen.getByText(ko('connect.age_line'))).toBeInTheDocument();
    expect(screen.getByTestId('usage-line')).toHaveTextContent(ko('connect.usage', { n: 3 }));
  });

  it('자세한 설정에서 AI 종류를 바꾸고 되돌린다', async () => {
    render(<ConnectScreen />);
    await userEvent.click(screen.getByText(ko('connect.details')));
    await userEvent.selectOptions(screen.getByLabelText(ko('connect.text_kind_label')), 'gemini-3.8-flash');
    expect(useSettings.getState().text_model).toBe('gemini-3.8-flash');
    await userEvent.click(screen.getByRole('button', { name: ko('connect.kind_reset') }));
    expect(useSettings.getState().text_model).toBe('gemini-3.5-flash-lite');
  });
});

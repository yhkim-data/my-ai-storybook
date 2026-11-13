// 권리 안내 화면 검사: 한국어·영어 문장이 함께 보인다.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { RightsScreen } from './RightsScreen';

beforeEach(() => {
  useSettings.setState({ lang: 'ko' });
  useBook.setState({ screen: 'rights', return_screen: 'start' });
});
afterEach(() => cleanup());

describe('RightsScreen', () => {
  it('한국어와 영어 권리 문장이 둘 다 보인다', () => {
    render(<RightsScreen />);
    expect(screen.getByText(translate('ko', 'rights.statement.ko'))).toBeInTheDocument();
    expect(screen.getByText(translate('en', 'rights.statement.en'))).toBeInTheDocument();
  });

  it('화면 언어가 영어여도 두 문장이 보이고 안내 문서 주소가 영어판이다', () => {
    useSettings.setState({ lang: 'en' });
    render(<RightsScreen />);
    expect(screen.getByText(translate('ko', 'rights.statement.ko'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: translate('en', 'rights.more') })).toHaveAttribute('href', expect.stringContaining('rights.en.md'));
  });

  it('처음으로를 누르면 돌아간다', async () => {
    render(<RightsScreen />);
    await userEvent.click(screen.getByRole('button', { name: translate('ko', 'common.home') }));
    expect(useBook.getState().screen).toBe('start');
  });
});

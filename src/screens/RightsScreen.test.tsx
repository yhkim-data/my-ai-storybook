// Rights screen tests: Korean and English statements are both shown.
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
  it('shows the seven terms with the effective date and links the full terms in the screen language', () => {
    render(<RightsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: translate('ko', 'rights.title') })).toBeInTheDocument();
    expect(screen.getByText(translate('ko', 'terms.effective'))).toBeInTheDocument();
    const items = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7].map((n) => translate('ko', `terms.item${n}`)));
    expect(screen.getByRole('link', { name: translate('ko', 'terms.more') })).toHaveAttribute(
      'href',
      'https://github.com/yhkim-data/my-ai-storybook/blob/main/docs/terms.ko.md',
    );
  });

  it('shows both the Korean and English rights statements', () => {
    render(<RightsScreen />);
    expect(screen.getByText(translate('ko', 'rights.statement.ko'))).toBeInTheDocument();
    expect(screen.getByText(translate('en', 'rights.statement.en'))).toBeInTheDocument();
  });

  it('in English UI both statements show and the doc link is the English one', () => {
    useSettings.setState({ lang: 'en' });
    render(<RightsScreen />);
    expect(screen.getByText(translate('ko', 'rights.statement.ko'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: translate('en', 'rights.more') })).toHaveAttribute('href', expect.stringContaining('rights.en.md'));
  });

  it('home button goes back', async () => {
    render(<RightsScreen />);
    await userEvent.click(screen.getByRole('button', { name: translate('ko', 'common.home') }));
    expect(useBook.getState().screen).toBe('start');
  });
});

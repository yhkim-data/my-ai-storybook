// Step 2 story seed screen tests.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import { create_book } from '../store/book_model';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { SeedScreen } from './SeedScreen';

const ko = (key: string) => translate('ko', key);

function prepare_store(): void {
  useSettings.setState({ lang: 'ko', practice: true });
  useBook.setState({ book: create_book('ko'), screen: 'seed' });
}

function current_seed() {
  const book = useBook.getState().book;
  if (!book) throw new Error('책이 없어요');
  return book.seed;
}

describe('SeedScreen', () => {
  beforeEach(prepare_store);
  afterEach(cleanup);

  it('age and page count chips update the seed in the store', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    await user.click(screen.getByRole('button', { name: ko('seed.age.5-7') }));
    expect(current_seed().age_band).toBe('5-7');
    expect(screen.getByRole('button', { name: ko('seed.age.5-7') })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '4쪽' }));
    expect(current_seed().page_count).toBe(4);
  });

  it('a topic chip stores the translated word and shows as pressed', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    await user.click(screen.getByRole('button', { name: ko('seed.topic.space') }));
    expect(current_seed().topic).toBe(ko('seed.topic.space'));
    expect(screen.getByRole('button', { name: ko('seed.topic.space') })).toHaveAttribute('aria-pressed', 'true');
  });

  it('always shows the privacy notice', () => {
    render(<SeedScreen />);
    expect(screen.getByText(ko('seed.privacy'))).toBeInTheDocument();
  });

  it('next without a topic shows a notice and stays on the screen', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(screen.getByRole('alert')).toHaveTextContent(ko('seed.need_topic'));
    expect(useBook.getState().screen).toBe('seed');
  });

  it('next without a name shows the name notice', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    await user.click(screen.getByRole('button', { name: ko('seed.topic.friendship') }));
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(screen.getByRole('alert')).toHaveTextContent(ko('seed.need_name'));
    expect(useBook.getState().screen).toBe('seed');
  });

  it('goes to the plot screen when everything is filled in', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    await user.click(screen.getByRole('button', { name: ko('seed.topic.adventure') }));
    await user.type(screen.getByLabelText(ko('seed.hero_name.label')), '토리');
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(useBook.getState().screen).toBe('plot');
  });

  it('"write my own" shows an input whose value is saved as the topic', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    expect(screen.queryByLabelText(ko('seed.topic.custom_label'))).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ko('seed.topic.custom') }));
    const input = screen.getByLabelText(ko('seed.topic.custom_label'));
    fireEvent.change(input, { target: { value: '비 오는 날 생긴 일' } });
    expect(current_seed().topic).toBe('비 오는 날 생긴 일');
  });

  it('shows the custom input right away for a saved topic outside the five words', () => {
    useBook.getState().update_seed({ topic: '바다 속 모험담' });
    render(<SeedScreen />);
    expect(screen.getByLabelText(ko('seed.topic.custom_label'))).toHaveValue('바다 속 모험담');
  });
});

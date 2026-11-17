// Step 2 story seed screen tests.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CUSTOM_PAGE_COUNT_START, PAGE_COUNT_MAX, PAGE_COUNT_MIN } from '../constants';
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

  it('"custom" page count shows a stepper that starts at 10 and stays within 2-20', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    expect(screen.queryByLabelText(ko('seed.pages.decrease'))).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ko('seed.pages.custom') }));
    expect(current_seed().page_count).toBe(CUSTOM_PAGE_COUNT_START);
    expect(screen.getByRole('button', { name: ko('seed.pages.custom') })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '8쪽' })).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: ko('seed.pages.increase') }));
    expect(current_seed().page_count).toBe(CUSTOM_PAGE_COUNT_START + 1);
    const input = screen.getByRole('spinbutton', { name: ko('seed.pages.count_aria') });
    fireEvent.change(input, { target: { value: '20' } });
    expect(current_seed().page_count).toBe(PAGE_COUNT_MAX);
    expect(screen.getByRole('button', { name: ko('seed.pages.increase') })).toBeDisabled();
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.blur(input);
    expect(current_seed().page_count).toBe(PAGE_COUNT_MAX);
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.blur(input);
    expect(current_seed().page_count).toBe(PAGE_COUNT_MIN);
    expect(screen.getByRole('button', { name: ko('seed.pages.decrease') })).toBeDisabled();
  });

  it('more than 8 pages shows the "takes longer" hint, and a preset button turns the stepper off', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    expect(screen.queryByText(ko('seed.pages.many'))).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ko('seed.pages.custom') }));
    expect(screen.getByText(ko('seed.pages.many'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '6쪽' }));
    expect(current_seed().page_count).toBe(6);
    expect(screen.queryByText(ko('seed.pages.many'))).not.toBeInTheDocument();
    expect(screen.queryByLabelText(ko('seed.pages.decrease'))).not.toBeInTheDocument();
  });

  it('a saved count that is not a preset opens with the stepper', () => {
    useBook.getState().update_seed({ page_count: 13 });
    render(<SeedScreen />);
    expect(screen.getByRole('spinbutton', { name: ko('seed.pages.count_aria') })).toHaveValue(13);
  });

  it('"Ask AI for help" cannot be pressed without AI and says why', () => {
    useSettings.setState({ practice: false, text_key: '' });
    render(<SeedScreen />);
    const buttons = screen.getAllByRole('button', { name: ko('assist.button') });
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    for (const help of buttons) expect(help).toBeDisabled();
    expect(screen.getAllByText(ko('assist.need_ai')).length).toBe(buttons.length);
  });

  it('practice mode writes a name; the box is read-only while waiting; undo puts back the old words', async () => {
    render(<SeedScreen />);
    const name_input = screen.getByLabelText(ko('seed.hero_name.label'));
    fireEvent.change(name_input, { target: { value: '구름' } });
    const [name_help] = screen.getAllByRole('button', { name: ko('assist.button') });
    fireEvent.click(name_help as HTMLElement);
    expect(screen.getByText(ko('assist.busy'))).toBeInTheDocument();
    expect(name_input).toHaveAttribute('readonly');
    await waitFor(() => expect(current_seed().hero_name).toBe('토리'));
    expect(name_input).not.toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name: ko('assist.undo') }));
    expect(current_seed().hero_name).toBe('구름');
    expect(screen.queryByRole('button', { name: ko('assist.undo') })).not.toBeInTheDocument();
  });

  it('editing after the AI wrote hides the undo link', async () => {
    render(<SeedScreen />);
    const look_help = screen.getAllByRole('button', { name: ko('assist.button') })[1] as HTMLElement;
    fireEvent.click(look_help);
    await waitFor(() => expect(current_seed().hero_look).not.toBe(''));
    expect(screen.getByRole('button', { name: ko('assist.undo') })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(ko('seed.hero_look.label')), { target: { value: '직접 고친 모습' } });
    expect(screen.queryByRole('button', { name: ko('assist.undo') })).not.toBeInTheDocument();
  });
});

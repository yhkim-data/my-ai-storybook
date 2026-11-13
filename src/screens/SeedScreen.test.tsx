// 2단계 이야기 씨앗 화면 검사: 칩 고르기, 직접 쓰기, 빠진 것 안내, 다음 단계 이동.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import { create_book } from '../store/book_model';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { SeedScreen } from './SeedScreen';

/** 검사에서 쓰는 한국어 문구 */
const ko = (key: string) => translate('ko', key);

/** 새 책과 한국어 설정으로 저장소를 준비한다. */
function prepare_store(): void {
  useSettings.setState({ lang: 'ko', practice: true });
  useBook.setState({ book: create_book('ko'), screen: 'seed' });
}

/** 지금 책의 씨앗을 읽는다. */
function current_seed() {
  const book = useBook.getState().book;
  if (!book) throw new Error('책이 없어요');
  return book.seed;
}

describe('SeedScreen', () => {
  beforeEach(prepare_store);
  afterEach(cleanup);

  it('나이대와 쪽수 칩을 누르면 저장소의 씨앗이 바뀐다', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    await user.click(screen.getByRole('button', { name: ko('seed.age.5-7') }));
    expect(current_seed().age_band).toBe('5-7');
    expect(screen.getByRole('button', { name: ko('seed.age.5-7') })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '4쪽' }));
    expect(current_seed().page_count).toBe(4);
  });

  it('주제 칩을 누르면 번역된 낱말이 주제로 저장되고 눌린 표시가 된다', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    await user.click(screen.getByRole('button', { name: ko('seed.topic.space') }));
    expect(current_seed().topic).toBe(ko('seed.topic.space'));
    expect(screen.getByRole('button', { name: ko('seed.topic.space') })).toHaveAttribute('aria-pressed', 'true');
  });

  it('개인정보 안내가 항상 보인다', () => {
    render(<SeedScreen />);
    expect(screen.getByText(ko('seed.privacy'))).toBeInTheDocument();
  });

  it('주제 없이 다음을 누르면 안내가 뜨고 화면이 그대로다', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(screen.getByRole('alert')).toHaveTextContent(ko('seed.need_topic'));
    expect(useBook.getState().screen).toBe('seed');
  });

  it('이름 없이 다음을 누르면 이름 안내가 뜬다', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    await user.click(screen.getByRole('button', { name: ko('seed.topic.friendship') }));
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(screen.getByRole('alert')).toHaveTextContent(ko('seed.need_name'));
    expect(useBook.getState().screen).toBe('seed');
  });

  it('다 채우고 다음을 누르면 줄거리 화면으로 간다', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    await user.click(screen.getByRole('button', { name: ko('seed.topic.adventure') }));
    await user.type(screen.getByLabelText(ko('seed.hero_name.label')), '토리');
    await user.click(screen.getByRole('button', { name: ko('common.next') }));
    expect(useBook.getState().screen).toBe('plot');
  });

  it('"직접 쓸래요"를 누르면 입력 칸이 나타나고 값이 주제에 저장된다', async () => {
    const user = userEvent.setup();
    render(<SeedScreen />);
    expect(screen.queryByLabelText(ko('seed.topic.custom_label'))).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ko('seed.topic.custom') }));
    const input = screen.getByLabelText(ko('seed.topic.custom_label'));
    fireEvent.change(input, { target: { value: '비 오는 날 생긴 일' } });
    expect(current_seed().topic).toBe('비 오는 날 생긴 일');
  });

  it('다섯 낱말에 없는 주제가 이미 있으면 직접 쓰기 칸이 바로 보인다', () => {
    useBook.getState().update_seed({ topic: '바다 속 모험담' });
    render(<SeedScreen />);
    expect(screen.getByLabelText(ko('seed.topic.custom_label'))).toHaveValue('바다 속 모험담');
  });
});

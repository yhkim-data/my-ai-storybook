// 시작 화면 검사: 카드, 언어 전환, 체험판, 새 책, 확인 창, 잘못된 파일.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { StartScreen } from './StartScreen';

const ko = (key: string) => translate('ko', key);

beforeEach(() => {
  useSettings.setState({ lang: 'ko', practice: false, text_key: '', image_key: '' });
  useBook.setState({ screen: 'start', book: null, is_demo: false, has_saved_book: false });
});
afterEach(() => cleanup());

describe('StartScreen', () => {
  it('제목, 카드 셋, DI Lab 표시, 만든 곳 바닥글이 보인다', () => {
    render(<StartScreen />);
    expect(screen.getByRole('heading', { level: 1, name: ko('start.title') })).toBeInTheDocument();
    expect(screen.getByText(ko('start.new.title'))).toBeInTheDocument();
    expect(screen.getByText(ko('start.resume.title'))).toBeInTheDocument();
    expect(screen.getByText(ko('start.demo.title'))).toBeInTheDocument();
    expect(screen.getAllByText('DI Lab').length).toBeGreaterThan(0);
    expect(screen.getByText(new RegExp(ko('common.made_by')))).toBeInTheDocument();
  });

  it('언어 단추로 영어로 바뀐다', async () => {
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: ko('common.lang_toggle_aria') }));
    expect(screen.getByRole('heading', { level: 1, name: translate('en', 'start.title') })).toBeInTheDocument();
    expect(useSettings.getState().lang).toBe('en');
  });

  it('저장된 책이 없으면 이어 만들기가 꺼져 있다', () => {
    render(<StartScreen />);
    const resume = screen.getByRole('button', { name: new RegExp(ko('start.resume.title')) });
    expect(resume).toBeDisabled();
    expect(screen.getByText(ko('start.resume.none'))).toBeInTheDocument();
  });

  it('체험판 보기를 누르면 체험판 책이 열린다', async () => {
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ko('start.demo.title')) }));
    expect(useBook.getState().is_demo).toBe(true);
    expect(useBook.getState().screen).toBe('finish');
  });

  it('새 책 만들기를 누르면 씨앗 화면으로 간다', async () => {
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ko('start.new.title')) }));
    expect(useBook.getState().screen).toBe('seed');
  });

  it('만들던 책이 있으면 확인 창이 뜨고 Esc로 닫힌다', async () => {
    useBook.setState({ has_saved_book: true });
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ko('start.new.title')) }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(ko('start.replace.body'))).toBeInTheDocument();
    expect(useBook.getState().screen).toBe('start');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('확인 창에서 새 책 시작하기를 누르면 씨앗 화면으로 간다', async () => {
    useBook.setState({ has_saved_book: true });
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ko('start.new.title')) }));
    await userEvent.click(screen.getByRole('button', { name: ko('start.replace.confirm') }));
    await waitFor(() => expect(useBook.getState().screen).toBe('seed'));
  });

  it('잘못된 파일을 올리면 안내가 뜬다', async () => {
    render(<StartScreen />);
    const file = new File(['이건 책 파일이 아니에요'], 'bad.json', { type: 'application/json' });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(ko('start.load_error'));
    expect(useBook.getState().book).toBeNull();
  });

  it('권리 안내 글자 단추를 누르면 곁 화면이 열린다', async () => {
    render(<StartScreen />);
    await userEvent.click(screen.getByRole('button', { name: ko('start.rights_link') }));
    expect(useBook.getState().screen).toBe('rights');
    expect(useBook.getState().return_screen).toBe('start');
  });
});

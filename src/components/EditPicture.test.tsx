// "Fix the picture" box in practice mode: fix, switch, before-and-after picking, undo, and the off states.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { load_scene_art } from '../art/scenes';
import { IMAGE_VERSIONS_MAX } from '../constants';
import { build_demo_book } from '../data/demo_book';
import { translate } from '../i18n';
import { useBook } from '../store/book_store';
import { add_fixed_version } from '../store/image_versions';
import { useSettings } from '../store/settings_store';
import { EditPicture } from './EditPicture';

const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);
const PAGE = 1;

const page_now = () => useBook.getState().book!.pages[PAGE]!;

beforeEach(async () => {
  window.scrollTo = vi.fn();
  await load_scene_art();
  useSettings.setState({ lang: 'ko', practice: true, text_key: '', image_key: '', usage_count: 0 });
  useBook.setState({ book: build_demo_book('ko'), screen: 'pictures', current_page: PAGE, undo_stack: [], redo_stack: [], last_change_key: null });
});
afterEach(() => cleanup());

async function fix(note: string) {
  const input = screen.getByLabelText(ko('edit.label'));
  fireEvent.change(input, { target: { value: note } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(screen.queryByText(ko('edit.busy'))).not.toBeInTheDocument());
}

describe('EditPicture', () => {
  it('a fix adds a version with one request, starts with the switch on, and the switch goes back and forth with undo', async () => {
    render(<EditPicture page_index={PAGE} />);
    const original = page_now().image;
    await fix('목도리를 파랗게');
    expect(useSettings.getState().usage_count).toBe(1);
    expect(page_now().image_versions).toHaveLength(2);
    expect(page_now().image?.edit_note).toBe('목도리를 파랗게');
    const toggle = screen.getByRole('switch', { name: ko('edit.switch') });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(page_now().image).toEqual(original);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(page_now().image?.edit_note).toBe('목도리를 파랗게');
    useBook.getState().undo();
    expect(page_now().image).toEqual(original);
    expect(useSettings.getState().usage_count).toBe(1);
  });

  it('the before-and-after window picks any version, also with the arrow keys, and Escape closes it', async () => {
    render(<EditPicture page_index={PAGE} />);
    await fix('목도리를 파랗게');
    fireEvent.click(screen.getByRole('button', { name: ko('edit.compare') }));
    const dialog = screen.getByRole('dialog', { name: ko('edit.compare_title') });
    const choices = within(dialog).getAllByRole('radio');
    expect(choices.map((choice) => choice.textContent)).toEqual([ko('edit.original'), ko('edit.version', { n: 1, note: '목도리를 파랗게' })]);
    expect(choices[1]).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(choices[1]!, { key: 'ArrowLeft' });
    expect(page_now().active_version).toBe(0);
    fireEvent.click(within(dialog).getAllByRole('button', { name: ko('edit.use_this') })[0]!);
    expect(page_now().active_version).toBe(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: ko('edit.compare') })).toHaveFocus();
  });

  it('a note practice mode cannot do leaves the picture and explains', async () => {
    render(<EditPicture page_index={PAGE} />);
    const before = page_now().image;
    await fix('더 귀엽게');
    expect(page_now().image).toBe(before);
    expect(screen.getByRole('alert')).toHaveTextContent(ko('error.practice_edit'));
  });

  it('is off without a picture, and for an uploaded picture in practice mode', () => {
    useBook.getState().set_page_image(PAGE, null);
    const { rerender } = render(<EditPicture page_index={PAGE} />);
    expect(screen.getByLabelText(ko('edit.label'))).toBeDisabled();
    expect(screen.getByText(ko('edit.need_image'))).toBeInTheDocument();
    useBook.getState().set_page_image(PAGE, { data_url: 'data:image/png;base64,QUJD', source: 'upload' });
    rerender(<EditPicture page_index={PAGE} />);
    expect(screen.getByText(ko('edit.practice_upload'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ko('edit.button') })).toBeDisabled();
  });

  it('with six pictures it warns that the oldest fixed picture will go', () => {
    let page = page_now();
    for (let n = 1; n < IMAGE_VERSIONS_MAX; n += 1) page = add_fixed_version(page, { data_url: `data:image/svg+xml;base64,${n}`, source: 'ai', edit_note: `${n}`, created_at: n });
    useBook.getState().edit_pages((pages) => pages.map((item, index) => (index === PAGE ? page : item)));
    render(<EditPicture page_index={PAGE} />);
    expect(screen.getByText(ko('edit.full'))).toBeInTheDocument();
  });
});

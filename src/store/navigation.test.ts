// Going home saves the book first, so it can be reopened from the start screen.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { build_demo_book } from '../data/demo_book';
import { flush_autosave, start_autosave } from '../storage/autosave';
import { delete_current_book, load_current_book } from '../storage/db';
import { useBook } from './book_store';
import { go_home } from './navigation';

describe('go_home', () => {
  beforeAll(() => {
    start_autosave();
  });
  beforeEach(async () => {
    await flush_autosave();
    await delete_current_book();
  });

  it('saves the pending change before closing the book', async () => {
    const book = { ...build_demo_book('ko'), step: 'pages' as const };
    useBook.setState({ book, is_demo: false, screen: 'pages' });
    await go_home();
    expect(useBook.getState().screen).toBe('start');
    expect(useBook.getState().book).toBeNull();
    expect(await load_current_book()).toEqual(book);
  });

  it('does not save the demo book', async () => {
    useBook.setState({ book: build_demo_book('en'), is_demo: true, screen: 'finish' });
    await go_home();
    expect(useBook.getState().screen).toBe('start');
    expect(await load_current_book()).toBeNull();
  });
});

// Autosave: writes the book to IndexedDB shortly after each change. The demo book is never saved.
import { AUTOSAVE_DELAY_MS } from '../constants';
import { useBook } from '../store/book_store';
import type { Book } from '../types';
import { load_current_book, save_current_book } from './db';

/** Mirrored to body[data-save-state] so e2e tests can wait for saves to finish. */
type SaveState = 'idle' | 'saving' | 'saved';

let save_timer: ReturnType<typeof setTimeout> | null = null;
let pending_book: Book | null = null;

function mark_save_state(state: SaveState): void {
  if (typeof document !== 'undefined') document.body.dataset.saveState = state;
}

/** Saves any pending book immediately. */
export async function flush_autosave(): Promise<void> {
  if (save_timer) clearTimeout(save_timer);
  save_timer = null;
  const book = pending_book;
  pending_book = null;
  if (!book) return;
  try {
    await save_current_book(book);
    useBook.getState().set_has_saved_book(true);
  } catch {
    // Storage full or blocked: skip this save. The user can still download the work file.
  }
  if (!pending_book) mark_save_state('saved');
}

function schedule_save(book: Book): void {
  pending_book = book;
  mark_save_state('saving');
  if (save_timer) clearTimeout(save_timer);
  save_timer = setTimeout(() => void flush_autosave(), AUTOSAVE_DELAY_MS);
}

/** Starts autosave; call once at startup. Also records whether a saved book exists. */
export function start_autosave(): void {
  mark_save_state('idle');
  void load_current_book()
    .then((book) => useBook.getState().set_has_saved_book(book !== null))
    .catch(() => undefined);
  useBook.subscribe((state, previous) => {
    if (state.book && !state.is_demo && state.book !== previous.book) schedule_save(state.book);
  });
  // Flush pending saves when the tab closes or goes to the background.
  window.addEventListener('pagehide', () => void flush_autosave());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush_autosave();
  });
}

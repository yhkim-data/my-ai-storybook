// Leaving a book for the start screen. Shared by the header logo and every "Home" button.
import { flush_autosave } from '../storage/autosave';
import { useBook } from './book_store';

/** Writes any pending autosave first, so "Continue" on the start screen reopens the same book. */
export async function go_home(): Promise<void> {
  await flush_autosave();
  useBook.getState().close_book();
}

// 자동 저장. 책이 바뀌면 잠깐 뒤에 IndexedDB에 쓴다. 체험판은 저장하지 않는다.
import { AUTOSAVE_DELAY_MS } from '../constants';
import { useBook } from '../store/book_store';
import type { Book } from '../types';
import { load_current_book, save_current_book } from './db';

/** 저장 상태를 body의 data-save-state에 적는다. 자동 검사가 저장이 끝났는지 볼 때 쓴다. */
type SaveState = 'idle' | 'saving' | 'saved';

let save_timer: ReturnType<typeof setTimeout> | null = null;
let pending_book: Book | null = null;

/**
 * 저장 상태를 문서에 적는다.
 */
function mark_save_state(state: SaveState): void {
  if (typeof document !== 'undefined') document.body.dataset.saveState = state;
}

/**
 * 미뤄 둔 책을 지금 저장한다.
 */
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
    // 저장 공간이 꽉 찼거나 막혀 있으면 이번 저장은 건너뛴다. 작업 파일 받기로 남길 수 있다.
  }
  if (!pending_book) mark_save_state('saved');
}

/**
 * 책을 저장 대기열에 올린다.
 */
function schedule_save(book: Book): void {
  pending_book = book;
  mark_save_state('saving');
  if (save_timer) clearTimeout(save_timer);
  save_timer = setTimeout(() => void flush_autosave(), AUTOSAVE_DELAY_MS);
}

/**
 * 자동 저장을 켠다. 앱이 시작할 때 한 번 부른다. 저장된 책이 있는지도 알아 둔다.
 */
export function start_autosave(): void {
  mark_save_state('idle');
  void load_current_book()
    .then((book) => useBook.getState().set_has_saved_book(book !== null))
    .catch(() => undefined);
  useBook.subscribe((state, previous) => {
    if (state.book && !state.is_demo && state.book !== previous.book) schedule_save(state.book);
  });
  // 창을 닫거나 다른 앱으로 갈 때 미뤄 둔 저장을 마친다.
  window.addEventListener('pagehide', () => void flush_autosave());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush_autosave();
  });
}

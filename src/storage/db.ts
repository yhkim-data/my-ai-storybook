// IndexedDB에 만들던 책(그림 포함)을 저장하고 읽는다. 책은 이 기기 밖으로 나가지 않는다.
import type { Book } from '../types';

const DB_NAME = 'storybook';
const DB_VERSION = 1;
const STORE_NAME = 'books';
/** 만들던 책 한 권을 두는 자리 */
const CURRENT_BOOK_KEY = 'current';

/**
 * 데이터베이스를 연다. 처음이면 저장 칸을 만든다.
 */
function open_db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('db open failed'));
  });
}

/**
 * 저장 칸에서 한 가지 일을 하고 결과를 돌려준다.
 */
async function run_request<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open_db();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? new Error('db request failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('db request aborted'));
    });
  } finally {
    db.close();
  }
}

/**
 * 만들던 책을 저장한다.
 */
export async function save_current_book(book: Book): Promise<void> {
  await run_request('readwrite', (store) => store.put(book, CURRENT_BOOK_KEY));
}

/**
 * 만들던 책을 읽는다. 없으면 null이다.
 */
export async function load_current_book(): Promise<Book | null> {
  const book = await run_request<Book | undefined>('readonly', (store) => store.get(CURRENT_BOOK_KEY));
  return book ?? null;
}

/**
 * 만들던 책을 지운다.
 */
export async function delete_current_book(): Promise<void> {
  await run_request('readwrite', (store) => store.delete(CURRENT_BOOK_KEY));
}

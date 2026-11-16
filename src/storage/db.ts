// Stores the book in progress (with images) in IndexedDB. The book never leaves this device.
import type { Book } from '../types';

const DB_NAME = 'storybook';
const DB_VERSION = 1;
const STORE_NAME = 'books';
/** Only one book in progress is kept, under this key. */
const CURRENT_BOOK_KEY = 'current';

/** Opens the database, creating the object store on first use. */
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

/** Runs one request in its own transaction and resolves when the transaction completes. */
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

export async function save_current_book(book: Book): Promise<void> {
  await run_request('readwrite', (store) => store.put(book, CURRENT_BOOK_KEY));
}

/** Loads the book in progress, or null if there is none. */
export async function load_current_book(): Promise<Book | null> {
  const book = await run_request<Book | undefined>('readonly', (store) => store.get(CURRENT_BOOK_KEY));
  return book ?? null;
}

export async function delete_current_book(): Promise<void> {
  await run_request('readwrite', (store) => store.delete(CURRENT_BOOK_KEY));
}

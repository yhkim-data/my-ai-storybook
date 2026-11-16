// jsdom has no IndexedDB, so load a fake one for storage tests.
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

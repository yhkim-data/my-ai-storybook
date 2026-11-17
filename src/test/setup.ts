// jsdom has no IndexedDB, so load a fake one for storage tests. Scene art is loaded up front
// because the app loads it on demand.
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { beforeAll } from 'vitest';
import { load_scene_art } from '../art/scenes';

beforeAll(() => load_scene_art());

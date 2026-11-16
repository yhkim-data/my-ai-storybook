import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** GitHub Pages serves the app under the repository name. */
const REPO_BASE = '/my-ai-storybook/';

export default defineConfig({
  base: REPO_BASE,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: false,
  },
});

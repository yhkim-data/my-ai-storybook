import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** Relative base so one build works at any path (a custom domain root or a /my-ai-storybook/ subpath). */
const RELATIVE_BASE = './';

export default defineConfig({
  base: RELATIVE_BASE,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: false,
  },
});

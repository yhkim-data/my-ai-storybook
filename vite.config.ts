// Vite와 Vitest 설정. base는 GitHub Pages 저장소 이름에 맞춘다.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** GitHub Pages에서 앱이 놓이는 경로 (저장소 이름) */
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

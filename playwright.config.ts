// Serves the production build with vite preview and tests at tablet and phone sizes.
import { defineConfig } from '@playwright/test';

const PREVIEW_PORT = 4173;
/** The build uses a relative base, so the preview server serves it at the root. */
const APP_PATH = '/';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PREVIEW_PORT}${APP_PATH}`,
    locale: 'ko-KR',
    browserName: 'chromium',
    acceptDownloads: true,
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    { name: 'tablet', use: { viewport: { width: 1024, height: 768 }, hasTouch: true } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PREVIEW_PORT} --strictPort`,
    url: `http://localhost:${PREVIEW_PORT}${APP_PATH}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});

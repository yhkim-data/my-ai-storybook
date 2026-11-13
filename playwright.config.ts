// Playwright 설정: 빌드한 앱을 미리보기 서버로 띄우고 태블릿·휴대폰 크기에서 검사한다.
import { defineConfig } from '@playwright/test';

/** 미리보기 서버 포트 */
const PREVIEW_PORT = 4173;
/** 앱이 놓이는 경로 (vite.config.ts의 base와 같다) */
const APP_PATH = '/my-ai-storybook/';

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

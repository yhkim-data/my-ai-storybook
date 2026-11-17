import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** Relative base so one build works at any path (a custom domain root or a /my-ai-storybook/ subpath). */
const RELATIVE_BASE = './';

/**
 * Content Security Policy for the built site. connect-src lists only the addresses the code calls: the site itself
 * (fonts for exports) and the three AI providers. No inline or eval'd script, and no inline <style> in the build.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "manifest-src 'self'",
].join('; ');

/**
 * Adds the CSP and no-referrer meta tags to the built index.html only. The dev server is left alone because
 * hot reload needs inline scripts. GitHub Pages cannot send headers, so frame-ancestors is not used here;
 * src/main.tsx refuses to run inside another site's frame instead.
 */
function security_meta(): Plugin {
  return {
    name: 'security-meta',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY }, injectTo: 'head-prepend' },
      { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig({
  base: RELATIVE_BASE,
  plugins: [react(), security_meta()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: false,
  },
});

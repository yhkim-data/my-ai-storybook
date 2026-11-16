import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react_hooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results', '.claude'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': react_hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);

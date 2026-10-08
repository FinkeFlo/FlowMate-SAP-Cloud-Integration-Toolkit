import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import wxtAutoImports from './.wxt/eslint-auto-imports.mjs';

export default tseslint.config(
  {
    ignores: ['.output/**', '.wxt/**', 'node_modules/**', '*.config.*'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    ...wxtAutoImports,
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}', '*.config.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Preact/TSX components are functions returning JSX; unused vars in
      // destructured props are common and intentional.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Diagnostics go through features/shared/dev-logger.ts; console.warn/error stay allowed for real failures.
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The dev logger is the console abstraction itself; the background worker has no devLog transport.
    files: ['features/shared/dev-logger.ts', 'entrypoints/background.ts'],
    rules: { 'no-console': 'off' },
  },
);

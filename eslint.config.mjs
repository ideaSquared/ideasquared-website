import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', '.wrangler/', '.lighthouseci/', 'pnpm-lock.yaml'] },
  js.configs.recommended,
  {
    // The site's own scripts run in the browser as classic scripts.
    files: ['scripts/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
    rules: {
      // localStorage can throw (private mode, blocked storage); the scripts deliberately ignore that.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
  {
    files: ['test/**/*.mjs', '*.config.mjs'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node } },
  },
];

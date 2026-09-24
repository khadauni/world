import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is banned: all content must render as text (XSS safety).',
        },
        {
          selector: "CallExpression[callee.name='eval'], NewExpression[callee.name='Function']",
          message: 'Dynamic code evaluation is banned (CSP + security).',
        },
      ],
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Do not use innerHTML (XSS). Use textContent / React.' },
        { property: 'outerHTML', message: 'Do not use outerHTML (XSS).' },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use the safe storage wrapper in src/core/storage.ts.' },
        { name: 'fetch', message: 'Network access is not allowed in the kids app (privacy). Talk to the team first.' },
      ],
    },
  },
);

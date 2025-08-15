// Flat config for ESLint v9+
import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {},
      },
    },
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      'comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'never',
        },
      ],
      // Prefer arrow functions over function declarations/expressions
      'prefer-arrow-callback': ['error', { allowNamedFunctions: false, allowUnboundThis: true }],
      'func-style': ['error', 'expression'],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'FunctionDeclaration',
          message: 'Use arrow functions instead of function declarations',
        },
        {
          selector: 'FunctionExpression',
          message: 'Use arrow functions instead of function expressions',
        },
      ],
      'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
      'no-console': 'off',
    },
  },
  prettierConfig,
];

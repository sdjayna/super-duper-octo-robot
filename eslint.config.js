import js from '@eslint/js';
import vitest from 'eslint-plugin-vitest-globals';

export default [
  js.configs.recommended,
  {
    files: ['client/js/**/*.js'],
    ignores: ['client/js/**/__tests__/**'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {}
  },
  {
    files: ['client/js/**/__tests__/**/*.js'],
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
        document: 'readonly',
        window: 'readonly',
        global: 'writable'
      }
    },
    plugins: {
      vitest
    },
    rules: {
      ...vitest.configs.recommended.rules
    }
  }
];

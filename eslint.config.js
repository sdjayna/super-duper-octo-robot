import js from '@eslint/js';
import vitest from 'eslint-plugin-vitest-globals';

const BROWSER_GLOBALS = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  fetch: 'readonly',
  console: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  FileReader: 'readonly',
  XMLSerializer: 'readonly',
  EventSource: 'readonly',
  confirm: 'readonly',
  Image: 'readonly',
  AudioContext: 'readonly',
  webkitAudioContext: 'readonly',
  Event: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  performance: 'readonly'
};

const NODE_GLOBALS = {
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  global: 'readonly',
  fetch: 'readonly'
};

export default [
  {
    ignores: [
      'node_modules/**',
      'output/**',
      'client/static/**',
      'client/templates/**',
      '.venv/**'
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2024
    }
  },
  {
    files: ['client/js/**/*.js', 'drawings/**/*.js'],
    ignores: ['client/js/**/__tests__/**', 'drawings/**/__tests__/**'],
    languageOptions: {
      globals: {
        ...BROWSER_GLOBALS
      }
    }
  },
  {
    files: [
      'scripts/**/*.js',
      'scripts/**/*.mjs',
      'eslint.config.js'
    ],
    languageOptions: {
      globals: {
        ...NODE_GLOBALS
      }
    }
  },
  {
    files: ['**/__tests__/**/*.js'],
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
        ...BROWSER_GLOBALS,
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

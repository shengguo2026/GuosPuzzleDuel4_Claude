// ESLint flat config. The "sim purity" block is the dependency rule of WP 1.1:
// packages/sim (and the AI, which runs inside the sim's command loop) import no
// DOM, network, database or Node API and use no wall-clock time or Math.random.
// tools/test/lint-rules.test.ts proves the rule fires.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const PURE_PACKAGES = ['packages/sim/src/**/*.ts', 'packages/ai/src/**/*.ts'];

const simPurity = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        { group: ['node:*'], message: 'The simulation is pure: no Node APIs (PLAN.md section 3).' },
        {
          group: [
            'fs',
            'fs/*',
            'path',
            'os',
            'net',
            'http',
            'https',
            'http2',
            'dgram',
            'child_process',
            'worker_threads',
            'crypto',
            'url',
            'stream',
            'events',
            'timers',
            'process',
          ],
          message: 'The simulation is pure: no Node APIs (PLAN.md section 3).',
        },
        { group: ['ws', 'ws/*', 'undici', 'socket.io*'], message: 'No network in the simulation.' },
        { group: ['*sqlite*', 'better-sqlite3'], message: 'No database in the simulation.' },
        {
          group: ['react', 'react-*', 'pixi.js', 'pixi.js/*'],
          message: 'No DOM or rendering in the simulation.',
        },
        {
          group: ['@gpd4/host', '@gpd4/client', '@gpd4/protocol'],
          message: 'The simulation imports only @gpd4/rules.',
        },
      ],
    },
  ],
  'no-restricted-globals': [
    'error',
    ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'indexedDB'].map(
      (name) => ({
        name,
        message: 'No DOM in the simulation.',
      }),
    ),
    ...['fetch', 'WebSocket', 'XMLHttpRequest'].map((name) => ({
      name,
      message: 'No network in the simulation.',
    })),
    ...['Date', 'performance', 'setTimeout', 'setInterval', 'requestAnimationFrame'].map(
      (name) => ({
        name,
        message: 'No wall-clock time in the simulation: use ticks.',
      }),
    ),
    { name: 'process', message: 'No Node APIs in the simulation.' },
    { name: 'require', message: 'No Node APIs in the simulation.' },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Use the seeded simulation RNG.' },
  ],
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  {
    files: ['apps/client/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: PURE_PACKAGES,
    rules: simPurity,
  },
);

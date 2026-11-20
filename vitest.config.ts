import { defineConfig } from 'vitest/config';

// Unit tests of every workspace package (QA-01). E2E runs in Playwright, the
// start-script smoke tests in tools/vitest.smoke.config.ts.
export default defineConfig({
  test: {
    include: [
      'packages/*/test/**/*.test.ts',
      'apps/*/test/**/*.test.ts',
      'tools/test/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', 'tools/test/start-scripts.test.ts'],
    testTimeout: 20_000,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: 'test-results/unit-junit.xml' },
  },
});

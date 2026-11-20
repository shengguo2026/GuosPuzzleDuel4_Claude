import { defineConfig } from 'vitest/config';

// Start-script smoke tests (WP 1.6, QA-03): run the real start.bat / start.sh.
export default defineConfig({
  test: {
    include: ['tools/test/start-scripts.test.ts'],
    testTimeout: 300_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: 'test-results/smoke-junit.xml' },
  },
});

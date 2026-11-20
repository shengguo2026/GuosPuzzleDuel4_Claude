import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// E2E against the real host serving the built client (run `pnpm build` first).
// A fixed test port and a throw-away data folder keep it apart from a running game.
const port = Number(process.env.E2E_PORT ?? 3150);
const dataDir = path.join(os.tmpdir(), `gpd4-e2e-${process.pid}`);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ['list'],
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
      ]
    : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node --disable-warning=ExperimentalWarning ../host/dist/host.mjs --no-open --data-dir "${dataDir}" --first-port ${port} --last-port ${port}`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'pipe',
  },
});

import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const chromium = process.env.CHROMIUM_PATH ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);
const PORT = 3100;
const launchOptions = { ...(chromium ? { executablePath: chromium } : {}), args: ['--no-sandbox'] };

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', launchOptions },
  projects: [
    // Acceptance: both tracks must be completable on a 375px phone, one question per screen.
    { name: 'mobile-375', use: { ...devices['Pixel 5'], viewport: { width: 375, height: 667 }, launchOptions } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 }, launchOptions } },
  ],
  webServer: {
    command: 'npx tsx src/server/index.ts',
    port: PORT,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NODE_ENV: 'development', PORT: String(PORT), PUBLIC_BASE_URL: `http://localhost:${PORT}`, DATA_DIR: './test-results/e2e-data',
      RATE_LIMIT_DISABLED: 'true', NODE_NO_WARNINGS: '1',
    },
  },
});

// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Local testing without starting a server.
 * Use when dev server is already running (e.g. npm run serve).
 * Run: npx playwright test --config=playwright.config.no-server.js
 */
module.exports = defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js$/,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

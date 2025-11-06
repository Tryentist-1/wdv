// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Local testing configuration
 * Tests against local dev server (localhost:8001)
 * Run with: npx playwright test --config=playwright.config.local.js
 * 
 * This config:
 * - Starts a local PHP server on localhost:8001
 * - Uses the local dev database (from config.local.php)
 * - Tests against local files served via HTTP
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run sequentially for local testing
  retries: 0,
  reporter: 'list',
  
  use: {
    // Use local PHP server (matches npm run serve)
    baseURL: 'http://localhost:8001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  // Start local PHP server before tests
  webServer: {
    command: 'cd /Users/terry/web-mirrors/tryentist/wdv && php -S localhost:8001',
    url: 'http://localhost:8001',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});


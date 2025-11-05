// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Local testing configuration
 * Tests against local files using file:// protocol
 * Run with: npx playwright test --config=playwright.config.local.js
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run sequentially for local testing
  retries: 0,
  reporter: 'list',
  
  use: {
    // Use local file system
    baseURL: 'file:///Users/terry/web-mirrors/tryentist/wdv',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    
    // For local API calls, you might need to mock or use localhost
    // If you run a local PHP server:
    // baseURL: 'http://localhost:8001',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  // Start local PHP server before tests (optional)
  webServer: {
    command: 'cd /Users/terry/web-mirrors/tryentist/wdv && php -S localhost:8001',
    url: 'http://localhost:8001',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});


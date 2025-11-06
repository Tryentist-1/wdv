// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'https://tryentist.com/wdv',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'iPhone 13',
      use: { ...devices['iPhone 13'] }, // Safari on iPhone
    },
    {
      name: 'iPhone 13 Pro',
      use: { ...devices['iPhone 13 Pro'] }, // Safari on iPhone Pro
    },
    {
      name: 'Pixel 5',
      use: { ...devices['Pixel 5'] }, // Chrome on Android
    },
    {
      name: 'Galaxy S21',
      use: { ...devices['Galaxy S21'] }, // Chrome on Android
    },
  ],
});


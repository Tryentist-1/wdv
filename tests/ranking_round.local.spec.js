// Playwright test for Ranking Round - LOCAL VERSION
// Tests against local files before deployment
// Run with: npx playwright test tests/ranking_round.local.spec.js --config=playwright.config.local.js

const { test, expect } = require('@playwright/test');

test.describe('Ranking Round - Local Testing', () => {
  
  test('should show modal on fresh start (LOCAL)', async ({ page }) => {
    // Test local file
    await page.goto('http://localhost:8000/ranking_round_300.html');
    
    // Modal should be visible
    const modal = page.locator('#event-modal');
    await expect(modal).toBeVisible({ timeout: 3000 });
    
    // Should have both tabs
    await expect(page.locator('#tab-passcode')).toBeVisible();
    await expect(page.locator('#tab-events')).toBeVisible();
  });
  
  test('should load JavaScript correctly (LOCAL)', async ({ page }) => {
    await page.goto('http://localhost:8000/ranking_round_300.html');
    
    // Check that JavaScript loaded (API_BASE should be defined)
    const apiBaseExists = await page.evaluate(() => {
      return typeof API_BASE !== 'undefined';
    });
    
    // This will fail if API_BASE is not defined
    expect(apiBaseExists).toBeTruthy();
  });
  
  test('should have correct cache busters (LOCAL)', async ({ page }) => {
    const response = await page.goto('http://localhost:8000/ranking_round_300.html');
    const content = await response.text();
    
    // Check for latest cache buster
    expect(content).toContain('ranking_round_300.js?v=20251021');
    expect(content).not.toContain('ranking_round_300.js?v=20250922');
  });
  
});


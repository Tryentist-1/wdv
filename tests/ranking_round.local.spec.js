// Playwright test for Ranking Round - LOCAL VERSION (Updated for new UI/UX design)
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
  
  test('should show manual setup section when canceling modal (LOCAL)', async ({ page }) => {
    await page.goto('http://localhost:8000/ranking_round_300.html');
    
    // Cancel modal to enter manual mode
    await page.click('#cancel-event-modal-btn');
    
    // Should show manual setup section
    await expect(page.locator('#manual-setup-section')).toBeVisible();
    await expect(page.locator('#preassigned-setup-section')).not.toBeVisible();
    
    // Should have manual setup controls
    await expect(page.locator('#bale-number-input-manual')).toBeVisible();
    await expect(page.locator('#archer-search-manual')).toBeVisible();
    await expect(page.locator('#selected-count-chip')).toBeVisible();
  });
  
  test('should have new setup section elements (LOCAL)', async ({ page }) => {
    await page.goto('http://localhost:8000/ranking_round_300.html');
    
    // Check that new HTML elements exist
    await expect(page.locator('#manual-setup-section')).toBeAttached();
    await expect(page.locator('#preassigned-setup-section')).toBeAttached();
    await expect(page.locator('#bale-number-input-manual')).toBeAttached();
    await expect(page.locator('#archer-search-manual')).toBeAttached();
    await expect(page.locator('#selected-count-chip')).toBeAttached();
    await expect(page.locator('#manual-start-scoring-btn')).toBeAttached();
    await expect(page.locator('#bale-list-container')).toBeAttached();
  });
  
});


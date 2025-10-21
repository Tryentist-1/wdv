// Playwright test for Ranking Round
// Run with: npx playwright test tests/ranking_round.spec.js

const { test, expect } = require('@playwright/test');

test.describe('Ranking Round - Event Modal', () => {
  
  test('should show modal on fresh start', async ({ page }) => {
    await page.goto('https://tryentist.com/wdv/ranking_round_300.html');
    
    // Modal should be visible
    const modal = page.locator('#event-modal');
    await expect(modal).toBeVisible();
    
    // Should have both tabs
    await expect(page.locator('#tab-passcode')).toBeVisible();
    await expect(page.locator('#tab-events')).toBeVisible();
  });
  
  test('should load events in Select Event tab', async ({ page }) => {
    await page.goto('https://tryentist.com/wdv/ranking_round_300.html');
    
    // Click Select Event tab
    await page.click('#tab-events');
    
    // Wait for events to load
    await page.waitForTimeout(1000);
    
    // Should show events (not "Failed to load")
    const eventList = page.locator('#event-list');
    await expect(eventList).not.toContainText('Failed to load');
    
    // Should show at least one event button
    const eventButtons = page.locator('#event-list button');
    await expect(eventButtons.first()).toBeVisible();
  });
  
  test('should verify entry code "tuesday"', async ({ page }) => {
    await page.goto('https://tryentist.com/wdv/ranking_round_300.html');
    
    // Enter code
    await page.fill('#event-code-input', 'tuesday');
    await page.click('#verify-code-btn');
    
    // Wait for connection
    await page.waitForTimeout(1500);
    
    // Modal should close
    const modal = page.locator('#event-modal');
    await expect(modal).not.toBeVisible();
    
    // Should show archers list (not empty state)
    await expect(page.locator('text=No Event Connected')).not.toBeVisible();
  });
  
  test('should handle QR code URL parameters', async ({ page }) => {
    await page.goto('https://tryentist.com/wdv/ranking_round_300.html?event=2e43821b-7b2f-4341-87e2-f85fe0831d76&code=tuesday');
    
    // Wait for auto-verification
    await page.waitForTimeout(1500);
    
    // Modal should NOT show (QR code bypasses it)
    const modal = page.locator('#event-modal');
    await expect(modal).not.toBeVisible();
    
    // Should show bale list
    await expect(page.locator('text=Setup Bale')).toBeVisible();
  });
  
  test('should show empty state when canceling modal with no event', async ({ page }) => {
    await page.goto('https://tryentist.com/wdv/ranking_round_300.html');
    
    // Cancel modal
    await page.click('#cancel-event-modal-btn');
    
    // Should show empty state
    await expect(page.locator('text=No Event Connected')).toBeVisible();
    await expect(page.locator('text=🎯')).toBeVisible();
  });
  
});

test.describe('Ranking Round - Bale Selection', () => {
  
  test.beforeEach(async ({ page }) => {
    // Connect to event first
    await page.goto('https://tryentist.com/wdv/ranking_round_300.html');
    await page.fill('#event-code-input', 'tuesday');
    await page.click('#verify-code-btn');
    await page.waitForTimeout(1500);
  });
  
  test('should show sort button', async ({ page }) => {
    await expect(page.locator('#sort-toggle-btn')).toBeVisible();
    await expect(page.locator('#sort-toggle-btn')).toContainText('Sort by');
  });
  
  test('should toggle sort mode', async ({ page }) => {
    const sortBtn = page.locator('#sort-toggle-btn');
    
    // Default should be Bale
    await expect(sortBtn).toContainText('Bale Number');
    
    // Click to switch to Name
    await sortBtn.click();
    await expect(sortBtn).toContainText('Name');
    
    // Click again to switch back
    await sortBtn.click();
    await expect(sortBtn).toContainText('Bale Number');
  });
  
  test('should show bale groups with archers', async ({ page }) => {
    // Should show bale headers
    const baleHeaders = page.locator('.list-header');
    await expect(baleHeaders.first()).toBeVisible();
    
    // Bale header should be clickable
    await expect(baleHeaders.first()).toHaveText(/Bale \d+/);
  });
  
});


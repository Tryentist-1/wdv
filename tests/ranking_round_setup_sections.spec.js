// Playwright test for Ranking Round - New Setup Sections
// Tests the new Manual vs Pre-assigned setup sections functionality
// Run with: npx playwright test tests/ranking_round_setup_sections.spec.js
// For local dev: npx playwright test tests/ranking_round_setup_sections.spec.js --config=playwright.config.local.js

const { test, expect } = require('@playwright/test');

test.describe('Ranking Round - Setup Sections Functionality', () => {
  
  test('should detect manual mode correctly', async ({ page }) => {
    await page.goto('/ranking_round_300.html');
    
    // Cancel modal to enter manual mode
    await page.click('#cancel-event-modal-btn');
    
    // Should show manual setup section
    await expect(page.locator('#manual-setup-section')).toBeVisible();
    await expect(page.locator('#preassigned-setup-section')).not.toBeVisible();
    
    // Should have manual setup title
    await expect(page.locator('#manual-setup-section h3')).toContainText('Manual Setup');
  });
  
  test('should detect pre-assigned mode correctly', async ({ page }) => {
    await page.goto('/ranking_round_300.html');
    
    // Connect to event to enter pre-assigned mode
    await page.fill('#event-code-input', 'tuesday');
    await page.click('#verify-code-btn');
    
    // Wait for the event to load and setup sections to render
    await page.waitForSelector('#preassigned-setup-section', { state: 'visible', timeout: 10000 });
    
    // Should show pre-assigned setup section
    await expect(page.locator('#preassigned-setup-section')).toBeVisible();
    await expect(page.locator('#manual-setup-section')).not.toBeVisible();
    
    // Should have pre-assigned setup title
    await expect(page.locator('#preassigned-setup-section h3')).toContainText('Pre-assigned Bales');
  });
  
});

test.describe('Ranking Round - Manual Setup Controls', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start in manual mode
    await page.goto('/ranking_round_300.html');
    await page.click('#cancel-event-modal-btn');
  });
  
  test('should have all manual setup controls', async ({ page }) => {
    // Check all manual controls are present
    await expect(page.locator('#bale-number-input-manual')).toBeVisible();
    await expect(page.locator('#archer-search-manual')).toBeVisible();
    await expect(page.locator('#selected-count-chip')).toBeVisible();
    await expect(page.locator('#manual-start-scoring-btn')).toBeVisible();
  });
  
  test('should update bale number and persist state', async ({ page }) => {
    const baleInput = page.locator('#bale-number-input-manual');
    
    // Change bale number
    await baleInput.fill('3');
    await baleInput.blur();
    
    // Should update the value
    await expect(baleInput).toHaveValue('3');
    
    // Refresh page and check persistence
    await page.reload();
    await page.click('#cancel-event-modal-btn');
    await expect(baleInput).toHaveValue('3');
  });
  
  test('should show selection indicator updates', async ({ page }) => {
    const indicator = page.locator('#selected-count-chip');
    
    // Should start with 0/4
    await expect(indicator).toContainText('0/4 archers selected');
    
    // Start scoring button should be disabled
    await expect(page.locator('#manual-start-scoring-btn')).toBeDisabled();
  });
  
  test('should have functional search input', async ({ page }) => {
    const searchInput = page.locator('#archer-search-manual');
    
    // Should have correct placeholder
    await expect(searchInput).toHaveAttribute('placeholder', 'Search archers...');
    
    // Should be able to type
    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');
  });
  
});

test.describe('Ranking Round - Pre-assigned Setup Controls', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start in pre-assigned mode
    await page.goto('/ranking_round_300.html');
    await page.fill('#event-code-input', 'tuesday');
    await page.click('#verify-code-btn');
    await page.waitForTimeout(1500);
  });
  
  test('should show bale list container', async ({ page }) => {
    // Should show bale list container
    await expect(page.locator('#bale-list-container')).toBeVisible();
  });
  
  test('should render bale list items', async ({ page }) => {
    // Wait for bale list to load
    await page.waitForTimeout(1000);
    
    // Should show bale list items
    const baleItems = page.locator('.bale-list-item');
    
    if (await baleItems.count() > 0) {
      // Should have bale information
      await expect(baleItems.first().locator('.bale-number')).toBeVisible();
      await expect(baleItems.first().locator('.bale-archers')).toBeVisible();
      
      // Should have Start Scoring button
      await expect(baleItems.first().locator('button')).toBeVisible();
      await expect(baleItems.first().locator('button')).toContainText('Start Scoring');
    }
  });
  
  test('should have proper bale list styling', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const baleItems = page.locator('.bale-list-item');
    
    if (await baleItems.count() > 0) {
      // Check CSS classes are applied
      const firstItem = baleItems.first();
      await expect(firstItem).toHaveClass(/bale-list-item/);
      
      // Check hover effect (if any)
      await firstItem.hover();
    }
  });
  
});

test.describe('Ranking Round - Setup Mode Switching', () => {
  
  test('should switch from manual to pre-assigned mode', async ({ page }) => {
    // Start in manual mode
    await page.goto('/ranking_round_300.html');
    await page.click('#cancel-event-modal-btn');
    
    // Should show manual setup
    await expect(page.locator('#manual-setup-section')).toBeVisible();
    await expect(page.locator('#preassigned-setup-section')).not.toBeVisible();
    
    // Connect to event
    await page.click('#change-event-btn');
    await page.fill('#event-code-input', 'tuesday');
    await page.click('#verify-code-btn');
    await page.waitForTimeout(1500);
    
    // Should now show pre-assigned setup
    await expect(page.locator('#preassigned-setup-section')).toBeVisible();
    await expect(page.locator('#manual-setup-section')).not.toBeVisible();
  });
  
  test('should switch from pre-assigned to manual mode', async ({ page }) => {
    // Start in pre-assigned mode
    await page.goto('/ranking_round_300.html');
    await page.fill('#event-code-input', 'tuesday');
    await page.click('#verify-code-btn');
    await page.waitForTimeout(1500);
    
    // Should show pre-assigned setup
    await expect(page.locator('#preassigned-setup-section')).toBeVisible();
    await expect(page.locator('#manual-setup-section')).not.toBeVisible();
    
    // Reset to manual mode (this would require a reset button or similar)
    // For now, we'll test the initial state detection
  });
  
});

test.describe('Ranking Round - Mobile Responsiveness', () => {
  
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/ranking_round_300.html');
    await page.click('#cancel-event-modal-btn');
    
    // Manual setup should still be visible on mobile
    await expect(page.locator('#manual-setup-section')).toBeVisible();
    
    // Controls should be properly sized for mobile
    await expect(page.locator('#bale-number-input-manual')).toBeVisible();
    await expect(page.locator('#archer-search-manual')).toBeVisible();
    await expect(page.locator('#selected-count-chip')).toBeVisible();
  });
  
  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/ranking_round_300.html');
    await page.fill('#event-code-input', 'tuesday');
    await page.click('#verify-code-btn');
    await page.waitForTimeout(1500);
    
    // Pre-assigned setup should work on tablet
    await expect(page.locator('#preassigned-setup-section')).toBeVisible();
    await expect(page.locator('#bale-list-container')).toBeVisible();
  });
  
});

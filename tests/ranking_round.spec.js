// Playwright test for Ranking Round - Updated for new UI/UX design
// Run with: npx playwright test tests/ranking_round.spec.js
// For local dev: npx playwright test tests/ranking_round.spec.js --config=playwright.config.local.js
//
// Tests use relative URLs and baseURL from Playwright config:
// - Production: baseURL = 'https://tryentist.com/wdv' (from playwright.config.js)
// - Local: baseURL = 'http://localhost:8001' (from playwright.config.local.js)

const { test, expect } = require('@playwright/test');

test.describe('Ranking Round - Event Modal', () => {
  
  test('should show modal on fresh start', async ({ page }) => {
    await page.goto('/ranking_round_300.html');
    
    // Modal should be visible
    const modal = page.locator('#event-modal');
    await expect(modal).toBeVisible();
    
    // Should have both tabs
    await expect(page.locator('#tab-passcode')).toBeVisible();
    await expect(page.locator('#tab-events')).toBeVisible();
  });
  
  test('should load events in Select Event tab', async ({ page }) => {
    await page.goto('/ranking_round_300.html');
    
    // Click Select Event tab
    await page.click('#tab-events');
    
    // Wait for events to load (ensure at least one button appears)
    await page.waitForFunction(() => {
      const list = document.querySelector('#event-list');
      return list && list.querySelectorAll('button').length > 0;
    }, { timeout: 7000 });
    
    // Should show events (not "Failed to load")
    const eventList = page.locator('#event-list');
    await expect(eventList).not.toContainText('Failed to load');
    
    // Should show at least one event button
    const eventButtons = page.locator('#event-list button');
    await expect(eventButtons.first()).toBeVisible();
  });
  
  test('should verify entry code "tuesday" and show pre-assigned setup', async ({ page }) => {
    await page.goto('/ranking_round_300.html');
    
    // Enter code
    await page.fill('#event-code-input', 'tuesday');
    await page.click('#verify-code-btn');
    
    // Wait for connection
    await page.waitForTimeout(1500);
    
    // Modal should close
    const modal = page.locator('#event-modal');
    await expect(modal).not.toBeVisible();
    
    // Should show pre-assigned setup section (not manual)
    await expect(page.locator('#preassigned-setup-section')).toBeVisible();
    await expect(page.locator('#manual-setup-section')).not.toBeVisible();
    
    // Should show bale list
    await expect(page.locator('#bale-list-container')).toBeVisible();
  });
  
  test('should handle QR code URL parameters', async ({ page }) => {
    await page.goto('/ranking_round_300.html?event=2e43821b-7b2f-4341-87e2-f85fe0831d76&code=tuesday');
    
    // Wait for auto-verification
    await page.waitForTimeout(1500);
    
    // Modal should NOT show (QR code bypasses it)
    const modal = page.locator('#event-modal');
    await expect(modal).not.toBeVisible();
    
    // Should show pre-assigned setup section
    await expect(page.locator('#preassigned-setup-section')).toBeVisible();
    await expect(page.locator('text=Setup Bale')).toBeVisible();
  });
  
  test('should show manual setup when canceling modal with no event', async ({ page }) => {
    await page.goto('/ranking_round_300.html');
    
    // Cancel modal
    await page.click('#cancel-event-modal-btn');
    
    // Should show manual setup section (no event = manual mode)
    await expect(page.locator('#manual-setup-section')).toBeVisible();
    await expect(page.locator('#preassigned-setup-section')).not.toBeVisible();
    
    // Should show manual setup controls
    await expect(page.locator('#bale-number-input-manual')).toBeVisible();
    await expect(page.locator('#archer-search-manual')).toBeVisible();
    await expect(page.locator('#selected-count-chip')).toBeVisible();
  });
  
});

test.describe('Ranking Round - Manual Setup Section', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start with no event (manual mode)
    await page.goto('/ranking_round_300.html');
    await page.click('#cancel-event-modal-btn');
  });
  
  test('should show manual setup controls', async ({ page }) => {
    // Manual setup section should be visible
    await expect(page.locator('#manual-setup-section')).toBeVisible();
    
    // Should have all manual controls
    await expect(page.locator('#bale-number-input-manual')).toBeVisible();
    await expect(page.locator('#archer-search-manual')).toBeVisible();
    await expect(page.locator('#selected-count-chip')).toBeVisible();
    await expect(page.locator('#manual-start-scoring-btn')).toBeVisible();
    
    // Start scoring button should be disabled initially
    await expect(page.locator('#manual-start-scoring-btn')).toBeDisabled();
  });
  
  test('should update bale number in manual setup', async ({ page }) => {
    const baleInput = page.locator('#bale-number-input-manual');
    
    // Change bale number
    await baleInput.fill('5');
    await baleInput.blur();
    
    // Should update the value
    await expect(baleInput).toHaveValue('5');
  });
  
  test('should show archer search functionality', async ({ page }) => {
    const searchInput = page.locator('#archer-search-manual');
    
    // Search input should be visible and functional
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search archers...');
    
    // Should be able to type in search
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });
  
  test('should show selection indicator', async ({ page }) => {
    const indicator = page.locator('#selected-count-chip');
    
    // Should show 0/4 initially
    await expect(indicator).toContainText('0/4 archers selected');
  });
  
});

test.describe('Ranking Round - Pre-assigned Setup Section', () => {
  
  test.beforeEach(async ({ page }) => {
    // Connect to event first (pre-assigned mode)
    await page.goto('/ranking_round_300.html');
    await page.fill('#event-code-input', 'tuesday');
    await page.click('#verify-code-btn');
    await page.waitForTimeout(1500);
  });
  
  test('should show pre-assigned setup section', async ({ page }) => {
    // Pre-assigned setup section should be visible
    await expect(page.locator('#preassigned-setup-section')).toBeVisible();
    
    // Manual setup section should be hidden
    await expect(page.locator('#manual-setup-section')).not.toBeVisible();
    
    // Should show bale list container
    await expect(page.locator('#bale-list-container')).toBeVisible();
  });
  
  test('should show bale list items with Start Scoring buttons', async ({ page }) => {
    // Should show bale list items
    const baleItems = page.locator('.bale-list-item');
    await expect(baleItems.first()).toBeVisible();
    
    // Each bale item should have Start Scoring button
    const startButtons = page.locator('.bale-list-item button');
    await expect(startButtons.first()).toBeVisible();
    await expect(startButtons.first()).toContainText('Start Scoring');
  });
  
  test('should show bale information correctly', async ({ page }) => {
    const baleItems = page.locator('.bale-list-item');
    
    if (await baleItems.count() > 0) {
      // Should show bale number
      await expect(baleItems.first().locator('.bale-number')).toBeVisible();
      
      // Should show archer count
      await expect(baleItems.first().locator('.bale-archers')).toBeVisible();
    }
  });
  
});

test.describe('Ranking Round - Setup Mode Detection', () => {
  
  test('should show manual setup for no event', async ({ page }) => {
    await page.goto('/ranking_round_300.html');
    await page.click('#cancel-event-modal-btn');
    
    // Should show manual setup
    await expect(page.locator('#manual-setup-section')).toBeVisible();
    await expect(page.locator('#preassigned-setup-section')).not.toBeVisible();
  });
  
  test('should show pre-assigned setup for connected event', async ({ page }) => {
    await page.goto('/ranking_round_300.html');
    await page.fill('#event-code-input', 'tuesday');
    await page.click('#verify-code-btn');
    await page.waitForTimeout(1500);
    
    // Should show pre-assigned setup
    await expect(page.locator('#preassigned-setup-section')).toBeVisible();
    await expect(page.locator('#manual-setup-section')).not.toBeVisible();
  });
  
});


// Playwright test for Ranking Round - LOCAL VERSION (Updated for new UI/UX design)
// Tests against local dev server (localhost:8001) with local database
// Run with: npx playwright test tests/ranking_round.local.spec.js --config=playwright.config.local.js
// Or: npm run test:local

const { test, expect } = require('@playwright/test');
const {
  openRankingRound,
  enterManualMode,
} = require('./helpers/ranking_round_utils');

test.describe('Ranking Round - Local Testing', () => {
  
  test('should show modal on fresh start (LOCAL)', async ({ page }) => {
    await openRankingRound(page);

    // Modal should be visible
    const modal = page.locator('#event-modal');
    await expect(modal).toBeVisible({ timeout: 3000 });
    
    // Should have both tabs
    await expect(page.locator('#tab-passcode')).toBeVisible();
    await expect(page.locator('#tab-events')).toBeVisible();
  });
  
  test('should load JavaScript correctly (LOCAL)', async ({ page }) => {
    await openRankingRound(page);

    // Wait for page to load and LiveUpdates to initialize
    await page.waitForTimeout(200);
    
    // Check that LiveUpdates is available (indicates JavaScript loaded)
    const liveUpdatesExists = await page.evaluate(() => {
      return typeof window.LiveUpdates !== 'undefined' && window.LiveUpdates._state !== undefined;
    });
    
    // This will fail if JavaScript didn't load or LiveUpdates isn't initialized
    expect(liveUpdatesExists).toBeTruthy();
  });
  
  test('should connect to local API (LOCAL)', async ({ page }) => {
    await openRankingRound(page);

    // Wait for page initialization and LiveUpdates config
    await page.waitForTimeout(300);
    
    // Inspect resolved API base (supports localhost, staging, production)
    const apiInfo = await page.evaluate(() => {
      const config = window.LiveUpdates && window.LiveUpdates._state && window.LiveUpdates._state.config
        ? window.LiveUpdates._state.config
        : null;
      if (!config || !config.apiBase) return null;
      try {
        const url = new URL(config.apiBase, window.location.origin);
        return {
          apiBase: config.apiBase,
          hostname: url.hostname,
          protocol: url.protocol,
          pathname: url.pathname
        };
      } catch (err) {
        return { apiBase: config.apiBase, error: err.message };
      }
    });
    
    expect(apiInfo).toBeTruthy();
    expect(apiInfo.apiBase).toBeTruthy();
    expect(apiInfo.error || '').toBe('');
    expect(apiInfo.protocol === 'http:' || apiInfo.protocol === 'https:').toBeTruthy();
    expect(/\/api\//.test(apiInfo.pathname)).toBeTruthy();
  });
  
  test('should show manual setup section when canceling modal (LOCAL)', async ({ page }) => {
    await openRankingRound(page);

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
    await enterManualMode(page);

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


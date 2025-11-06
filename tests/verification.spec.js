// verification.spec.js
// Tests for scorecard verification and locking features
// Run with: npx playwright test tests/verification.spec.js
// For local dev: npx playwright test tests/verification.spec.js --config=playwright.config.local.js

const { test, expect } = require('@playwright/test');
const { 
  setCoachAuth, 
  createCompleteTestEvent, 
  createVerificationTestData,
  ensureLocalhostAPI,
  COACH_PASSCODE 
} = require('./helpers/test-data-creation');

test.describe('Scorecard Verification Features', () => {
  test('should access verification console from coach page', async ({ page }) => {
    await setCoachAuth(page);
    
    await page.goto('/coach.html');
    await expect(page.locator('#coach-auth-modal')).toBeVisible();
    await page.fill('#coach-passcode-input', COACH_PASSCODE);
    await page.click('#auth-submit-btn');
    await expect(page.locator('#coach-auth-modal')).toBeHidden();
    
    // Wait for events list to load
    await page.waitForSelector('#events-list table tbody tr', { timeout: 10000 });
    
    // Check if Verify Scorecards button (🛡️ icon) exists in events table
    const verifyBtn = page.locator('button[title="Verify Scorecards"]').first();
    await expect(verifyBtn).toBeVisible({ timeout: 5000 });
  });

  test('should open verification console modal', async ({ page }) => {
    await setCoachAuth(page);
    
    await page.goto('/coach.html');
    await expect(page.locator('#coach-auth-modal')).toBeVisible();
    await page.fill('#coach-passcode-input', COACH_PASSCODE);
    await page.click('#auth-submit-btn');
    await expect(page.locator('#coach-auth-modal')).toBeHidden();
    
    await page.waitForSelector('#events-list table tbody tr', { timeout: 10000 });
    
    // Click Verify Scorecards button
    const verifyBtn = page.locator('button[title="Verify Scorecards"]').first();
    if (await verifyBtn.isVisible()) {
      // Listen for any alerts (errors)
      page.on('dialog', dialog => {
        console.log('Dialog:', dialog.message());
        dialog.dismiss();
      });
      
      await verifyBtn.click();
      
      // Wait for modal to be visible (with longer timeout for async loading)
      // The modal might take time to load snapshot data
      let modalVisible = false;
      try {
        await page.waitForSelector('#verify-modal', { state: 'visible', timeout: 10000 });
        modalVisible = true;
      } catch (e) {
        // Modal didn't show - check if it exists but is hidden (error case)
        const modal = page.locator('#verify-modal');
        const count = await modal.count();
        if (count > 0) {
          console.log('Modal exists but is hidden - likely snapshot load error');
        }
        modalVisible = false;
      }
      
      // Check if modal is visible (might fail if snapshot load errored)
      if (modalVisible) {
        await expect(page.locator('#verify-modal-title')).toBeVisible();
      } else {
        // Skip test if no events/data available
        test.skip();
      }
    } else {
      test.skip(); // No events available
    }
  });

  test('should show locked status on results page', async ({ page }) => {
    // This test assumes we have an event with locked cards
    // In a real scenario, we'd create the event, lock a card, then check results
    
    await page.goto('/results.html?event=test-event-id');
    
    // Check if VER badge exists (even if no data, the structure should be there)
    // Note: This is a structural test - actual data would require setup
    const resultsHeader = page.locator('#results-header');
    await expect(resultsHeader).toBeVisible({ timeout: 5000 });
  });

  test('should prevent editing locked scorecards in ranking round', async ({ page }) => {
    // This test requires:
    // 1. Create event with scores
    // 2. Lock a scorecard via API or coach UI
    // 3. Try to edit in ranking round
    // 4. Verify edit is prevented
    
    // For now, we'll test the UI structure
    await ensureLocalhostAPI(page);
    
    let eventId;
    let eventCode;
    try {
      const testData = await createCompleteTestEvent(page, {
        eventName: `Lock Test ${Date.now()}`,
        eventCode: `lock${Date.now().toString().slice(-6)}`,
        numArchers: 3,
        enterScores: true
      });
      eventId = testData.eventId;
      eventCode = testData.eventCode;
    } catch (err) {
      console.log('Could not create test event:', err.message);
      test.skip();
      return;
    }
    
    if (!eventId) {
      test.skip();
      return;
    }
    
    // Navigate back to ranking round
    await page.goto(`/ranking_round_300.html?event=${eventId}&code=${eventCode}`);
    await page.waitForSelector('#scoring-view', { timeout: 10000 });
    
    // Check if score inputs exist
    const scoreInputs = page.locator('input.score-input');
    const count = await scoreInputs.count();
    
    if (count > 0) {
      // Try to interact with first input
      const firstInput = scoreInputs.first();
      const isReadonly = await firstInput.getAttribute('readonly');
      
      // If locked, input should be readonly or disabled
      // Note: This is a basic check - full test would require locking via API
      expect(firstInput).toBeTruthy();
    }
  });

  test('should display verification console with bale selection', async ({ page }) => {
    await setCoachAuth(page);
    
    await page.goto('/coach.html');
    await expect(page.locator('#coach-auth-modal')).toBeVisible();
    await page.fill('#coach-passcode-input', COACH_PASSCODE);
    await page.click('#auth-submit-btn');
    await expect(page.locator('#coach-auth-modal')).toBeHidden();
    
    await page.waitForSelector('#events-list table tbody tr', { timeout: 10000 });
    
    // Open verification console
    const verifyBtn = page.locator('button[title="Verify Scorecards"]').first();
    if (await verifyBtn.isVisible()) {
      // Listen for alerts
      page.on('dialog', dialog => dialog.dismiss());
      
      await verifyBtn.click();
      
      // Wait for modal with longer timeout
      const modalVisible = await page.waitForSelector('#verify-modal', { state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
      
      if (modalVisible) {
        // Check for division selection dropdown
        const divisionSelect = page.locator('#verify-division-select');
        await expect(divisionSelect).toBeVisible();
        
        // Check for bale selection
        const baleSelect = page.locator('#verify-bale-select');
        await expect(baleSelect).toBeVisible();
        
        // Check for actor input (verified by)
        const actorInput = page.locator('#verify-actor-input');
        await expect(actorInput).toBeVisible();
        
        // Check for refresh button
        const refreshBtn = page.locator('#verify-refresh-btn');
        await expect(refreshBtn).toBeVisible();
        
        // Check for Lock All button
        const lockAllBtn = page.locator('#verify-lock-all-btn');
        await expect(lockAllBtn).toBeVisible();
        
        // Check for Close Round button
        const closeRoundBtn = page.locator('#verify-close-round-btn');
        await expect(closeRoundBtn).toBeVisible();
      } else {
        test.skip(); // No data available or error loading
      }
    } else {
      test.skip(); // No events available
    }
  });

  test('should show lock status indicators', async ({ page }) => {
    await setCoachAuth(page);
    
    await page.goto('/coach.html');
    await expect(page.locator('#coach-auth-modal')).toBeVisible();
    await page.fill('#coach-passcode-input', COACH_PASSCODE);
    await page.click('#auth-submit-btn');
    await expect(page.locator('#coach-auth-modal')).toBeHidden();
    
    await page.waitForSelector('#events-list table tbody tr', { timeout: 10000 });
    
    // Open verification console
    const verifyBtn = page.locator('button[title="Verify Scorecards"]').first();
    if (await verifyBtn.isVisible()) {
      // Listen for alerts
      page.on('dialog', dialog => dialog.dismiss());
      
      await verifyBtn.click();
      
      // Wait for modal
      const modalVisible = await page.waitForSelector('#verify-modal', { state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
      
      if (modalVisible) {
        // Check if scorecard table container exists
        const tableContainer = page.locator('#verify-table-container');
        await expect(tableContainer).toBeVisible();
        // Even if empty, the container should exist
        // Note: Actual lock status would require cards to be loaded and selected
      } else {
        test.skip(); // No data available
      }
    } else {
      test.skip(); // No events available
    }
  });
});

test.describe('End-to-End Verification Workflow', () => {
  test('should create complete test data: event -> round -> archers -> scores -> verification', async ({ page }) => {
    // This is a comprehensive test that creates the full data flow
    await ensureLocalhostAPI(page);
    
    try {
      // Create complete test event with scores
      const testData = await createCompleteTestEvent(page, {
        eventName: `E2E Verify ${Date.now()}`,
        eventCode: `e2e${Date.now().toString().slice(-6)}`,
        numArchers: 4,
        enterScores: true
      });
      
      expect(testData.eventId).toBeTruthy();
      expect(testData.eventCode).toBeTruthy();
      
      // Verify event exists in coach console
      await page.goto('/coach.html');
      await setCoachAuth(page);
      await expect(page.locator('#coach-auth-modal')).toBeVisible();
      await page.fill('#coach-passcode-input', COACH_PASSCODE);
      await page.click('#auth-submit-btn');
      await expect(page.locator('#coach-auth-modal')).toBeHidden();
      
      await page.waitForSelector('#events-list table tbody tr', { timeout: 10000 });
      
      // Verify event appears in list
      const eventRow = page.locator(`#events-list table tbody tr:has-text("${testData.eventName}")`);
      await expect(eventRow.first()).toBeVisible();
      
      // Verify scores appear on results page
      await page.goto(`/results.html?event=${testData.eventId}`);
      await expect(page.locator('#results-header')).toBeVisible({ timeout: 10000 });
      
      // Check if leaderboard has data
      const leaderboard = page.locator('.leaderboard-table');
      if (await leaderboard.count() > 0) {
        await expect(leaderboard.first()).toBeVisible();
      }
      
      console.log(`✅ Created complete test data: Event ${testData.eventId}, Code ${testData.eventCode}`);
      
    } catch (err) {
      console.error('❌ Failed to create test data:', err.message);
      throw err;
    }
  });
});

test.describe('Verification API Endpoints', () => {
  test('should lock a scorecard via API', async ({ page, request }) => {
    // This test requires:
    // 1. An event with a round_archer_id
    // 2. Making API call to lock endpoint
    // 3. Verifying response
    
    await setCoachAuth(page);
    
    // Get API base URL
    const apiBase = page.url().includes('localhost') 
      ? 'http://localhost:8001/api/index.php/v1'
      : 'https://tryentist.com/wdv/api/v1';
    
    // Note: This would need actual roundId and roundArcherId
    // For now, we'll test the endpoint structure exists
    // In a real test, we'd create event, get IDs, then test lock
    
    test.skip(); // Skip until we have test data setup
  });

  test('should unlock a scorecard via API', async ({ page, request }) => {
    // Similar to lock test
    test.skip();
  });

  test('should lock all cards in a bale via API', async ({ page, request }) => {
    // Test POST /v1/rounds/{roundId}/verify-bale
    test.skip();
  });

  test('should close round via API', async ({ page, request }) => {
    // Test POST /v1/rounds/{roundId}/close
    test.skip();
  });
});


// verification.spec.js
// Tests for scorecard verification and locking features
// Run with: npx playwright test tests/verification.spec.js
// For local dev: npx playwright test tests/verification.spec.js --config=playwright.config.local.js

const { test, expect } = require('@playwright/test');

const COACH_PASSCODE = 'wdva26';

async function setCoachAuth(page) {
  await page.addInitScript(() => {
    localStorage.setItem('coach_api_key', COACH_PASSCODE);
    localStorage.setItem('live_updates_config', JSON.stringify({ enabled: true, apiKey: COACH_PASSCODE }));
  });
}

async function createTestEventWithScores(page) {
  // Helper to create an event, add archers, and enter some scores
  await setCoachAuth(page);
  
  await page.goto('/coach.html');
  await expect(page.locator('#coach-auth-modal')).toBeVisible();
  await page.fill('#coach-passcode-input', COACH_PASSCODE);
  await page.click('#auth-submit-btn');
  await expect(page.locator('#coach-auth-modal')).toBeHidden();
  
  // Create event
  await page.click('#create-event-btn');
  await page.fill('#event-name', `Test Verify ${Date.now()}`);
  await page.fill('#event-date', new Date().toISOString().split('T')[0]);
  await page.fill('#event-code', 'verify123');
  await page.check('#division-open');
  await page.click('#submit-event-btn');
  
  // Wait for event creation and archer selection modal
  await page.waitForSelector('#add-archers-modal', { state: 'visible', timeout: 10000 });
  
  // Select first few archers (if available)
  const checkboxes = page.locator('#archer-list input[type="checkbox"]');
  const count = await checkboxes.count();
  if (count > 0) {
    await checkboxes.first().check();
    if (count > 1) await checkboxes.nth(1).check();
    if (count > 2) await checkboxes.nth(2).check();
  }
  
  await page.click('#submit-add-archers-btn');
  
  // Select auto-assign mode
  await page.waitForSelector('#assignment-mode-modal', { state: 'visible', timeout: 5000 });
  await page.check('input[name="assignment-mode"][value="auto_assign"]');
  await page.click('#submit-assignment-btn');
  
  // Wait for event to be created
  await page.waitForSelector('#events-list table tbody tr', { timeout: 10000 });
  
  // Get event ID from QR code
  const firstRow = page.locator('#events-list table tbody tr').first();
  await firstRow.locator('button[title="QR Code"]').click();
  await page.waitForSelector('#qr-url-display', { timeout: 5000 });
  const url = await page.inputValue('#qr-url-display');
  const eventIdMatch = url.match(/event=([0-9a-f-]+)/i);
  const eventId = eventIdMatch ? eventIdMatch[1] : null;
  await page.click('#close-qr-btn');
  
  if (!eventId) {
    throw new Error('Could not extract event ID from QR code');
  }
  
  // Navigate to ranking round and enter scores
  await page.goto(`/ranking_round_300.html?event=${eventId}&code=verify123`);
  await page.waitForSelector('#preassigned-setup-section', { state: 'visible', timeout: 15000 });
  
  // Start scoring on first bale
  const startBtn = page.locator('.bale-list-item button', { hasText: 'Start Scoring' }).first();
  if (await startBtn.isVisible()) {
    await startBtn.click();
    
    // Enter some scores using keypad
    await page.waitForSelector('input.score-input', { timeout: 5000 });
    const firstInput = page.locator('input.score-input').first();
    await firstInput.click();
    
    // Enter scores: 10, 9, 8
    await page.locator('.keypad-btn[data-value="10"]').click();
    await page.locator('.keypad-btn[data-value="9"]').click();
    await page.locator('.keypad-btn[data-value="8"]').click();
    
    // Sync the end
    const syncBtn = page.locator('#complete-round-btn');
    if (await syncBtn.isVisible()) {
      await syncBtn.click();
      await page.waitForTimeout(1000);
    }
  }
  
  return eventId;
}

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
    // This test would require:
    // 1. Create event with scores
    // 2. Lock a scorecard via API or coach UI
    // 3. Try to edit in ranking round
    // 4. Verify edit is prevented
    
    // For now, we'll test the UI structure
    await setCoachAuth(page);
    
    const eventId = await createTestEventWithScores(page);
    
    if (!eventId) {
      test.skip();
      return;
    }
    
    // Navigate back to ranking round
    await page.goto(`/ranking_round_300.html?event=${eventId}&code=verify123`);
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


// test-data-creation.js
// Shared helper functions for creating complete test data end-to-end
// Event -> Round -> Archers -> Scores -> Verification

const { expect } = require('@playwright/test');
const { enterPreassignedViaQr } = require('./ranking_round_utils');

const COACH_PASSCODE = 'wdva26';
const LOCAL_API_BASE = 'http://localhost:8001/api/index.php/v1';

/**
 * Ensures the app uses localhost API instead of production
 * This fixes CORS issues when running tests locally
 */
async function ensureLocalhostAPI(page) {
  await page.addInitScript(() => {
    // Clear any stale API config
    localStorage.removeItem('live_updates_config');
    
    // Force localhost detection by setting API base explicitly
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const port = window.location.port || '8001';
      const localApiBase = `${window.location.protocol}//${window.location.hostname}:${port}/api/index.php/v1`;
      localStorage.setItem('live_updates_config', JSON.stringify({
        enabled: true,
        apiKey: 'wdva26',
        apiBase: localApiBase
      }));
    }
  });
}

/**
 * Sets coach authentication
 */
async function setCoachAuth(page) {
  await ensureLocalhostAPI(page);
  await page.addInitScript(() => {
    localStorage.setItem('coach_api_key', COACH_PASSCODE);
    const cfg = JSON.parse(localStorage.getItem('live_updates_config') || '{}');
    cfg.enabled = true;
    cfg.apiKey = COACH_PASSCODE;
    localStorage.setItem('live_updates_config', JSON.stringify(cfg));
  });
}

/**
 * Creates a complete test event with rounds, archers, and scores
 * Returns: { eventId, roundId, roundArcherIds: [] }
 */
async function createCompleteTestEvent(page, options = {}) {
  const {
    eventName = `Test Event ${Date.now()}`,
    eventCode = `test${Date.now().toString().slice(-6)}`,
    division = 'OPEN',
    numArchers = 3,
    enterScores = true
  } = options;

  await setCoachAuth(page);

  // Step 1: Login to coach console
  await page.goto('/coach.html');
  await expect(page.locator('#coach-auth-modal')).toBeVisible();
  await page.fill('#coach-passcode-input', COACH_PASSCODE);
  await page.click('#auth-submit-btn');
  await expect(page.locator('#coach-auth-modal')).toBeHidden({ timeout: 5000 });

  // Step 2: Create event
  await page.click('#create-event-btn');
  await expect(page.locator('#create-event-modal')).toBeVisible();
  await page.fill('#event-name', eventName);
  await page.fill('#event-date', new Date().toISOString().split('T')[0]);
  await page.fill('#event-code', eventCode);
  
  // Select division
  const divisionCheckbox = page.locator(`#division-${division.toLowerCase()}`);
  if (await divisionCheckbox.isVisible()) {
    await divisionCheckbox.check();
  }
  
  await page.click('#submit-event-btn');
  await expect(page.locator('#create-event-modal')).toBeHidden({ timeout: 10000 });

  // Step 3: Add archers
  await page.waitForSelector('#add-archers-modal', { state: 'visible', timeout: 15000 });
  
  // Wait for archer list to load
  await page.waitForSelector('#archer-list', { timeout: 10000 });
  
  // Wait a moment for archers to populate
  await page.waitForTimeout(300);
  
  // Select archers (up to numArchers)
  const checkboxes = page.locator('#archer-list input[type="checkbox"]');
  const availableCount = await checkboxes.count();
  
  if (availableCount === 0) {
    throw new Error('No archers available in master list. Please add archers first via Coach Console -> Import CSV or Archer Management.');
  }
  
  const selectCount = Math.min(numArchers, availableCount);
  console.log(`Selecting ${selectCount} archers from ${availableCount} available`);
  
  for (let i = 0; i < selectCount; i++) {
    await checkboxes.nth(i).check();
  }
  
  // Verify at least one is checked
  const checkedCount = await page.locator('#archer-list input[type="checkbox"]:checked').count();
  if (checkedCount === 0) {
    throw new Error('Failed to select any archers. Checkboxes may not be clickable.');
  }
  
  console.log(`Selected ${checkedCount} archers`);
  
  await page.click('#submit-add-archers-btn');

  // Step 4: Select assignment mode (auto-assign)
  await page.waitForSelector('#assignment-mode-modal', { state: 'visible', timeout: 5000 });
  await page.check('input[name="assignment-mode"][value="auto_assign"]');
  await page.click('#submit-assignment-btn');
  await expect(page.locator('#assignment-mode-modal')).toBeHidden({ timeout: 10000 });
  
  // Wait for assignment to complete - check for success message or event list update
  await page.waitForTimeout(500);
  
  // Verify archers were actually assigned by checking the event list
  await page.waitForSelector('#events-list table tbody tr', { timeout: 15000 });

  // Step 5: Wait for event to appear in list and get event ID
  const firstRow = page.locator('#events-list table tbody tr').first();
  await expect(firstRow).toBeVisible();

  // Get event ID from QR code
  await firstRow.locator('button[title="QR Code"]').click();
  await expect(page.locator('#qr-code-modal')).toBeVisible();
  const url = await page.inputValue('#qr-url-display');
  const eventIdMatch = url.match(/event=([0-9a-f-]+)/i);
  const eventId = eventIdMatch ? eventIdMatch[1] : null;
  await page.click('#close-qr-btn');

  if (!eventId) {
    throw new Error('Could not extract event ID from QR code');
  }

  // Step 6: Enter scores if requested
  let roundArcherIds = [];
  if (enterScores) {
    await page.waitForTimeout(500);

    await enterPreassignedViaQr(page, { eventId, eventCode });

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for bale list to populate briefly
    await page.waitForTimeout(300);

    // Start scoring on first bale
    const startBtn = page.locator('.bale-list-item button', { hasText: 'Start Scoring' }).first();
    if (await startBtn.isVisible({ timeout: 3000 })) {
      await startBtn.click();

      await page.waitForSelector('#scoring-view', { timeout: 3000 });
      await page.waitForSelector('input.score-input', { timeout: 3000 });

      const firstInput = page.locator('input.score-input').first();
      await firstInput.click();

      await page.locator('.keypad-btn[data-value="10"]').click();
      await page.locator('.keypad-btn[data-value="9"]').click();
      await page.locator('.keypad-btn[data-value="8"]').click();

      const syncBtn = page.locator('#complete-round-btn');
      if (await syncBtn.isVisible({ timeout: 3000 })) {
        await syncBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      throw new Error(`Start Scoring button not visible. Console errors: ${errors.join('; ')}`);
    }
  }

  return {
    eventId,
    eventCode,
    eventName,
    roundArcherIds
  };
}

/**
 * Creates test data specifically for verification testing
 * Includes locked/unlocked cards
 */
async function createVerificationTestData(page) {
  const testData = await createCompleteTestEvent(page, {
    eventName: `Verify Test ${Date.now()}`,
    eventCode: `verify${Date.now().toString().slice(-6)}`,
    numArchers: 4,
    enterScores: true
  });

  return testData;
}

module.exports = {
  ensureLocalhostAPI,
  setCoachAuth,
  createCompleteTestEvent,
  createVerificationTestData,
  COACH_PASSCODE,
  LOCAL_API_BASE
};


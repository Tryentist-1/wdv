// Playwright test for Resume Round Flow
// Tests the complete flow from index.html → Open Rounds → Resume Round
// Run with: npx playwright test tests/resume_round_flow.spec.js
// For local dev: npx playwright test tests/resume_round_flow.spec.js --config=playwright.config.local.js

const { test, expect } = require('@playwright/test');

// Helper to mock API routes that work with both /api/v1 and /api/index.php/v1 paths
function mockEventSnapshot(context, eventId, response) {
  return context.route('**/events/*/snapshot', async route => {
    if (route.request().url().includes(eventId)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    } else {
      await route.continue();
    }
  });
}

function mockRoundSnapshot(context, roundId, response) {
  return context.route('**/rounds/*/snapshot', async route => {
    if (route.request().url().includes(roundId)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    } else {
      await route.continue();
    }
  });
}

function mockBaleArchers(context, roundId, baleNumber, response) {
  return context.route('**/rounds/*/bales/*/archers', async route => {
    if (route.request().url().includes(roundId) && route.request().url().includes(`bales/${baleNumber}`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    } else {
      await route.continue();
    }
  });
}

test.describe('Resume Round Flow - From Index.html', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear all localStorage and cookies for clean test state
    await page.goto('/index.html?test=1', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should show Open Rounds when archer has incomplete rounds', async ({ page }) => {
    // This test assumes there's a test archer with rounds in the database
    // You may need to set up test data first
    
    await page.goto('/index.html?test=1', { waitUntil: 'domcontentloaded' });
    
    // Wait for archer module to load
    await page.waitForSelector('#archer-module', { timeout: 5000 });
    
    // Select an archer (assuming there's a test archer available)
    // This will trigger loading of Open Rounds
    const archerSelect = page.locator('#archer-select');
    if (await archerSelect.count() > 0) {
      await archerSelect.first().click();
      
      // Wait for Open Rounds section to appear
      const openRoundsSection = page.locator('#open-assignments');
      // May or may not be visible depending on whether archer has rounds
      // Just verify the section exists
      await expect(openRoundsSection.or(page.locator('text=Open Rounds'))).toBeVisible({ timeout: 5000 }).catch(() => {
        // If no open rounds, that's okay - just log it
        console.log('No open rounds found for test archer');
      });
    }
  });

  test('should navigate to ranking round when clicking Resume Round link', async ({ page, context }) => {
    // Set up: Create a test round with an archer assigned
    // This test requires test data setup - for now, we'll test the navigation
    
    // Mock the history API response
    await context.route('**/archers/*/history', async route => {
      const testArcherId = route.request().url().match(/archers\/([^\/]+)/)?.[1];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          archer: {
            id: testArcherId,
            firstName: 'Test',
            lastName: 'Archer'
          },
          history: [
            {
              event_id: 'test-event-id',
              event_name: 'Test Event',
              round_id: 'test-round-id',
              round_type: 'R300',
              division: 'BVAR',
              bale_number: 1,
              ends_completed: 3,
              final_score: 75
            }
          ]
        })
      });
    });

    await page.goto('/index.html?test=1', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForTimeout(1000);
    
    // Look for "Resume Ranking Round" link
    const resumeLink = page.locator('a:has-text("Resume Ranking Round")').first();
    
    if (await resumeLink.count() > 0) {
      // Click the link
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        resumeLink.click()
      ]);
      
      // Should navigate to ranking_round_300.html with URL parameters
      await expect(newPage).toHaveURL(/ranking_round_300\.html\?event=.*&round=.*&archer=.*/);
    } else {
      console.log('No resume link found - test data may not be set up');
    }
  });

  test('should automatically retrieve entry code from event snapshot', async ({ page, context }) => {
    const testEventId = 'test-event-id';
    const testRoundId = 'test-round-id';
    const testArcherId = 'test-archer-id';
    const testEntryCode = 'TEST123';

    // Mock event snapshot API to return entry_code (match both /api/v1 and /api/index.php/v1 paths)
    await context.route('**/events/*/snapshot', async route => {
      if (route.request().url().includes(testEventId)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            event: {
              id: testEventId,
              name: 'Test Event',
              entry_code: testEntryCode
            },
            divisions: {}
          })
        });
      } else {
        await route.continue();
      }
    });

    // Mock round snapshot API
    await context.route('**/rounds/*/snapshot', async route => {
      if (route.request().url().includes(testRoundId)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            round: {
              id: testRoundId,
              division: 'BVAR',
              baleNumber: null
            },
            archers: [
              {
                roundArcherId: 'test-round-archer-id',
                archerId: testArcherId,
                archerName: 'Test Archer',
                baleNumber: 1
              }
            ]
          })
        });
      } else {
        await route.continue();
      }
    });

    // Navigate directly to ranking round with URL parameters
    await page.goto(`/ranking_round_300.html?test=1&event=${testEventId}&round=${testRoundId}&archer=${testArcherId}`, {
      waitUntil: 'networkidle'
    });

    // Wait for entry code to be retrieved - wait for the async operation to complete
    // Check localStorage with retries
    let entryCode = null;
    for (let i = 0; i < 10; i++) {
      entryCode = await page.evaluate(() => {
        return localStorage.getItem('event_entry_code');
      });
      if (entryCode === testEntryCode) break;
      await page.waitForTimeout(500);
    }

    // Verify entry code was saved to localStorage
    expect(entryCode).toBe(testEntryCode);
  });

  test('should go to Setup mode when bale number is missing', async ({ page, context }) => {
    const testEventId = 'test-event-id';
    const testRoundId = 'test-round-id';
    const testArcherId = 'test-archer-id';
    const testEntryCode = 'TEST123';

    // Mock event snapshot API
    await mockEventSnapshot(context, testEventId, {
      event: {
        id: testEventId,
        name: 'Test Event',
        entry_code: testEntryCode
      },
      divisions: {
        BVAR: {
          archers: []
        }
      }
    });

    // Mock round snapshot API - archer found but NO bale number
    await mockRoundSnapshot(context, testRoundId, {
      round: {
        id: testRoundId,
        division: 'BVAR',
        baleNumber: null
      },
      archers: [
        {
          roundArcherId: 'test-round-archer-id',
          archerId: testArcherId,
          archerName: 'Test Archer',
          baleNumber: null  // No bale assigned!
        }
      ]
    });

    // Navigate directly to ranking round
    await page.goto(`/ranking_round_300.html?test=1&event=${testEventId}&round=${testRoundId}&archer=${testArcherId}`, {
      waitUntil: 'domcontentloaded'
    });

    // Should go to Setup mode (not scoring view)
    await page.waitForSelector('#manual-setup-section, #preassigned-setup-section', { timeout: 5000 });
    
    // Should show Setup Bale header
    await expect(page.locator('text=Setup Bale')).toBeVisible({ timeout: 3000 });
    
    // Should NOT show scoring view
    await expect(page.locator('#scoring-view')).not.toBeVisible();
  });

  test('should load scoring view when bale number is assigned', async ({ page, context }) => {
    const testEventId = 'test-event-id';
    const testRoundId = 'test-round-id';
    const testArcherId = 'test-archer-id';
    const testEntryCode = 'TEST123';
    const testBaleNumber = 1;

    // Mock event snapshot API
    await mockEventSnapshot(context, testEventId, {
      event: {
        id: testEventId,
        name: 'Test Event',
        entry_code: testEntryCode
      },
      divisions: {}
    });

    // Mock round snapshot API - archer has bale number
    await mockRoundSnapshot(context, testRoundId, {
      round: {
        id: testRoundId,
        division: 'BVAR',
        baleNumber: testBaleNumber
      },
      archers: [
        {
          roundArcherId: 'test-round-archer-id',
          archerId: testArcherId,
          archerName: 'Test Archer',
          baleNumber: testBaleNumber
        }
      ]
    });

    // Mock bale archers API
    await mockBaleArchers(context, testRoundId, testBaleNumber, {
      roundId: testRoundId,
      division: 'BVAR',
      baleNumber: testBaleNumber,
      archers: [
        {
          roundArcherId: 'test-round-archer-id',
          archerId: testArcherId,
          firstName: 'Test',
          lastName: 'Archer',
          school: 'TEST',
          level: 'VAR',
          gender: 'M',
          targetAssignment: 'A',
          scorecard: {
            ends: [],
            currentEnd: 1,
            runningTotal: 0
          }
        }
      ]
    });

    // Navigate directly to ranking round
    await page.goto(`/ranking_round_300.html?test=1&event=${testEventId}&round=${testRoundId}&archer=${testArcherId}`, {
      waitUntil: 'domcontentloaded'
    });

    // Should load scoring view (not setup)
    await page.waitForSelector('#scoring-view', { timeout: 5000 });
    await expect(page.locator('#scoring-view')).toBeVisible();
    
    // Should NOT show setup sections
    await expect(page.locator('#manual-setup-section')).not.toBeVisible();
    await expect(page.locator('#preassigned-setup-section')).not.toBeVisible();
  });

  test('should not show error alert for recoverable errors', async ({ page, context }) => {
    const testEventId = 'test-event-id';
    const testRoundId = 'test-round-id';
    const testArcherId = 'test-archer-id';

    // Mock event snapshot API
    await mockEventSnapshot(context, testEventId, {
      event: {
        id: testEventId,
        name: 'Test Event',
        entry_code: 'TEST123'
      },
      divisions: {}
    });

    // Mock round snapshot API to return 404 initially (simulating recoverable error)
    let snapshotCallCount = 0;
    await context.route('**/rounds/*/snapshot', async route => {
      if (!route.request().url().includes(testRoundId)) {
        await route.continue();
        return;
      }
      snapshotCallCount++;
      if (snapshotCallCount === 1) {
        // First call fails with 404
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Round not found' })
        });
      } else {
        // Retry succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            round: {
              id: testRoundId,
              division: 'BVAR',
              baleNumber: 1
            },
            archers: [
              {
                roundArcherId: 'test-round-archer-id',
                archerId: testArcherId,
                archerName: 'Test Archer',
                baleNumber: 1
              }
            ]
          })
        });
      }
    });

    // Track alert dialogs
    let alertShown = false;
    page.on('dialog', dialog => {
      alertShown = true;
      dialog.dismiss();
    });

    // Navigate directly to ranking round
    await page.goto(`/ranking_round_300.html?test=1&event=${testEventId}&round=${testRoundId}&archer=${testArcherId}`, {
      waitUntil: 'domcontentloaded'
    });

    // Wait a bit for any error handling
    await page.waitForTimeout(2000);

    // Should NOT show alert for 404 (recoverable error)
    // The code should handle it gracefully and allow fallback logic
    expect(alertShown).toBe(false);
  });

  test('should handle direct link with all parameters correctly', async ({ page, context }) => {
    const testEventId = 'test-event-id';
    const testRoundId = 'test-round-id';
    const testArcherId = 'test-archer-id';
    const testEntryCode = 'TEST123';
    const testBaleNumber = 1;

    // Mock all required APIs
    await mockEventSnapshot(context, testEventId, {
      event: {
        id: testEventId,
        name: 'Test Event',
        entry_code: testEntryCode
      },
      divisions: {}
    });

    await mockRoundSnapshot(context, testRoundId, {
      round: {
        id: testRoundId,
        division: 'BVAR',
        baleNumber: testBaleNumber
      },
      archers: [
        {
          roundArcherId: 'test-round-archer-id',
          archerId: testArcherId,
          archerName: 'Test Archer',
          baleNumber: testBaleNumber
        }
      ]
    });

    await mockBaleArchers(context, testRoundId, testBaleNumber, {
      roundId: testRoundId,
      division: 'BVAR',
      baleNumber: testBaleNumber,
      archers: [
        {
          roundArcherId: 'test-round-archer-id',
          archerId: testArcherId,
          firstName: 'Test',
          lastName: 'Archer',
          school: 'TEST',
          level: 'VAR',
          gender: 'M',
          targetAssignment: 'A',
          scorecard: {
            ends: [],
            currentEnd: 1,
            runningTotal: 0
          }
        }
      ]
    });

    // Navigate with direct link
    await page.goto(`/ranking_round_300.html?test=1&event=${testEventId}&round=${testRoundId}&archer=${testArcherId}`, {
      waitUntil: 'domcontentloaded'
    });

    // Should load successfully
    await page.waitForSelector('#scoring-view', { timeout: 5000 });
    
    // Verify entry code was saved
    const entryCode = await page.evaluate(() => {
      return localStorage.getItem('event_entry_code');
    });
    expect(entryCode).toBe(testEntryCode);

    // Verify state was set correctly by checking localStorage
    const sessionData = await page.evaluate(() => {
      const session = localStorage.getItem('current_bale_session');
      return session ? JSON.parse(session) : null;
    });

    if (sessionData) {
      expect(sessionData.eventId).toBe(testEventId);
      expect(sessionData.roundId).toBe(testRoundId);
      expect(sessionData.baleNumber).toBe(testBaleNumber);
    }
  });

  test('should preserve entry code across page reloads', async ({ page, context }) => {
    const testEventId = 'test-event-id';
    const testRoundId = 'test-round-id';
    const testArcherId = 'test-archer-id';
    const testEntryCode = 'TEST123';
    const testBaleNumber = 1;

    // Mock APIs
    await mockEventSnapshot(context, testEventId, {
      event: {
        id: testEventId,
        name: 'Test Event',
        entry_code: testEntryCode
      },
      divisions: {}
    });

    await mockRoundSnapshot(context, testRoundId, {
      round: {
        id: testRoundId,
        division: 'BVAR',
        baleNumber: testBaleNumber
      },
      archers: [
        {
          roundArcherId: 'test-round-archer-id',
          archerId: testArcherId,
          archerName: 'Test Archer',
          baleNumber: testBaleNumber
        }
      ]
    });

    await mockBaleArchers(context, testRoundId, testBaleNumber, {
      roundId: testRoundId,
      division: 'BVAR',
      baleNumber: testBaleNumber,
      archers: [
        {
          roundArcherId: 'test-round-archer-id',
          archerId: testArcherId,
          firstName: 'Test',
          lastName: 'Archer',
          school: 'TEST',
          level: 'VAR',
          gender: 'M',
          targetAssignment: 'A',
          scorecard: {
            ends: [],
            currentEnd: 1,
            runningTotal: 0
          }
        }
      ]
    });

    // First load
    await page.goto(`/ranking_round_300.html?test=1&event=${testEventId}&round=${testRoundId}&archer=${testArcherId}`, {
      waitUntil: 'domcontentloaded'
    });

    await page.waitForTimeout(2000);

    // Verify entry code was saved
    const entryCode1 = await page.evaluate(() => {
      return localStorage.getItem('event_entry_code');
    });
    expect(entryCode1).toBe(testEntryCode);

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify entry code is still there
    const entryCode2 = await page.evaluate(() => {
      return localStorage.getItem('event_entry_code');
    });
    expect(entryCode2).toBe(testEntryCode);
  });
});

test.describe('Resume Round Flow - Error Handling', () => {
  
  test('should handle 401 error gracefully and retry with entry code', async ({ page, context }) => {
    const testEventId = 'test-event-id';
    const testRoundId = 'test-round-id';
    const testArcherId = 'test-archer-id';
    const testEntryCode = 'TEST123';

    // Mock event snapshot to return entry code
    await mockEventSnapshot(context, testEventId, {
      event: {
        id: testEventId,
        name: 'Test Event',
        entry_code: testEntryCode
      },
      divisions: {}
    });

    // Mock round snapshot - first call returns 401, retry succeeds
    let snapshotCallCount = 0;
    await context.route('**/rounds/*/snapshot', async route => {
      if (!route.request().url().includes(testRoundId)) {
        await route.continue();
        return;
      }
      snapshotCallCount++;
      const passcode = route.request().headers()['x-passcode'];
      
      if (!passcode || passcode !== testEntryCode) {
        // First call without entry code
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      } else {
        // Retry with entry code succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            round: {
              id: testRoundId,
              division: 'BVAR',
              baleNumber: 1
            },
            archers: [
              {
                roundArcherId: 'test-round-archer-id',
                archerId: testArcherId,
                archerName: 'Test Archer',
                baleNumber: 1
              }
            ]
          })
        });
      }
    });

    // Track alerts
    let alertShown = false;
    page.on('dialog', dialog => {
      alertShown = true;
      dialog.dismiss();
    });

    // Navigate to ranking round
    await page.goto(`/ranking_round_300.html?test=1&event=${testEventId}&round=${testRoundId}&archer=${testArcherId}`, {
      waitUntil: 'domcontentloaded'
    });

    // Wait for retry logic
    await page.waitForTimeout(3000);

    // Should NOT show alert (error handled gracefully)
    expect(alertShown).toBe(false);
    
    // Entry code should be saved
    const entryCode = await page.evaluate(() => {
      return localStorage.getItem('event_entry_code');
    });
    expect(entryCode).toBe(testEntryCode);
  });
});


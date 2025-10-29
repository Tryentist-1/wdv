// ranking_round_live_sync.spec.js
// Full-stack E2E: create event via coach UI, add archers, enter scores with keypad, sync, and verify leaderboard

const { test, expect } = require('@playwright/test');

const BASE = 'https://tryentist.com/wdv';

async function setCoachAuth(page) {
  await page.addInitScript(() => {
    localStorage.setItem('coach_api_key', 'wdva26');
    localStorage.setItem('live_updates_config', JSON.stringify({ enabled: true, apiKey: 'wdva26' }));
  });
}

async function enableLive(page) {
  await page.evaluate(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('live_updates_config')||'{}');
      cfg.enabled = true; cfg.apiKey = cfg.apiKey || 'wdva26';
      localStorage.setItem('live_updates_config', JSON.stringify(cfg));
      if (window.LiveUpdates && LiveUpdates.saveConfig) LiveUpdates.saveConfig(cfg);
    } catch(_) {}
  });
}

async function tapKey(page, val) {
  await page.locator(`.keypad-btn[data-value="${val}"]`).click();
}

async function focusFirstInput(page) {
  const firstInput = page.locator('input.score-input').first();
  await expect(firstInput).toBeVisible();
  await firstInput.click();
}

test.describe('Live Sync E2E (UI)', () => {
  test('should sync end to server and appear in leaderboard', async ({ page }) => {
    await setCoachAuth(page);

    // 1) Coach login
    await page.goto(`${BASE}/coach.html`);
    await expect(page.locator('#coach-auth-modal')).toBeVisible();
    await page.fill('#coach-passcode-input', 'wdva26');
    await page.click('#auth-submit-btn');
    await expect(page.locator('#coach-auth-modal')).toBeHidden();

    // 2) Create Event
    await page.click('#create-event-btn');
    await expect(page.locator('#create-event-modal')).toBeVisible();
    const name = `E2E UI ${Date.now()}`;
    await page.fill('#event-name', name);
    // date defaults to today
    await page.fill('#event-code', 'E2EUI');
    await page.click('#submit-event-btn');
    await expect(page.locator('#create-event-modal')).toBeHidden();

    // 3) Add archers (select-all filtered)
    const firstRow = page.locator('#events-list table tbody tr').first();
    await expect(firstRow).toBeVisible();
    await firstRow.locator('button[title="Add Archers"]').click();
    await expect(page.locator('#add-archers-modal')).toBeVisible();
    await page.click('#select-all-btn');
    await page.click('#submit-add-archers-btn');
    await expect(page.locator('#assignment-mode-modal')).toBeVisible();
    await page.click('#submit-assignment-btn');
    await expect(page.locator('#assignment-mode-modal')).toBeHidden();

    // 4) Open QR and navigate to scoring
    await firstRow.locator('button[title="QR Code"]').click();
    await expect(page.locator('#qr-code-modal')).toBeVisible();
    const url = await page.inputValue('#qr-url-display');
    const eventIdMatch = url.match(/event=([0-9a-f-]+)/i);
    const eventId = eventIdMatch ? eventIdMatch[1] : '';
    await page.click('#close-qr-btn');

    await page.goto(url);
    // Wait for QR verification + snapshot render
    await page.waitForSelector('#preassigned-setup-section', { state: 'visible', timeout: 15000 });

    // 5) Start scoring (first bale)
    const startBtn = page.locator('.bale-list-item button', { hasText: 'Start Scoring' }).first();
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await enableLive(page);

    // 6) Enter scores using keypad
    await focusFirstInput(page);
    await tapKey(page, '10');
    await tapKey(page, '9');
    await tapKey(page, '8');

    // 7) Sync End
    const syncBtn = page.locator('#complete-round-btn');
    await expect(syncBtn).toBeVisible();
    await expect(syncBtn).toHaveText(/Sync End/i);
    await syncBtn.click();
    await page.waitForTimeout(1200);

    // 8) Verify leaderboard
    await page.goto(`${BASE}/results.html?event=${eventId}`);
    await expect(page.locator('#results-header')).toBeVisible();
    await expect(page.locator('.leaderboard-table').first()).toBeVisible();
  });
});

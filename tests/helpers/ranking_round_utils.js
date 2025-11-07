const DEFAULT_EVENT_ID = process.env.PLAYWRIGHT_TEST_EVENT_ID || 'c60bdfdc-61a0-43e4-a754-074b59b1336f';
const DEFAULT_EVENT_CODE = process.env.PLAYWRIGHT_TEST_EVENT_CODE || 'test';

/**
 * Opens ranking round in test mode (?test=1)
 * The app will automatically clear all session data and show the event modal
 */
async function openRankingRound(page) {
  await page.goto('/ranking_round_300.html?test=1', { waitUntil: 'domcontentloaded' });
  // In test mode, app always starts with event modal visible
  await page.waitForSelector('#event-modal', { state: 'visible', timeout: 3000 });
}

/**
 * Opens ranking round and enters manual mode by canceling the event modal
 */
async function enterManualMode(page) {
  await openRankingRound(page);
  // Modal is visible, click cancel to enter manual mode
  await page.click('#cancel-event-modal-btn');
  await page.waitForSelector('#manual-setup-section', { state: 'visible', timeout: 3000 });
}

/**
 * Opens ranking round and enters pre-assigned mode by entering an event code
 */
async function enterPreassignedMode(page, { eventCode = DEFAULT_EVENT_CODE } = {}) {
  await openRankingRound(page);
  // Modal is visible, enter event code
  await page.fill('#event-code-input', eventCode);
  await page.click('#verify-code-btn');
  await page.waitForSelector('#preassigned-setup-section', { state: 'visible', timeout: 3000 });
}

/**
 * Opens ranking round via QR code URL (with test=1 flag for clean state)
 * The app will verify the code and load the pre-assigned setup
 */
async function enterPreassignedViaQr(page, { eventId = DEFAULT_EVENT_ID, eventCode = DEFAULT_EVENT_CODE } = {}) {
  await page.goto(`/ranking_round_300.html?test=1&event=${eventId}&code=${eventCode}`, { waitUntil: 'domcontentloaded' });
  // App should verify QR code and show pre-assigned setup directly
  await page.waitForSelector('#preassigned-setup-section', { state: 'visible', timeout: 3000 });
}

module.exports = {
  DEFAULT_EVENT_ID,
  DEFAULT_EVENT_CODE,
  openRankingRound,
  enterManualMode,
  enterPreassignedMode,
  enterPreassignedViaQr,
};

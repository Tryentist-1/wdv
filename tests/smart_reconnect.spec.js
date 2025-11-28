const { test, expect } = require('@playwright/test');

test.describe('Smart Reconnect Flow', () => {
    const MOCK_EVENT_ID = 'evt_123';
    const MOCK_ROUND_ID = 'rnd_456';
    const MOCK_ARCHER_ID = 'arch_789';

    test.beforeEach(async ({ page }) => {
        // Mock the LiveUpdates config to ensure it's enabled
        await page.addInitScript(() => {
            localStorage.setItem('live_updates_config', JSON.stringify({ enabled: true }));
        });
    });

    test('should prompt to rejoin if active round exists', async ({ page }) => {
        // Mock event list
        await page.route('**/api/v1/events', async route => {
            await route.fulfill({
                json: {
                    events: [{ id: MOCK_EVENT_ID, name: 'Test Event', date: '2023-01-01', status: 'Active' }]
                }
            });
        });

        // Mock event snapshot (needed for pre-assigned mode)
        await page.route(`**/api/v1/events/${MOCK_EVENT_ID}/snapshot`, async route => {
            await route.fulfill({
                json: {
                    snapshot: {
                        divisions: {
                            'Div1': {
                                archers: [
                                    { id: 'a1', first_name: 'Test', last_name: 'Archer', bale: 1, target: 'A' }
                                ]
                            }
                        }
                    }
                }
            });
        });

        // Mock the check for active rounds
        await page.route(`**/api/v1/rounds?event_id=${MOCK_EVENT_ID}&bale_number=1`, async route => {
            await route.fulfill({
                json: {
                    rounds: [{
                        id: MOCK_ROUND_ID,
                        status: 'Active',
                        event_id: MOCK_EVENT_ID,
                        bale_number: 1
                    }]
                }
            });
        });

        // Navigate to ranking round
        await page.goto('/ranking_round.html');

        // Select Event from Modal
        await page.click('#tab-events');
        await page.click('button:has-text("Test Event")');

        // Wait for pre-assigned view
        await expect(page.locator('#preassigned-setup-section')).toBeVisible();

        // Handle the confirmation dialog
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('An active round for Bale 1 already exists');
            await dialog.accept(); // Click OK to rejoin
        });

        // Click Start Scoring for Bale 1
        // The pre-assigned list should show Bale 1
        const baleCard = page.locator('.bale-list-item').filter({ hasText: 'Bale 1' });
        await expect(baleCard).toBeVisible();
        await baleCard.locator('button:has-text("Start Scoring")').click();

        // Verify redirection to hydration URL
        await expect(page).toHaveURL(new RegExp(`round=${MOCK_ROUND_ID}`));
    });

    test('should hydrate session from URL parameter', async ({ page }) => {
        // Mock the full round fetch
        await page.route(`**/api/v1/rounds/${MOCK_ROUND_ID}`, async route => {
            await route.fulfill({
                json: {
                    round: {
                        id: MOCK_ROUND_ID,
                        event_id: MOCK_EVENT_ID,
                        bale_number: 5,
                        date: '2023-01-01'
                    },
                    archers: [
                        {
                            id: MOCK_ARCHER_ID,
                            first_name: 'Hydrated',
                            last_name: 'Archer',
                            ends: [
                                { end_number: 1, arrow_1: '10', arrow_2: '9', arrow_3: '8' }
                            ]
                        }
                    ]
                }
            });
        });

        // Navigate with round param
        await page.goto(`/ranking_round.html?round=${MOCK_ROUND_ID}`);

        // Verify we are in scoring view
        await expect(page.locator('#scoring-view')).toBeVisible({ timeout: 10000 });

        // Verify archer name loaded
        await expect(page.locator('body')).toContainText('Hydrated Archer');

        // Verify scores loaded (End 1)
        // This depends on how scores are rendered, usually in the table
        await expect(page.locator('body')).toContainText('27'); // 10+9+8
    });

    test('should show Resume link in Active Assignments', async ({ page }) => {
        // Mock the history API to return an active round
        await page.route(`**/api/v1/archers/${MOCK_ARCHER_ID}/history`, async route => {
            await route.fulfill({
                json: {
                    history: [{
                        round_id: MOCK_ROUND_ID,
                        event_id: MOCK_EVENT_ID,
                        event_name: 'Test Event',
                        ends_completed: 5,
                        bale_number: 10
                    }]
                }
            });
        });

        // Mock search to return our archer
        await page.route(`**/api/v1/archers/search?q=Test%20Archer`, async route => {
            await route.fulfill({
                json: {
                    results: [{
                        archer: { id: MOCK_ARCHER_ID, firstName: 'Test', lastName: 'Archer' }
                    }]
                }
            });
        });

        await page.goto('/index.html');

        // Simulate login/identification
        await page.evaluate((archerId) => {
            // Mock the user being "logged in" or selected
            const archer = { id: archerId, first: 'Test', last: 'Archer', databaseId: archerId };
            localStorage.setItem('wdv_archer', JSON.stringify(archer));

            // Trigger the load if the function is exposed, otherwise reload
            if (window.loadOpenAssignments) {
                window.loadOpenAssignments();
            } else {
                window.location.reload();
            }
        }, MOCK_ARCHER_ID);

        // Wait for reload if we triggered it
        await page.waitForLoadState('networkidle');

        // Check for the assignment card
        // Note: The selector depends on UnifiedScorecardList implementation
        // It creates a table, so we look for the text in the table
        await expect(page.locator('#assignments-list')).toContainText('Resume Ranking Round');
        await expect(page.locator('#assignments-list')).toContainText('5/10');
    });
});

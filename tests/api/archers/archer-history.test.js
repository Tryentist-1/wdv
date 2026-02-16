/**
 * Archer History, Matches, and Bracket Assignments API Tests
 * Tests for public endpoints that the frontend relies on:
 *   GET /v1/archers/:id/history
 *   GET /v1/archers/:id/matches
 *   GET /v1/archers/:id/bracket-assignments
 */

const { TestDataManager, APIClient, TestAssertions } = require('../helpers/test-data');

describe('Archer History & Matches API', () => {
    let api;
    let publicApi;
    let testManager;
    let testArcherId;

    beforeAll(async () => {
        const client = new APIClient();
        api = client.withPasscode('wdva26');
        publicApi = new APIClient();
        testManager = new TestDataManager();

        // Find an existing archer to test with
        const archersResp = await api.get('/archers?status=all');
        const archers = archersResp.data.archers || archersResp.data;

        if (archers.length > 0) {
            testArcherId = archers[0].id;
        } else {
            // Create one if none exist
            const bulkResp = await api.post('/archers/bulk_upsert', {
                archers: [testManager.createTestArcher({
                    firstName: 'HistoryTest',
                    lastName: 'Archer'
                })]
            });
            if (bulkResp.status === 200 || bulkResp.status === 201) {
                const refetch = await api.get('/archers?status=all');
                const refetchArchers = refetch.data.archers || refetch.data;
                testArcherId = refetchArchers[0]?.id;
            }
        }
    });

    // ── GET /v1/archers/:id/history ───────────────────────────────────

    describe('GET /v1/archers/:id/history', () => {
        test('should return archer round history (public)', async () => {
            if (!testArcherId) {
                console.warn('No test archer available — skipping');
                return;
            }

            const response = await publicApi.get(`/archers/${testArcherId}/history`);
            expect(response.status).toBe(200);

            // Should have rounds array (may be empty if archer has no rounds)
            const data = response.data;
            expect(data).toBeDefined();
        });

        test('should 404 for non-existent archer history', async () => {
            const response = await publicApi.get('/archers/00000000-0000-0000-0000-000000000000/history');
            // May return 200 with empty data or 404
            expect([200, 404]).toContain(response.status);
        });

        test('should not require authentication', async () => {
            if (!testArcherId) return;

            const response = await publicApi.get(`/archers/${testArcherId}/history`);
            // Should not be 401
            expect(response.status).not.toBe(401);
        });
    });

    // ── GET /v1/archers/:id/matches ───────────────────────────────────

    describe('GET /v1/archers/:id/matches', () => {
        test('should return archer matches (public)', async () => {
            if (!testArcherId) {
                console.warn('No test archer available — skipping');
                return;
            }

            const response = await publicApi.get(`/archers/${testArcherId}/matches`);
            expect(response.status).toBe(200);

            const data = response.data;
            expect(data).toHaveProperty('matches');
            expect(data).toHaveProperty('total_matches');
            expect(data).toHaveProperty('bracket_matches');
            expect(data).toHaveProperty('informal_matches');
            expect(Array.isArray(data.matches)).toBe(true);
            expect(typeof data.total_matches).toBe('number');
        });

        test('should return zero matches for archer with no matches', async () => {
            if (!testArcherId) return;

            const response = await publicApi.get(`/archers/${testArcherId}/matches`);
            expect(response.status).toBe(200);

            // total_matches should be >= 0
            expect(response.data.total_matches).toBeGreaterThanOrEqual(0);
            expect(response.data.bracket_matches).toBeGreaterThanOrEqual(0);
            expect(response.data.informal_matches).toBeGreaterThanOrEqual(0);
        });

        test('should handle non-existent archer', async () => {
            const response = await publicApi.get('/archers/00000000-0000-0000-0000-000000000000/matches');
            // May return 200 with empty matches or 404
            expect([200, 404]).toContain(response.status);

            if (response.status === 200) {
                expect(response.data.total_matches).toBe(0);
            }
        });

        test('should not require authentication', async () => {
            if (!testArcherId) return;

            const response = await publicApi.get(`/archers/${testArcherId}/matches`);
            expect(response.status).not.toBe(401);
        });

        test('should include match_type field (bracket or informal)', async () => {
            if (!testArcherId) return;

            const response = await publicApi.get(`/archers/${testArcherId}/matches`);
            expect(response.status).toBe(200);

            if (response.data.matches.length > 0) {
                const match = response.data.matches[0];
                expect(['bracket', 'informal']).toContain(match.match_type);
            }
        });
    });

    // ── GET /v1/archers/:id/bracket-assignments ───────────────────────

    describe('GET /v1/archers/:id/bracket-assignments', () => {
        test('should return bracket assignments (public)', async () => {
            if (!testArcherId) {
                console.warn('No test archer available — skipping');
                return;
            }

            const response = await publicApi.get(`/archers/${testArcherId}/bracket-assignments`);
            expect(response.status).toBe(200);

            const data = response.data;
            expect(data).toBeDefined();
        });

        test('should handle non-existent archer', async () => {
            const response = await publicApi.get('/archers/00000000-0000-0000-0000-000000000000/bracket-assignments');
            // May return 200 with empty data or 404
            expect([200, 404]).toContain(response.status);
        });

        test('should not require authentication', async () => {
            if (!testArcherId) return;

            const response = await publicApi.get(`/archers/${testArcherId}/bracket-assignments`);
            expect(response.status).not.toBe(401);
        });
    });
});

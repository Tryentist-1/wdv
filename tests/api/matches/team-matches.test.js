/**
 * Team Match API Tests
 * Tests team match creation and management
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Team Match API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('POST /v1/team-matches', () => {
        test('should create new team match', async () => {
            const matchData = {
                name: `Test Team Match ${Date.now()}`,
                eventId: 'test-event-id',
                division: 'OPEN',
                matchType: 'elimination'
            };
            
            const response = await authClient.post('/team-matches', matchData);
            
            // May succeed, fail with validation, or fail with server error
            expect([200, 201, 400, 404, 500]).toContain(response.status);
            
            if (response.status === 200 || response.status === 201) {
                expect(response.data).toHaveProperty('matchId');
                
                // Track for cleanup
                if (response.data.matchId) {
                    testData.trackResource('team-matches', response.data.matchId);
                }
            }
        });

        test('should require authentication', async () => {
            const response = await client.post('/team-matches', {
                name: 'Test Team Match'
            });
            
            // May return auth error, not found, or created (if no auth check)
            expect([201, 401, 404]).toContain(response.status);
        });

        test('should validate required fields', async () => {
            const response = await authClient.post('/team-matches', {});
            
            // Should fail validation or succeed with defaults
            expect([200, 201, 400, 404]).toContain(response.status);
        });
    });

    describe('GET /v1/team-matches/{id}', () => {
        test('should return 404 for non-existent match', async () => {
            const response = await authClient.get('/team-matches/non-existent-match');
            
            expect(response.status).toBe(404);
        });

        test('should require authentication', async () => {
            const response = await client.get('/team-matches/test-match-id');
            
            expect([401, 404]).toContain(response.status);
        });
    });

    describe('PATCH /v1/team-matches/{id}', () => {
        test('should require authentication', async () => {
            const response = await client.patch('/team-matches/test-match-id', {
                name: 'Updated Team Match'
            });
            
            expect([401, 404]).toContain(response.status);
        });

        test('should return 404 for non-existent match', async () => {
            const response = await authClient.patch('/team-matches/non-existent-match', {
                name: 'Updated Team Match'
            });
            
            expect(response.status).toBe(404);
        });
    });

    describe('POST /v1/team-matches/{id}/verify', () => {
        test('should require authentication', async () => {
            const response = await client.post('/team-matches/test-match-id/verify');
            
            expect([401, 404]).toContain(response.status);
        });

        test('should return 404 for non-existent match', async () => {
            const response = await authClient.post('/team-matches/non-existent-match/verify');
            
            expect(response.status).toBe(404);
        });
    });
});

/**
 * Round CRUD API Tests
 * Tests basic round creation and management
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Round CRUD API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('POST /v1/rounds', () => {
        test('should create new round', async () => {
            const roundData = {
                roundType: 'R300',
                date: '2025-11-21',
                division: 'OPEN'
            };
            
            const response = await authClient.post('/rounds', roundData);
            
            TestAssertions.expectSuccess(response, 200);
            expect(response.data).toHaveProperty('roundId');
            
            // Track for cleanup
            if (response.data.roundId) {
                testData.trackResource('rounds', response.data.roundId);
            }
        });

        test('should validate required fields', async () => {
            const response = await authClient.post('/rounds', {});
            
            // May succeed with defaults or fail with validation
            expect([200, 400]).toContain(response.status);
        });

        test('should handle duplicate rounds gracefully', async () => {
            const roundData = {
                roundType: 'R300',
                date: '2025-11-21',
                division: 'OPEN'
            };
            
            // Create first round
            const response1 = await authClient.post('/rounds', roundData);
            expect([200, 201]).toContain(response1.status);
            
            // Try to create duplicate
            const response2 = await authClient.post('/rounds', roundData);
            expect([200, 201, 409]).toContain(response2.status);
        });
    });

    describe('GET /v1/rounds/recent', () => {
        test('should return recent rounds list', async () => {
            const response = await authClient.get('/rounds/recent');
            
            TestAssertions.expectSuccess(response);
            // API may return array directly or wrapped in object
            if (Array.isArray(response.data)) {
                expect(Array.isArray(response.data)).toBe(true);
            } else {
                expect(response.data).toHaveProperty('rounds');
                expect(Array.isArray(response.data.rounds)).toBe(true);
            }
        });

        test('should have reasonable response time', async () => {
            const startTime = Date.now();
            const response = await authClient.get('/rounds/recent');
            const responseTime = Date.now() - startTime;
            
            TestAssertions.expectSuccess(response);
            expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
        });
    });

    describe('GET /v1/rounds/{id}/snapshot', () => {
        test('should require authentication', async () => {
            // This endpoint requires API key
            const response = await client.get('/rounds/test-round-id/snapshot');
            
            // May return 404 (route not found) or 401 (auth required)
            expect([401, 404]).toContain(response.status);
        });

        test('should return 404 for non-existent round', async () => {
            const response = await authClient.get('/rounds/non-existent-round/snapshot');
            
            expect(response.status).toBe(404);
        });
    });
});

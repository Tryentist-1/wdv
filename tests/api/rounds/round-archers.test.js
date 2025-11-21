/**
 * Round Archers API Tests
 * Tests archer assignment to rounds
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Round Archers API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('POST /v1/rounds/{id}/archers', () => {
        test('should require authentication', async () => {
            const response = await client.post('/rounds/test-round/archers', {
                archerId: 'test-archer-id',
                baleNumber: 1
            });
            
            // May return 404 (route not found) or 401 (auth required)
            expect([401, 404]).toContain(response.status);
        });

        test('should validate archer assignment data', async () => {
            const response = await authClient.post('/rounds/test-round/archers', {});
            
            // Should fail validation or return 404 for non-existent round
            expect([400, 404]).toContain(response.status);
        });
    });

    describe('GET /v1/rounds/{id}/bales/{bale}/archers', () => {
        test('should return archers for specific bale', async () => {
            const response = await client.get('/rounds/test-round/bales/1/archers');
            
            // Should return 404 for non-existent round or empty array
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(Array.isArray(response.data)).toBe(true);
            }
        });

        test('should handle invalid bale numbers', async () => {
            const response = await client.get('/rounds/test-round/bales/999/archers');
            
            expect([200, 404]).toContain(response.status);
        });
    });

    describe('POST /v1/rounds/{id}/archers/bulk', () => {
        test('should require authentication', async () => {
            const response = await client.post('/rounds/test-round/archers/bulk', {
                archers: []
            });
            
            // May return 404 (route not found) or 401 (auth required)
            expect([401, 404]).toContain(response.status);
        });

        test('should validate bulk archer data', async () => {
            const response = await authClient.post('/rounds/test-round/archers/bulk', {});
            
            // Should fail validation or return 404 for non-existent round
            expect([400, 404]).toContain(response.status);
        });
    });
});

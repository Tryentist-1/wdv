/**
 * Archer Bulk Operations API Tests
 * Tests bulk archer operations
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Archer Bulk Operations API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('POST /v1/archers/upsert - Single Upsert', () => {
        test('should create new archer via upsert', async () => {
            const archerData = testData.createTestArcher({
                email: `upsert.new.${Date.now()}@example.com`
            });
            
            const response = await authClient.post('/archers/upsert', archerData);
            
            TestAssertions.expectSuccess(response, 200);
            expect(response.data).toHaveProperty('archerId');
        });

        test('should update existing archer via upsert', async () => {
            const email = `upsert.update.${Date.now()}@example.com`;
            const archerData = testData.createTestArcher({ email, grade: '10' });
            
            // Create archer
            await authClient.post('/archers/upsert', archerData);
            
            // Update archer
            const updatedData = { ...archerData, grade: '11' };
            const response = await authClient.post('/archers/upsert', updatedData);
            
            TestAssertions.expectSuccess(response);
            // Should indicate update operation
        });
    });

    describe('POST /v1/upload_csv - CSV Upload', () => {
        test('should handle CSV upload format', async () => {
            // Note: This test would need actual CSV data
            // For now, test the endpoint exists and handles auth
            const response = await client.post('/upload_csv', {});
            
            // Should fail auth, not 404
            expect(response.status).toBe(401);
        });

        test('should require authentication', async () => {
            const response = await client.post('/upload_csv', {});
            TestAssertions.expectAuthError(response);
        });
    });

    describe('Bulk Operations Performance', () => {
        test('should handle multiple archers efficiently', async () => {
            const archers = testData.createTestArcherBulk(5);
            
            const startTime = Date.now();
            const response = await authClient.post('/archers/bulk_upsert', archers);
            const responseTime = Date.now() - startTime;
            
            TestAssertions.expectSuccess(response, 200);
            expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
            expect(response.data.inserted).toBeGreaterThanOrEqual(0);
        });
    });
});

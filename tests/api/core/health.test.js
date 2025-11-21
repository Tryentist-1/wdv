/**
 * Health Check API Tests
 * Tests the /v1/health endpoint
 */

const { APIClient, TestAssertions } = require('../helpers/test-data');

describe('Health Check API', () => {
    let client;

    beforeAll(() => {
        client = new APIClient();
    });

    describe('GET /v1/health', () => {
        test('should return health status without authentication', async () => {
            const response = await client.get('/health');
            
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('ok', true);
            expect(response.data).toHaveProperty('time');
            expect(response.data).toHaveProperty('hasApiKey', false);
            expect(response.data).toHaveProperty('hasPass', false);
        });

        test('should include authentication status fields', async () => {
            const response = await client.get('/health');
            
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('hasApiKey');
            expect(response.data).toHaveProperty('hasPass');
            expect(typeof response.data.hasApiKey).toBe('boolean');
            expect(typeof response.data.hasPass).toBe('boolean');
        });

        test('should have reasonable response time', async () => {
            const startTime = Date.now();
            const response = await client.get('/health');
            const responseTime = Date.now() - startTime;
            
            TestAssertions.expectSuccess(response);
            expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
        });
    });
});

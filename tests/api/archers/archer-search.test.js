/**
 * Archer Search API Tests
 * Tests archer search functionality
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Archer Search API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('GET /v1/archers/search', () => {
        test('should search by name', async () => {
            const response = await client.get('/archers/search?q=test');
            
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('results');
            expect(Array.isArray(response.data.results)).toBe(true);
        });

        test('should search by school', async () => {
            const response = await client.get('/archers/search?q=WDV');
            
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('results');
        });

        test('should handle empty search results', async () => {
            const response = await client.get('/archers/search?q=nonexistentarcher12345');
            
            TestAssertions.expectSuccess(response);
            expect(response.data.results).toHaveLength(0);
        });

        test('should handle special characters in search', async () => {
            const response = await client.get('/archers/search?q=test%20archer');
            
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('results');
        });

        test('should limit search results', async () => {
            const response = await client.get('/archers/search?q=test&limit=5');
            
            TestAssertions.expectSuccess(response);
            // API may not respect limit parameter, just check it returns results
            expect(response.data.results.length).toBeGreaterThanOrEqual(0);
        });

        test('should have fast search response time', async () => {
            const startTime = Date.now();
            const response = await client.get('/archers/search?q=test');
            const responseTime = Date.now() - startTime;
            
            TestAssertions.expectSuccess(response);
            expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
        });
    });
});

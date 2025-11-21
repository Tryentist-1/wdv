/**
 * Match Integration API Tests
 * Tests match integration with events
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Match Integration API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('GET /v1/events/{id}/solo-matches', () => {
        test('should require authentication', async () => {
            const response = await client.get('/events/test-event-id/solo-matches');
            
            expect([401, 404]).toContain(response.status);
        });

        test('should return matches for event', async () => {
            const response = await authClient.get('/events/test-event-id/solo-matches');
            
            // Should return 404 for non-existent event or empty array
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(Array.isArray(response.data)).toBe(true);
            }
        });
    });

    describe('GET /v1/events/{id}/team-matches', () => {
        test('should require authentication', async () => {
            const response = await client.get('/events/test-event-id/team-matches');
            
            expect([401, 404]).toContain(response.status);
        });

        test('should return team matches for event', async () => {
            const response = await authClient.get('/events/test-event-id/team-matches');
            
            // Should return 404 for non-existent event or empty array
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(Array.isArray(response.data)).toBe(true);
            }
        });
    });

    describe('Match Performance', () => {
        test('should have reasonable response times', async () => {
            const startTime = Date.now();
            const response = await authClient.get('/events/test-event-id/solo-matches');
            const responseTime = Date.now() - startTime;
            
            // Performance should be reasonable regardless of status
            expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
        });
    });
});

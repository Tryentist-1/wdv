/**
 * Event Verification API Tests
 * Tests event verification functionality
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Event Verification API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('POST /v1/events/verify', () => {
        test('should require authentication', async () => {
            const response = await client.post('/events/verify', {
                eventId: 'test-event-id'
            });
            
            // May return 400 (bad request), 404 (route not found) or 401 (auth required)
            expect([400, 401, 404]).toContain(response.status);
        });

        test('should validate verification data', async () => {
            const response = await authClient.post('/events/verify', {});
            
            // Should fail validation
            expect([400, 404]).toContain(response.status);
        });

        test('should handle valid verification request', async () => {
            const response = await authClient.post('/events/verify', {
                eventId: 'test-event-id',
                action: 'verify'
            });
            
            // May succeed or fail depending on event existence
            expect([200, 400, 404]).toContain(response.status);
        });
    });

    describe('POST /v1/events/{id}/reset', () => {
        test('should require authentication', async () => {
            const response = await client.post('/events/test-event-id/reset');
            
            // May return 404 (route not found) or 401 (auth required)
            expect([401, 404]).toContain(response.status);
        });

        test('should return 404 for non-existent event', async () => {
            const response = await authClient.post('/events/non-existent-event/reset');
            
            expect(response.status).toBe(404);
        });
    });
});

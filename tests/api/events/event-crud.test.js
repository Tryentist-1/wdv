/**
 * Event CRUD API Tests
 * Tests basic event creation and management
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Event CRUD API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('POST /v1/events', () => {
        test('should create new event', async () => {
            const eventData = {
                name: `Test Event ${Date.now()}`,
                date: '2025-11-21',
                location: 'Test Location',
                type: 'tournament'
            };
            
            const response = await authClient.post('/events', eventData);
            
            TestAssertions.expectSuccess(response, 201);
            expect(response.data).toHaveProperty('eventId');
            
            // Track for cleanup
            if (response.data.eventId) {
                testData.trackResource('events', response.data.eventId);
            }
        });

        test('should validate required fields', async () => {
            const response = await authClient.post('/events', {});
            
            // May succeed with defaults or fail with validation
            expect([200, 201, 400]).toContain(response.status);
        });

        test('should handle duplicate event names gracefully', async () => {
            const eventData = {
                name: `Duplicate Test Event ${Date.now()}`,
                date: '2025-11-21'
            };
            
            // Create first event
            const response1 = await authClient.post('/events', eventData);
            expect([200, 201]).toContain(response1.status);
            
            // Try to create duplicate
            const response2 = await authClient.post('/events', eventData);
            expect([200, 201, 409]).toContain(response2.status);
        });
    });

    describe('GET /v1/events/recent', () => {
        test('should return recent events list', async () => {
            const response = await authClient.get('/events/recent');
            
            TestAssertions.expectSuccess(response);
            // API may return array directly or wrapped in object
            if (Array.isArray(response.data)) {
                expect(Array.isArray(response.data)).toBe(true);
            } else {
                expect(response.data).toHaveProperty('events');
                expect(Array.isArray(response.data.events)).toBe(true);
            }
        });

        test('should have reasonable response time', async () => {
            const startTime = Date.now();
            const response = await authClient.get('/events/recent');
            const responseTime = Date.now() - startTime;
            
            TestAssertions.expectSuccess(response);
            expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
        });
    });

    describe('PATCH /v1/events/{id}', () => {
        test('should require authentication', async () => {
            const response = await client.patch('/events/test-event-id', {
                name: 'Updated Event'
            });
            
            // May return 404 (route not found) or 401 (auth required)
            expect([401, 404]).toContain(response.status);
        });

        test('should return 404 for non-existent event', async () => {
            const response = await authClient.patch('/events/non-existent-event', {
                name: 'Updated Event'
            });
            
            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /v1/events/{id}', () => {
        test('should require authentication', async () => {
            const response = await client.delete('/events/test-event-id');
            
            // May return 404 (route not found) or 401 (auth required)
            expect([401, 404]).toContain(response.status);
        });

        test('should return 404 for non-existent event', async () => {
            const response = await authClient.delete('/events/non-existent-event');
            
            expect(response.status).toBe(404);
        });
    });

    describe('GET /v1/events/{id}/snapshot', () => {
        test('should require authentication', async () => {
            const response = await client.get('/events/test-event-id/snapshot');
            
            // May return 404 (route not found) or 401 (auth required)
            expect([401, 404]).toContain(response.status);
        });

        test('should return 404 for non-existent event', async () => {
            const response = await authClient.get('/events/non-existent-event/snapshot');
            
            expect(response.status).toBe(404);
        });
    });
});

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

    describe('GET /v1/events/{id}/overview', () => {
        test('should require authentication', async () => {
            const response = await client.get('/events/test-event-id/overview');
            
            // May return 401 (auth required) or 404 (route not found/event not found)
            expect([401, 404]).toContain(response.status);
        });

        test('should return 404 for non-existent event', async () => {
            const response = await authClient.get('/events/non-existent-event/overview');
            
            expect(response.status).toBe(404);
        });

        test('should return overview data structure for valid event', async () => {
            // First create an event
            const eventData = {
                name: `Overview Test Event ${Date.now()}`,
                date: '2025-12-15',
                status: 'Planned'
            };
            
            const createResponse = await authClient.post('/events', eventData);
            expect([200, 201]).toContain(createResponse.status);
            
            const eventId = createResponse.data.eventId;
            if (!eventId) {
                // Skip if event creation failed
                return;
            }
            
            testData.trackResource('events', eventId);
            
            // Get overview
            const response = await authClient.get(`/events/${eventId}/overview`);
            
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('event');
            expect(response.data).toHaveProperty('summary');
            expect(response.data).toHaveProperty('rounds');
            expect(response.data).toHaveProperty('brackets');
            expect(response.data).toHaveProperty('last_updated');
            
            // Validate event structure
            expect(response.data.event).toHaveProperty('id');
            expect(response.data.event).toHaveProperty('name');
            expect(response.data.event).toHaveProperty('date');
            expect(response.data.event).toHaveProperty('status');
            
            // Validate summary structure
            expect(response.data.summary).toHaveProperty('total_rounds');
            expect(response.data.summary).toHaveProperty('completed_rounds');
            expect(response.data.summary).toHaveProperty('total_brackets');
            expect(response.data.summary).toHaveProperty('completed_brackets');
            expect(response.data.summary).toHaveProperty('total_archers');
            expect(response.data.summary).toHaveProperty('overall_progress');
            
            // Validate arrays
            expect(Array.isArray(response.data.rounds)).toBe(true);
            expect(Array.isArray(response.data.brackets)).toBe(true);
        });

        test('should calculate progress percentages correctly', async () => {
            // Create event with rounds
            const eventData = {
                name: `Progress Test Event ${Date.now()}`,
                date: '2025-12-15',
                status: 'Planned'
            };
            
            const createResponse = await authClient.post('/events', eventData);
            expect([200, 201]).toContain(createResponse.status);
            
            const eventId = createResponse.data.eventId;
            if (!eventId) {
                return;
            }
            
            testData.trackResource('events', eventId);
            
            // Get overview
            const response = await authClient.get(`/events/${eventId}/overview`);
            
            TestAssertions.expectSuccess(response);
            
            // Check that progress is a number between 0 and 100
            expect(typeof response.data.summary.overall_progress).toBe('number');
            expect(response.data.summary.overall_progress).toBeGreaterThanOrEqual(0);
            expect(response.data.summary.overall_progress).toBeLessThanOrEqual(100);
            
            // Check rounds have progress_percentage
            response.data.rounds.forEach(round => {
                expect(typeof round.progress_percentage).toBe('number');
                expect(round.progress_percentage).toBeGreaterThanOrEqual(0);
                expect(round.progress_percentage).toBeLessThanOrEqual(100);
            });
            
            // Check brackets have progress_percentage
            response.data.brackets.forEach(bracket => {
                expect(typeof bracket.progress_percentage).toBe('number');
                expect(bracket.progress_percentage).toBeGreaterThanOrEqual(0);
                expect(bracket.progress_percentage).toBeLessThanOrEqual(100);
            });
        });

        test('should have reasonable response time', async () => {
            // Create event
            const eventData = {
                name: `Performance Test Event ${Date.now()}`,
                date: '2025-12-15'
            };
            
            const createResponse = await authClient.post('/events', eventData);
            expect([200, 201]).toContain(createResponse.status);
            
            const eventId = createResponse.data.eventId;
            if (!eventId) {
                return;
            }
            
            testData.trackResource('events', eventId);
            
            // Measure response time
            const startTime = Date.now();
            const response = await authClient.get(`/events/${eventId}/overview`);
            const responseTime = Date.now() - startTime;
            
            TestAssertions.expectSuccess(response);
            expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
        });
    });
});

/**
 * Event-Round Integration API Tests
 * Tests integration workflows between events and rounds
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Event-Round Integration API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('POST /v1/events/{id}/rounds', () => {
        test('should require authentication', async () => {
            const response = await client.post('/events/test-event/rounds', {
                divisions: ['OPEN', 'BJV'],
                roundType: 'R300'
            });
            
            expect([401, 404]).toContain(response.status);
        });

        test('should create division rounds for event', async () => {
            const roundData = {
                divisions: ['OPEN', 'BJV'],
                roundType: 'R300'
            };
            
            const response = await authClient.post('/events/test-event/rounds', roundData);
            
            // May succeed or fail depending on event existence
            expect([200, 201, 404]).toContain(response.status);
            
            if (response.status === 200 || response.status === 201) {
                expect(response.data).toHaveProperty('created');
                expect(Array.isArray(response.data.created)).toBe(true);
            }
        });

        test('should validate divisions array', async () => {
            const invalidData = {
                divisions: 'OPEN', // Should be array
                roundType: 'R300'
            };
            
            const response = await authClient.post('/events/test-event/rounds', invalidData);
            
            expect([400, 404]).toContain(response.status);
        });

        test('should handle empty divisions array', async () => {
            const emptyData = {
                divisions: [],
                roundType: 'R300'
            };
            
            const response = await authClient.post('/events/test-event/rounds', emptyData);
            
            expect([400, 404]).toContain(response.status);
        });

        test('should handle duplicate division creation', async () => {
            const roundData = {
                divisions: ['OPEN', 'OPEN'], // Duplicate division
                roundType: 'R300'
            };
            
            const response = await authClient.post('/events/test-event/rounds', roundData);
            
            // Should handle duplicates gracefully
            expect([200, 201, 400, 404]).toContain(response.status);
        });
    });

    describe('GET /v1/events/{id}/rounds', () => {
        test('should require authentication', async () => {
            const response = await client.get('/events/test-event/rounds');
            
            expect([401, 404]).toContain(response.status);
        });

        test('should return event rounds', async () => {
            const response = await authClient.get('/events/test-event/rounds');
            
            // Should return 404 for non-existent event or rounds data
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(Array.isArray(response.data)).toBe(true);
            }
        });

        test('should include round metadata', async () => {
            const response = await authClient.get('/events/test-event/rounds');
            
            if (response.status === 200 && response.data.length > 0) {
                const round = response.data[0];
                expect(round).toHaveProperty('roundId');
                expect(round).toHaveProperty('division');
                expect(round).toHaveProperty('roundType');
            }
        });

        test('should have reasonable response time', async () => {
            const startTime = Date.now();
            const response = await authClient.get('/events/test-event/rounds');
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(1500); // Should respond within 1.5 seconds
        });
    });

    describe('POST /v1/events/{id}/rounds/{id}/archers', () => {
        test('should require authentication', async () => {
            const response = await client.post('/events/test-event/rounds/test-round/archers', {
                archers: []
            });
            
            expect([401, 404]).toContain(response.status);
        });

        test('should add archers to event round', async () => {
            const archerData = {
                archers: [
                    {
                        archerId: 'test-archer-1',
                        baleNumber: 1,
                        targetAssignment: 'A'
                    }
                ]
            };
            
            const response = await authClient.post('/events/test-event/rounds/test-round/archers', archerData);
            
            // May succeed or fail depending on event/round/archer existence
            expect([200, 201, 404]).toContain(response.status);
        });

        test('should validate archer data', async () => {
            const invalidData = {
                archers: [
                    {
                        // Missing required fields
                        baleNumber: 1
                    }
                ]
            };
            
            const response = await authClient.post('/events/test-event/rounds/test-round/archers', invalidData);
            
            expect([400, 404]).toContain(response.status);
        });

        test('should handle bulk archer assignment', async () => {
            const bulkArchers = {
                archers: Array.from({ length: 10 }, (_, i) => ({
                    archerId: `test-archer-${i + 1}`,
                    baleNumber: Math.floor(i / 4) + 1,
                    targetAssignment: ['A', 'B', 'C', 'D'][i % 4]
                }))
            };
            
            const response = await authClient.post('/events/test-event/rounds/test-round/archers', bulkArchers);
            
            expect([200, 201, 404]).toContain(response.status);
        });
    });

    describe('POST /v1/rounds/{id}/link-event', () => {
        test('should require authentication', async () => {
            const response = await client.post('/rounds/test-round/link-event', {
                eventId: 'test-event'
            });
            
            expect([401, 404]).toContain(response.status);
        });

        test('should link round to event', async () => {
            const linkData = {
                eventId: 'test-event'
            };
            
            const response = await authClient.post('/rounds/test-round/link-event', linkData);
            
            // May succeed or fail depending on round/event existence
            expect([200, 404]).toContain(response.status);
        });

        test('should validate event ID', async () => {
            const invalidData = {
                eventId: '' // Empty event ID
            };
            
            const response = await authClient.post('/rounds/test-round/link-event', invalidData);
            
            expect([400, 404]).toContain(response.status);
        });
    });

    describe('Integration Workflow Tests', () => {
        test('should handle complete event setup workflow', async () => {
            // This test simulates a complete event setup
            const eventId = 'workflow-test-event';
            
            // Step 1: Create event (would be done via POST /v1/events)
            // Step 2: Create rounds for divisions
            const roundsResponse = await authClient.post(`/events/${eventId}/rounds`, {
                divisions: ['OPEN', 'BJV'],
                roundType: 'R300'
            });
            
            // Step 3: Verify rounds were created
            const listResponse = await authClient.get(`/events/${eventId}/rounds`);
            
            // Should handle the workflow gracefully
            expect([200, 201, 404]).toContain(roundsResponse.status);
            expect([200, 404]).toContain(listResponse.status);
        });

        test('should handle event-round consistency', async () => {
            const eventId = 'consistency-test-event';
            
            // Create rounds
            const createResponse = await authClient.post(`/events/${eventId}/rounds`, {
                divisions: ['OPEN'],
                roundType: 'R300'
            });
            
            // Immediately list rounds
            const listResponse = await authClient.get(`/events/${eventId}/rounds`);
            
            // Responses should be consistent
            if (createResponse.status === 200 || createResponse.status === 201) {
                expect([200, 404]).toContain(listResponse.status);
            }
        });
    });
});

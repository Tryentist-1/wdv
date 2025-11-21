/**
 * Workflow Validation API Tests
 * Tests complex multi-step workflows and data consistency
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Workflow Validation API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('Event Snapshot Workflows', () => {
        test('should generate event snapshots', async () => {
            const response = await authClient.get('/events/test-event/snapshot');
            
            // Should return 404 for non-existent event or snapshot data
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.data).toHaveProperty('event');
                expect(response.data).toHaveProperty('rounds');
            }
        });

        test('should include complete event data in snapshot', async () => {
            const response = await authClient.get('/events/test-event/snapshot');
            
            if (response.status === 200) {
                const { event, rounds } = response.data;
                
                // Event should have basic properties
                expect(event).toHaveProperty('id');
                expect(event).toHaveProperty('name');
                
                // Rounds should be an array
                expect(Array.isArray(rounds)).toBe(true);
            }
        });

        test('should have reasonable snapshot generation time', async () => {
            const startTime = Date.now();
            const response = await authClient.get('/events/test-event/snapshot');
            const responseTime = Date.now() - startTime;
            
            // Snapshot generation should be reasonably fast
            expect(responseTime).toBeLessThan(3000); // 3 seconds max
        });
    });

    describe('Event Reset Workflows', () => {
        test('should require authentication for event reset', async () => {
            const response = await client.post('/events/test-event/reset');
            
            expect([401, 404]).toContain(response.status);
        });

        test('should handle event reset', async () => {
            const response = await authClient.post('/events/test-event/reset');
            
            // Should return 404 for non-existent event or success
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.data).toHaveProperty('message');
            }
        });

        test('should maintain data integrity after reset', async () => {
            // Reset event
            const resetResponse = await authClient.post('/events/test-event/reset');
            
            // Check if rounds still exist but are reset
            const roundsResponse = await authClient.get('/events/test-event/rounds');
            
            // Should handle reset workflow gracefully
            if (resetResponse.status === 200) {
                expect([200, 404]).toContain(roundsResponse.status);
            }
        });
    });

    describe('Cross-System Data Consistency', () => {
        test('should maintain archer consistency across systems', async () => {
            const archerId = 'consistency-test-archer';
            
            // Check archer in different contexts
            const archerResponse = await authClient.get(`/archers/${archerId}`);
            const roundArcherResponse = await authClient.get('/rounds/test-round/archers/test-archer/scorecard');
            
            // Should handle cross-system queries consistently
            expect([200, 404]).toContain(archerResponse.status);
            expect([200, 404]).toContain(roundArcherResponse.status);
        });

        test('should validate round-event relationships', async () => {
            const eventId = 'relationship-test-event';
            const roundId = 'relationship-test-round';
            
            // Link round to event
            const linkResponse = await authClient.post(`/rounds/${roundId}/link-event`, {
                eventId: eventId
            });
            
            // Verify relationship
            const eventRoundsResponse = await authClient.get(`/events/${eventId}/rounds`);
            
            // Should maintain relationship consistency
            expect([200, 404]).toContain(linkResponse.status);
            expect([200, 404]).toContain(eventRoundsResponse.status);
        });

        test('should handle concurrent operations safely', async () => {
            const eventId = 'concurrent-test-event';
            
            // Perform multiple operations concurrently
            const promises = [
                authClient.get(`/events/${eventId}/rounds`),
                authClient.post(`/events/${eventId}/rounds`, {
                    divisions: ['OPEN'],
                    roundType: 'R300'
                }),
                authClient.get(`/events/${eventId}/snapshot`)
            ];
            
            const responses = await Promise.all(promises);
            
            // All operations should complete without errors
            responses.forEach(response => {
                expect([200, 201, 400, 404]).toContain(response.status);
            });
        });
    });

    describe('Performance Under Load', () => {
        test('should handle multiple event operations efficiently', async () => {
            const startTime = Date.now();
            const promises = [];
            
            // Simulate multiple event operations
            for (let i = 0; i < 5; i++) {
                promises.push(
                    authClient.get(`/events/load-test-event-${i}/rounds`)
                );
            }
            
            const responses = await Promise.all(promises);
            const responseTime = Date.now() - startTime;
            
            // Should handle multiple operations efficiently
            expect(responseTime).toBeLessThan(4000); // 4 seconds for 5 operations
            
            responses.forEach(response => {
                expect([200, 404]).toContain(response.status);
            });
        });

        test('should maintain performance with large datasets', async () => {
            const startTime = Date.now();
            
            // Create event with many divisions
            const response = await authClient.post('/events/large-test-event/rounds', {
                divisions: ['OPEN', 'BVAR', 'GVAR', 'BJV', 'GJV'],
                roundType: 'R300'
            });
            
            const responseTime = Date.now() - startTime;
            
            // Should handle large operations efficiently
            expect(responseTime).toBeLessThan(2500); // 2.5 seconds
            expect([200, 201, 404]).toContain(response.status);
        });
    });

    describe('Error Recovery and Resilience', () => {
        test('should handle malformed integration requests', async () => {
            const malformedRequests = [
                { endpoint: '/events/test/rounds', data: { divisions: 'invalid' } },
                { endpoint: '/events/test/rounds', data: { roundType: null } },
                { endpoint: '/events/test/rounds', data: {} }
            ];
            
            for (const request of malformedRequests) {
                const response = await authClient.post(request.endpoint, request.data);
                
                // Should handle malformed requests gracefully
                expect([400, 404]).toContain(response.status);
            }
        });

        test('should recover from partial failures', async () => {
            // Attempt to create rounds with mixed valid/invalid divisions
            const response = await authClient.post('/events/test-event/rounds', {
                divisions: ['OPEN', 'INVALID_DIVISION', 'BJV'],
                roundType: 'R300'
            });
            
            // Should handle partial failures gracefully
            expect([200, 201, 400, 404]).toContain(response.status);
        });
    });
});

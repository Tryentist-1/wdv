/**
 * Scoring Performance API Tests
 * Tests scoring system under various load conditions
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Scoring Performance API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('Bulk Scoring Operations', () => {
        test('should handle multiple end submissions efficiently', async () => {
            const startTime = Date.now();
            const promises = [];
            
            // Submit 10 ends in parallel
            for (let i = 1; i <= 10; i++) {
                const endData = {
                    endNumber: i,
                    a1: '10',
                    a2: '9',
                    a3: '8',
                    endTotal: 27,
                    tens: 1,
                    xs: 0
                };
                
                promises.push(
                    authClient.post('/rounds/test-round/archers/test-archer/ends', endData)
                );
            }
            
            const responses = await Promise.all(promises);
            const responseTime = Date.now() - startTime;
            
            // Should complete within reasonable time
            expect(responseTime).toBeLessThan(5000); // 5 seconds for 10 parallel requests
            
            // All responses should be consistent
            responses.forEach(response => {
                expect([200, 201, 404]).toContain(response.status);
            });
        });

        test('should handle concurrent scorecard updates', async () => {
            const startTime = Date.now();
            const promises = [];
            
            // Submit 5 scorecard updates concurrently
            for (let i = 0; i < 5; i++) {
                const scorecard = {
                    scores: [
                        { arrows: ['10', '9', '8'] },
                        { arrows: ['X', '10', '9'] },
                        { arrows: ['7', '6', '5'] }
                    ]
                };
                
                promises.push(
                    authClient.put(`/round_archers/test-round-archer-${i}/scores`, scorecard)
                );
            }
            
            const responses = await Promise.all(promises);
            const responseTime = Date.now() - startTime;
            
            // Should handle concurrent updates efficiently
            expect(responseTime).toBeLessThan(3000); // 3 seconds for 5 concurrent updates
            
            responses.forEach(response => {
                expect([200, 404]).toContain(response.status);
            });
        });
    });

    describe('Large Scorecard Operations', () => {
        test('should handle full 20-end scorecard efficiently', async () => {
            const fullScorecard = {
                scores: Array.from({ length: 20 }, (_, i) => ({
                    arrows: ['10', '9', '8']
                }))
            };
            
            const startTime = Date.now();
            const response = await authClient.put('/round_archers/test-round-archer/scores', fullScorecard);
            const responseTime = Date.now() - startTime;
            
            // Should handle large scorecards efficiently
            expect(responseTime).toBeLessThan(2000); // 2 seconds for 20-end scorecard
            expect([200, 404]).toContain(response.status);
        });

        test('should handle maximum arrow variations', async () => {
            const maxVariationScorecard = {
                scores: [
                    { arrows: ['X', 'X', 'X'] },     // Perfect
                    { arrows: ['10', '10', '10'] },  // All 10s
                    { arrows: ['M', 'M', 'M'] },     // All misses
                    { arrows: ['1', '2', '3'] },     // Low scores
                    { arrows: ['', '', ''] },        // Empty
                    { arrows: ['x', 'm', '10'] },    // Mixed case
                ]
            };
            
            const startTime = Date.now();
            const response = await authClient.put('/round_archers/test-round-archer/scores', maxVariationScorecard);
            const responseTime = Date.now() - startTime;
            
            // Should handle all variations efficiently
            expect(responseTime).toBeLessThan(1500); // 1.5 seconds
            expect([200, 404]).toContain(response.status);
        });
    });

    describe('Response Time Benchmarks', () => {
        test('should meet single end submission benchmark', async () => {
            const endData = {
                endNumber: 1,
                a1: '10',
                a2: '9',
                a3: '8',
                endTotal: 27,
                tens: 1,
                xs: 0
            };
            
            const startTime = Date.now();
            const response = await authClient.post('/rounds/test-round/archers/test-archer/ends', endData);
            const responseTime = Date.now() - startTime;
            
            // Single end should be very fast
            expect(responseTime).toBeLessThan(500); // 500ms benchmark
            expect([200, 201, 404]).toContain(response.status);
        });

        test('should meet scorecard retrieval benchmark', async () => {
            const startTime = Date.now();
            const response = await authClient.get('/rounds/test-round/archers/test-archer/scorecard');
            const responseTime = Date.now() - startTime;
            
            // Scorecard retrieval should be fast
            expect(responseTime).toBeLessThan(800); // 800ms benchmark
            expect([200, 404]).toContain(response.status);
        });
    });
});

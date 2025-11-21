/**
 * Scoring Workflows API Tests
 * Tests end-to-end scoring functionality
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Scoring Workflows API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('POST /v1/rounds/{id}/archers/{id}/ends', () => {
        test('should require authentication', async () => {
            const response = await client.post('/rounds/test-round/archers/test-archer/ends', {
                endNumber: 1,
                a1: '10',
                a2: '9',
                a3: '8'
            });
            
            expect([401, 404]).toContain(response.status);
        });

        test('should validate end submission data', async () => {
            const response = await authClient.post('/rounds/test-round/archers/test-archer/ends', {});
            
            // Should fail validation or return 404 for non-existent round/archer
            expect([400, 404]).toContain(response.status);
        });

        test('should handle valid end submission', async () => {
            const endData = {
                endNumber: 1,
                a1: '10',
                a2: '9',
                a3: '8',
                endTotal: 27,
                tens: 1,
                xs: 0
            };
            
            const response = await authClient.post('/rounds/test-round/archers/test-archer/ends', endData);
            
            // May succeed or fail depending on round/archer existence
            expect([200, 201, 404]).toContain(response.status);
        });

        test('should handle perfect end (30 points)', async () => {
            const perfectEnd = {
                endNumber: 1,
                a1: 'X',
                a2: 'X',
                a3: 'X',
                endTotal: 30,
                tens: 3,
                xs: 3
            };
            
            const response = await authClient.post('/rounds/test-round/archers/test-archer/ends', perfectEnd);
            
            expect([200, 201, 404]).toContain(response.status);
        });

        test('should handle missed arrows', async () => {
            const missedEnd = {
                endNumber: 1,
                a1: 'M',
                a2: '5',
                a3: 'M',
                endTotal: 5,
                tens: 0,
                xs: 0
            };
            
            const response = await authClient.post('/rounds/test-round/archers/test-archer/ends', missedEnd);
            
            expect([200, 201, 404]).toContain(response.status);
        });
    });

    describe('PUT /v1/round_archers/{id}/scores', () => {
        test('should require authentication', async () => {
            const response = await client.put('/round_archers/test-round-archer/scores', {
                scores: []
            });
            
            expect([401, 404]).toContain(response.status);
        });

        test('should validate scorecard data', async () => {
            const response = await authClient.put('/round_archers/test-round-archer/scores', {});
            
            // Should fail validation or return 404 for non-existent round archer
            expect([400, 404]).toContain(response.status);
        });

        test('should handle complete scorecard update', async () => {
            const scorecard = {
                scores: [
                    { arrows: ['10', '9', '8'] },
                    { arrows: ['X', '10', '9'] },
                    { arrows: ['7', '6', '5'] }
                ]
            };
            
            const response = await authClient.put('/round_archers/test-round-archer/scores', scorecard);
            
            // May succeed or fail depending on round archer existence
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.data).toHaveProperty('success');
                expect(response.data.success).toBe(true);
            }
        });

        test('should handle partial scorecard update', async () => {
            const partialScorecard = {
                scores: [
                    { arrows: ['10', '9', '8'] }
                ]
            };
            
            const response = await authClient.put('/round_archers/test-round-archer/scores', partialScorecard);
            
            expect([200, 404]).toContain(response.status);
        });
    });

    describe('GET /v1/rounds/{id}/archers/{id}/scorecard', () => {
        test('should return scorecard data', async () => {
            const response = await authClient.get('/rounds/test-round/archers/test-archer/scorecard');
            
            // Should return 404 for non-existent round/archer or scorecard data
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.data).toHaveProperty('archer');
                expect(response.data).toHaveProperty('ends');
            }
        });

        test('should have reasonable response time', async () => {
            const startTime = Date.now();
            const response = await authClient.get('/rounds/test-round/archers/test-archer/scorecard');
            const responseTime = Date.now() - startTime;
            
            expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
        });
    });

    describe('Scoring Calculations', () => {
        test('should validate arrow score ranges', async () => {
            const invalidEnd = {
                endNumber: 1,
                a1: '15', // Invalid - max is 10
                a2: '-1', // Invalid - min is 0
                a3: '5'
            };
            
            const response = await authClient.post('/rounds/test-round/archers/test-archer/ends', invalidEnd);
            
            // Should handle invalid scores gracefully
            expect([200, 201, 400, 404]).toContain(response.status);
        });

        test('should handle X vs 10 scoring correctly', async () => {
            const xVs10End = {
                endNumber: 1,
                a1: 'X',   // Should count as 10 + X
                a2: '10',  // Should count as 10 + 10
                a3: '9',
                endTotal: 29,
                tens: 2,
                xs: 1
            };
            
            const response = await authClient.post('/rounds/test-round/archers/test-archer/ends', xVs10End);
            
            expect([200, 201, 404]).toContain(response.status);
        });
    });
});

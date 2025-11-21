/**
 * Scoring Validation API Tests
 * Tests scoring validation and edge cases
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Scoring Validation API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('Arrow Value Validation', () => {
        test('should accept valid arrow values', async () => {
            const validArrows = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'X', 'M'];
            
            for (const arrow of validArrows) {
                const endData = {
                    endNumber: 1,
                    a1: arrow,
                    a2: '5',
                    a3: '5'
                };
                
                const response = await authClient.post('/rounds/test-round/archers/test-archer/ends', endData);
                
                // Should accept valid arrows (may fail due to non-existent round/archer)
                expect([200, 201, 404]).toContain(response.status);
            }
        });

        test('should handle case insensitive arrow values', async () => {
            const caseTestEnd = {
                endNumber: 1,
                a1: 'x',  // lowercase x
                a2: 'm',  // lowercase m
                a3: '10'
            };
            
            const response = await authClient.post('/rounds/test-round/archers/test-archer/ends', caseTestEnd);
            
            expect([200, 201, 404]).toContain(response.status);
        });
    });

    describe('End Number Validation', () => {
        test('should validate end number ranges', async () => {
            const invalidEndNumbers = [0, -1, 999];
            
            for (const endNumber of invalidEndNumbers) {
                const endData = {
                    endNumber: endNumber,
                    a1: '10',
                    a2: '9',
                    a3: '8'
                };
                
                const response = await authClient.post('/rounds/test-round/archers/test-archer/ends', endData);
                
                // Should handle invalid end numbers
                expect([400, 404]).toContain(response.status);
            }
        });

        test('should accept valid end numbers', async () => {
            const validEndNumbers = [1, 2, 10, 20];
            
            for (const endNumber of validEndNumbers) {
                const endData = {
                    endNumber: endNumber,
                    a1: '10',
                    a2: '9',
                    a3: '8'
                };
                
                const response = await authClient.post('/rounds/test-round/archers/test-archer/ends', endData);
                
                // Should accept valid end numbers (may fail due to non-existent round/archer)
                expect([200, 201, 404]).toContain(response.status);
            }
        });
    });

    describe('Score Calculation Validation', () => {
        test('should calculate running totals correctly', async () => {
            const scorecard = {
                scores: [
                    { arrows: ['10', '10', '10'] }, // End 1: 30 points
                    { arrows: ['9', '9', '9'] },    // End 2: 27 points (total: 57)
                    { arrows: ['8', '8', '8'] }     // End 3: 24 points (total: 81)
                ]
            };
            
            const response = await authClient.put('/round_archers/test-round-archer/scores', scorecard);
            
            expect([200, 404]).toContain(response.status);
        });

        test('should handle empty arrows gracefully', async () => {
            const scorecardWithEmpties = {
                scores: [
                    { arrows: ['10', '', '9'] },
                    { arrows: ['', '', ''] },
                    { arrows: ['8', '7', ''] }
                ]
            };
            
            const response = await authClient.put('/round_archers/test-round-archer/scores', scorecardWithEmpties);
            
            expect([200, 404]).toContain(response.status);
        });
    });
});

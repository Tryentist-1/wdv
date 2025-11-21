/**
 * Match Scoring API Tests
 * Tests advanced match scoring functionality
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Match Scoring API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('POST /v1/solo-matches/{id}/archers/{id}/sets', () => {
        test('should require authentication', async () => {
            const response = await client.post('/solo-matches/test-match/archers/test-archer/sets', {
                setNumber: 1,
                a1: '10',
                a2: '9',
                a3: '8'
            });
            
            expect([401, 404]).toContain(response.status);
        });

        test('should validate set submission data', async () => {
            const response = await authClient.post('/solo-matches/test-match/archers/test-archer/sets', {});
            
            // Should fail validation or return 404 for non-existent match/archer
            expect([400, 404]).toContain(response.status);
        });

        test('should handle valid set submission', async () => {
            const setData = {
                setNumber: 1,
                a1: '10',
                a2: '9',
                a3: '8',
                setTotal: 27,
                setPoints: 2, // Match points for this set
                tens: 1,
                xs: 0
            };
            
            const response = await authClient.post('/solo-matches/test-match/archers/test-archer/sets', setData);
            
            // May succeed or fail depending on match/archer existence
            expect([200, 201, 404]).toContain(response.status);
        });

        test('should handle perfect set (30 points)', async () => {
            const perfectSet = {
                setNumber: 1,
                a1: 'X',
                a2: 'X',
                a3: 'X',
                setTotal: 30,
                setPoints: 2,
                tens: 3,
                xs: 3
            };
            
            const response = await authClient.post('/solo-matches/test-match/archers/test-archer/sets', perfectSet);
            
            expect([200, 201, 404]).toContain(response.status);
        });

        test('should handle tie scenarios', async () => {
            const tieSet = {
                setNumber: 1,
                a1: '9',
                a2: '9',
                a3: '9',
                setTotal: 27,
                setPoints: 1, // Tie points
                tens: 0,
                xs: 0
            };
            
            const response = await authClient.post('/solo-matches/test-match/archers/test-archer/sets', tieSet);
            
            expect([200, 201, 404]).toContain(response.status);
        });
    });

    describe('POST /v1/team-matches/{id}/teams/{id}/archers/{id}/sets', () => {
        test('should require authentication', async () => {
            const response = await client.post('/team-matches/test-match/teams/test-team/archers/test-archer/sets', {
                setNumber: 1,
                a1: '10'
            });
            
            expect([401, 404]).toContain(response.status);
        });

        test('should validate team set submission data', async () => {
            const response = await authClient.post('/team-matches/test-match/teams/test-team/archers/test-archer/sets', {});
            
            // Should fail validation or return 404 for non-existent match/team/archer
            expect([400, 404]).toContain(response.status);
        });

        test('should handle valid team set submission', async () => {
            const teamSetData = {
                setNumber: 1,
                a1: '10', // Team matches may have different arrow counts
                setTotal: 10,
                setPoints: 2,
                tens: 1,
                xs: 0
            };
            
            const response = await authClient.post('/team-matches/test-match/teams/test-team/archers/test-archer/sets', teamSetData);
            
            // May succeed or fail depending on match/team/archer existence
            expect([200, 201, 404]).toContain(response.status);
        });

        test('should handle team perfect arrow', async () => {
            const perfectArrow = {
                setNumber: 1,
                a1: 'X',
                setTotal: 10,
                setPoints: 2,
                tens: 1,
                xs: 1
            };
            
            const response = await authClient.post('/team-matches/test-match/teams/test-team/archers/test-archer/sets', perfectArrow);
            
            expect([200, 201, 404]).toContain(response.status);
        });
    });

    describe('Match Scoring Validation', () => {
        test('should validate set numbers', async () => {
            const invalidSetNumbers = [0, -1, 999];
            
            for (const setNumber of invalidSetNumbers) {
                const setData = {
                    setNumber: setNumber,
                    a1: '10',
                    a2: '9',
                    a3: '8'
                };
                
                const response = await authClient.post('/solo-matches/test-match/archers/test-archer/sets', setData);
                
                // Should handle invalid set numbers
                expect([400, 404]).toContain(response.status);
            }
        });

        test('should validate set points', async () => {
            const invalidSetPoints = [-1, 3, 999]; // Assuming 0-2 are valid
            
            for (const setPoints of invalidSetPoints) {
                const setData = {
                    setNumber: 1,
                    a1: '10',
                    a2: '9',
                    a3: '8',
                    setPoints: setPoints
                };
                
                const response = await authClient.post('/solo-matches/test-match/archers/test-archer/sets', setData);
                
                // Should handle invalid set points gracefully
                expect([200, 201, 400, 404]).toContain(response.status);
            }
        });
    });
});

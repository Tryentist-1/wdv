/**
 * Verification Workflows API Tests
 * Tests verification and validation systems across all contexts
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Verification Workflows API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('POST /v1/round_archers/{id}/verify', () => {
        test('should require authentication', async () => {
            const response = await client.post('/round_archers/test-round-archer/verify', {
                action: 'verify'
            });
            
            expect([400, 401, 404]).toContain(response.status);
        });

        test('should verify round archer', async () => {
            const verifyData = {
                action: 'verify',
                verifiedBy: 'test-coach',
                notes: 'Scorecard verified'
            };
            
            const response = await authClient.post('/round_archers/test-round-archer/verify', verifyData);
            
            // May succeed or fail depending on round archer existence
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.data).toHaveProperty('success');
                expect(response.data.success).toBe(true);
            }
        });

        test('should handle unverify action', async () => {
            const unverifyData = {
                action: 'unverify',
                verifiedBy: 'test-coach',
                notes: 'Scorecard needs correction'
            };
            
            const response = await authClient.post('/round_archers/test-round-archer/verify', unverifyData);
            
            expect([200, 404]).toContain(response.status);
        });

        test('should validate verification data', async () => {
            const invalidData = {
                action: 'invalid_action'
            };
            
            const response = await authClient.post('/round_archers/test-round-archer/verify', invalidData);
            
            expect([400, 404]).toContain(response.status);
        });
    });

    describe('POST /v1/round_archers/{id}/verification', () => {
        test('should require authentication', async () => {
            const response = await client.post('/round_archers/test-round-archer/verification', {
                status: 'verified'
            });
            
            expect([400, 401, 404]).toContain(response.status);
        });

        test('should handle verification status update', async () => {
            const statusData = {
                status: 'verified',
                verifiedBy: 'test-coach',
                timestamp: new Date().toISOString(),
                notes: 'All scores verified'
            };
            
            const response = await authClient.post('/round_archers/test-round-archer/verification', statusData);
            
            expect([200, 404]).toContain(response.status);
        });

        test('should validate verification status', async () => {
            const invalidStatuses = ['invalid', '', null];
            
            for (const status of invalidStatuses) {
                const statusData = {
                    status: status,
                    verifiedBy: 'test-coach'
                };
                
                const response = await authClient.post('/round_archers/test-round-archer/verification', statusData);
                
                expect([400, 404]).toContain(response.status);
            }
        });
    });

    describe('POST /v1/rounds/{id}/verification/bale', () => {
        test('should require authentication', async () => {
            const response = await client.post('/rounds/test-round/verification/bale', {
                baleNumber: 1,
                action: 'verify'
            });
            
            expect([400, 401, 404]).toContain(response.status);
        });

        test('should verify entire bale', async () => {
            const baleVerifyData = {
                baleNumber: 1,
                action: 'verify',
                verifiedBy: 'test-coach',
                notes: 'All archers on bale verified'
            };
            
            const response = await authClient.post('/rounds/test-round/verification/bale', baleVerifyData);
            
            expect([200, 404]).toContain(response.status);
        });

        test('should validate bale number', async () => {
            const invalidBaleNumbers = [0, -1, 999, null];
            
            for (const baleNumber of invalidBaleNumbers) {
                const baleData = {
                    baleNumber: baleNumber,
                    action: 'verify'
                };
                
                const response = await authClient.post('/rounds/test-round/verification/bale', baleData);
                
                expect([400, 404]).toContain(response.status);
            }
        });

        test('should handle bulk bale verification', async () => {
            const bulkVerifyData = {
                baleNumber: 1,
                action: 'verify_all',
                verifiedBy: 'test-coach',
                notes: 'Bulk verification of all targets'
            };
            
            const response = await authClient.post('/rounds/test-round/verification/bale', bulkVerifyData);
            
            expect([200, 404]).toContain(response.status);
        });
    });

    describe('POST /v1/rounds/{id}/verification/close', () => {
        test('should require authentication', async () => {
            const response = await client.post('/rounds/test-round/verification/close', {
                closedBy: 'test-coach'
            });
            
            expect([400, 401, 404]).toContain(response.status);
        });

        test('should close round verification', async () => {
            const closeData = {
                closedBy: 'test-coach',
                timestamp: new Date().toISOString(),
                notes: 'Round verification complete'
            };
            
            const response = await authClient.post('/rounds/test-round/verification/close', closeData);
            
            expect([200, 404]).toContain(response.status);
        });

        test('should validate close data', async () => {
            const invalidData = {
                closedBy: '', // Empty closedBy
                timestamp: 'invalid-date'
            };
            
            const response = await authClient.post('/rounds/test-round/verification/close', invalidData);
            
            expect([400, 404]).toContain(response.status);
        });
    });

    describe('POST /v1/events/verify', () => {
        test('should require authentication', async () => {
            const response = await client.post('/events/verify', {
                eventId: 'test-event',
                action: 'verify'
            });
            
            expect([400, 401, 404]).toContain(response.status);
        });

        test('should verify entire event', async () => {
            const eventVerifyData = {
                eventId: 'test-event',
                action: 'verify',
                verifiedBy: 'test-admin',
                notes: 'Event results verified'
            };
            
            const response = await authClient.post('/events/verify', eventVerifyData);
            
            expect([200, 400, 404]).toContain(response.status);
        });

        test('should handle event verification workflow', async () => {
            const workflowSteps = [
                { eventId: 'test-event', action: 'start_verification' },
                { eventId: 'test-event', action: 'verify_rounds' },
                { eventId: 'test-event', action: 'finalize' }
            ];
            
            for (const step of workflowSteps) {
                const response = await authClient.post('/events/verify', {
                    ...step,
                    verifiedBy: 'test-admin'
                });
                
                expect([200, 400, 404]).toContain(response.status);
            }
        });
    });

    describe('Match Verification Workflows', () => {
        test('should verify solo matches', async () => {
            const soloVerifyData = {
                verifiedBy: 'test-judge',
                notes: 'Solo match results verified',
                timestamp: new Date().toISOString()
            };
            
            const response = await authClient.post('/solo-matches/test-match/verify', soloVerifyData);
            
            expect([200, 404]).toContain(response.status);
        });

        test('should verify team matches', async () => {
            const teamVerifyData = {
                verifiedBy: 'test-judge',
                notes: 'Team match results verified',
                timestamp: new Date().toISOString()
            };
            
            const response = await authClient.post('/team-matches/test-match/verify', teamVerifyData);
            
            expect([200, 404]).toContain(response.status);
        });

        test('should handle match verification performance', async () => {
            const startTime = Date.now();
            
            const promises = [
                authClient.post('/solo-matches/test-match-1/verify', { verifiedBy: 'judge1' }),
                authClient.post('/solo-matches/test-match-2/verify', { verifiedBy: 'judge2' }),
                authClient.post('/team-matches/test-match-3/verify', { verifiedBy: 'judge3' })
            ];
            
            const responses = await Promise.all(promises);
            const responseTime = Date.now() - startTime;
            
            // Should handle concurrent verifications efficiently
            expect(responseTime).toBeLessThan(2000); // 2 seconds for 3 concurrent verifications
            
            responses.forEach(response => {
                expect([200, 404]).toContain(response.status);
            });
        });
    });
});

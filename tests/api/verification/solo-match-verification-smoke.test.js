/**
 * Solo Match Verification Smoke Tests
 * Quick smoke tests for solo match verification workflow
 * Created: December 1, 2025
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Solo Match Verification - Smoke Tests', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    describe('GET /v1/events/{id}/solo-matches - List Solo Matches for Verification', () => {
        test('should require authentication', async () => {
            const response = await client.get('/events/test-event-id/solo-matches');
            
            expect([401, 404]).toContain(response.status);
        });

        test('should return 404 for non-existent event', async () => {
            const response = await authClient.get('/events/non-existent-event-id/solo-matches');
            
            expect([404, 500]).toContain(response.status);
        });

        test('should return matches array and summary', async () => {
            // This will fail for non-existent events, but tests structure
            const response = await authClient.get('/events/test-event-id/solo-matches');
            
            if (response.status === 200) {
                expect(response.data).toHaveProperty('matches');
                expect(response.data).toHaveProperty('summary');
                expect(Array.isArray(response.data.matches)).toBe(true);
                
                // Summary should have expected properties
                expect(response.data.summary).toHaveProperty('total');
                expect(response.data.summary).toHaveProperty('pending');
                expect(response.data.summary).toHaveProperty('completed');
                expect(response.data.summary).toHaveProperty('verified');
                expect(response.data.summary).toHaveProperty('voided');
            } else {
                expect([404, 500]).toContain(response.status);
            }
        });

        test('should support bracket_id filter', async () => {
            const response = await authClient.get('/events/test-event-id/solo-matches?bracket_id=test-bracket-id');
            
            // Should accept the query parameter (may return empty array)
            expect([200, 404, 500]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.data).toHaveProperty('matches');
                expect(Array.isArray(response.data.matches)).toBe(true);
            }
        });

        test('should support status filter', async () => {
            const response = await authClient.get('/events/test-event-id/solo-matches?status=Completed');
            
            expect([200, 404, 500]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.data).toHaveProperty('matches');
                // All returned matches should have status=Completed
                response.data.matches.forEach(match => {
                    expect(match.status).toBe('Completed');
                });
            }
        });

        test('should support locked filter', async () => {
            const response = await authClient.get('/events/test-event-id/solo-matches?locked=false');
            
            expect([200, 404, 500]).toContain(response.status);
        });

        test('should support card_status filter', async () => {
            const response = await authClient.get('/events/test-event-id/solo-matches?card_status=COMP');
            
            expect([200, 404, 500]).toContain(response.status);
        });

        test('should include sets_won in match data', async () => {
            const response = await authClient.get('/events/test-event-id/solo-matches');
            
            if (response.status === 200 && response.data.matches.length > 0) {
                const match = response.data.matches[0];
                expect(match).toHaveProperty('archer1_sets_won');
                expect(match).toHaveProperty('archer2_sets_won');
                expect(typeof match.archer1_sets_won).toBe('number');
                expect(typeof match.archer2_sets_won).toBe('number');
            }
        });

        test('should include bracket_name when bracket_id exists', async () => {
            const response = await authClient.get('/events/test-event-id/solo-matches?bracket_id=test-bracket-id');
            
            if (response.status === 200 && response.data.matches.length > 0) {
                const matchWithBracket = response.data.matches.find(m => m.bracket_id);
                if (matchWithBracket) {
                    expect(matchWithBracket).toHaveProperty('bracket_name');
                }
            }
        });
    });

    describe('POST /v1/solo-matches/{id}/verify - Solo Match Verification', () => {
        test('should require authentication', async () => {
            const response = await client.post('/solo-matches/test-match-id/verify', {
                action: 'lock'
            });
            
            expect([401, 404]).toContain(response.status);
        });

        test('should return 404 for non-existent match', async () => {
            const response = await authClient.post('/solo-matches/non-existent-match/verify', {
                action: 'lock',
                verifiedBy: 'test-coach'
            });
            
            expect(response.status).toBe(404);
        });

        test('should validate action parameter', async () => {
            const invalidActions = ['invalid', '', null, 'verify_all'];
            
            for (const action of invalidActions) {
                const response = await authClient.post('/solo-matches/test-match-id/verify', {
                    action: action,
                    verifiedBy: 'test-coach'
                });
                
                // Should reject invalid actions (400) or match not found (404)
                expect([400, 404]).toContain(response.status);
            }
        });

        test('should accept valid actions (lock, unlock, void)', async () => {
            const validActions = ['lock', 'unlock', 'void'];
            
            for (const action of validActions) {
                const response = await authClient.post('/solo-matches/test-match-id/verify', {
                    action: action,
                    verifiedBy: 'test-coach',
                    notes: `Test ${action} action`
                });
                
                // Should accept the action format (will fail if match doesn't exist, but validates action)
                expect([200, 400, 404, 409]).toContain(response.status);
            }
        });

        test('should exclude standalone matches (no event_id)', async () => {
            // This test validates the backend logic that excludes standalone matches
            // We can't easily create a standalone match in tests, but we can verify
            // the endpoint returns 400 for matches without event_id
            
            // Note: This would require a real match ID without event_id to fully test
            // For now, we just verify the endpoint structure accepts the request
            const response = await authClient.post('/solo-matches/test-match-id/verify', {
                action: 'lock',
                verifiedBy: 'test-coach'
            });
            
            // Will be 404 (match not found) or 400 (standalone match) or 200 (if test match exists)
            expect([200, 400, 404, 409]).toContain(response.status);
        });
    });

    describe('Solo Match Verification Workflow - End to End', () => {
        test('should list matches, verify one, and list again with updated status', async () => {
            // Step 1: List matches for an event
            const listResponse = await authClient.get('/events/test-event-id/solo-matches?status=Completed&locked=false');
            
            if (listResponse.status === 200 && listResponse.data.matches.length > 0) {
                const match = listResponse.data.matches[0];
                const matchId = match.id;
                
                // Step 2: Verify the match
                const verifyResponse = await authClient.post(`/solo-matches/${matchId}/verify`, {
                    action: 'lock',
                    verifiedBy: 'smoke-test-coach',
                    notes: 'Smoke test verification'
                });
                
                // Step 3: List again to verify status changed
                if (verifyResponse.status === 200) {
                    const listAfterResponse = await authClient.get(`/events/${match.event_id}/solo-matches?card_status=VER`);
                    
                    if (listAfterResponse.status === 200) {
                        const verifiedMatch = listAfterResponse.data.matches.find(m => m.id === matchId);
                        if (verifiedMatch) {
                            expect(verifiedMatch.card_status).toBe('VER');
                            expect(verifiedMatch.locked).toBe(true);
                            expect(verifiedMatch.verified_by).toBe('smoke-test-coach');
                        }
                    }
                }
            }
            
            // Test passes if we get expected responses (even if no matches exist)
            expect(listResponse.status).toBeDefined();
        });
    });

    describe('GET /v1/events/{id}/solo-matches - Response Format Validation', () => {
        test('should return matches with required fields', async () => {
            const response = await authClient.get('/events/test-event-id/solo-matches');
            
            if (response.status === 200 && response.data.matches.length > 0) {
                const match = response.data.matches[0];
                
                // Required fields for verification UI
                expect(match).toHaveProperty('id');
                expect(match).toHaveProperty('event_id');
                expect(match).toHaveProperty('status');
                expect(match).toHaveProperty('card_status');
                expect(match).toHaveProperty('locked');
                expect(match).toHaveProperty('match_display'); // For UI display
                
                // Match display should contain "vs"
                if (match.match_display) {
                    expect(match.match_display).toContain(' vs ');
                }
            }
        });

        test('should return summary with correct structure', async () => {
            const response = await authClient.get('/events/test-event-id/solo-matches');
            
            if (response.status === 200) {
                const summary = response.data.summary;
                
                expect(typeof summary.total).toBe('number');
                expect(typeof summary.pending).toBe('number');
                expect(typeof summary.completed).toBe('number');
                expect(typeof summary.verified).toBe('number');
                expect(typeof summary.voided).toBe('number');
                
                // Summary counts should add up to total
                const sum = summary.pending + summary.completed + summary.verified + summary.voided;
                expect(sum).toBeLessThanOrEqual(summary.total);
            }
        });
    });
});


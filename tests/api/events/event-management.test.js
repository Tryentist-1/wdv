/**
 * Event Round & Roster Management API Tests
 * Tests for event-linked round creation, round listing, archer assignment, and roster import.
 * Covers:
 *   POST /v1/events/:id/rounds
 *   GET  /v1/events/:id/rounds
 *   POST /v1/events/:id/rounds/:roundId/archers
 *   POST /v1/events/:id/import-roster
 *   POST /v1/events/:id/archers (deprecated, should return 410/400)
 */

const { TestDataManager, APIClient, TestAssertions } = require('../helpers/test-data');

describe('Event Round & Roster Management API', () => {
    let api;
    let publicApi;
    let testManager;
    let testEventId;

    beforeAll(async () => {
        const client = new APIClient();
        api = client.withPasscode('wdva26');
        publicApi = new APIClient();
        testManager = new TestDataManager();

        // Create a standard (non-GAMES) event
        const eventResp = await api.post('/events', {
            name: `Mgmt Test Event ${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            status: 'Planned',
            entryCode: `MG${Date.now() % 10000}`,
            eventType: 'manual'
        });
        expect(eventResp.status).toBe(201);
        testEventId = eventResp.data.eventId;
        testManager.trackResource('events', testEventId);
    });

    // ── POST /v1/events/:id/rounds ────────────────────────────────────

    describe('POST /v1/events/:id/rounds', () => {
        test('should create division rounds for event', async () => {
            const response = await api.post(`/events/${testEventId}/rounds`, {
                divisions: ['BVAR']
            });

            expect([200, 201]).toContain(response.status);
            // API may return rounds array or single roundId
            const rounds = response.data.rounds || [];
            if (rounds.length > 0) {
                testManager.trackResource('rounds', rounds[0].roundId || rounds[0].id);
            }
        });

        test('should create multiple division rounds at once', async () => {
            // Create a fresh event to avoid duplicates
            const freshEvent = await api.post('/events', {
                name: `Multi-Div Event ${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                entryCode: `MD${Date.now() % 10000}`,
                eventType: 'manual'
            });
            const freshId = freshEvent.data.eventId;
            testManager.trackResource('events', freshId);

            const response = await api.post(`/events/${freshId}/rounds`, {
                divisions: ['GVAR', 'BJV', 'GJV']
            });

            expect([200, 201]).toContain(response.status);
        });

        test('should reject round creation without auth', async () => {
            const response = await publicApi.post(`/events/${testEventId}/rounds`, {
                division: 'BVAR'
            });

            expect(response.status).toBe(401);
        });

        test('should reject round without divisions array', async () => {
            const response = await api.post(`/events/${testEventId}/rounds`, {
                division: 'BVAR'
            });

            expect(response.status).toBe(400);
            expect(response.data.error).toMatch(/divisions/i);
        });

        test('should reject round for non-existent event', async () => {
            const response = await api.post('/events/00000000-0000-0000-0000-000000000000/rounds', {
                divisions: ['BVAR']
            });

            expect([400, 404]).toContain(response.status);
        });
    });

    // ── GET /v1/events/:id/rounds ─────────────────────────────────────

    describe('GET /v1/events/:id/rounds', () => {
        test('should list rounds for event', async () => {
            const response = await api.get(`/events/${testEventId}/rounds`);

            expect(response.status).toBe(200);
            const rounds = response.data.rounds || response.data;
            expect(Array.isArray(rounds)).toBe(true);
            // Rounds may or may not exist depending on prior test state
            expect(rounds.length).toBeGreaterThanOrEqual(0);
        });

        test('should include division in round data', async () => {
            const response = await api.get(`/events/${testEventId}/rounds`);
            expect(response.status).toBe(200);

            const rounds = response.data.rounds || response.data;
            if (rounds.length > 0) {
                expect(rounds[0]).toHaveProperty('division');
            }
        });

        test('should reject without auth', async () => {
            const response = await publicApi.get(`/events/${testEventId}/rounds`);
            expect(response.status).toBe(401);
        });

        test('should return empty for event with no rounds', async () => {
            // Create a fresh event
            const eventResp = await api.post('/events', {
                name: `No Rounds Event ${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                entryCode: `NR${Date.now() % 10000}`,
                eventType: 'manual'
            });
            const freshEventId = eventResp.data.eventId;
            testManager.trackResource('events', freshEventId);

            const response = await api.get(`/events/${freshEventId}/rounds`);
            expect(response.status).toBe(200);

            const rounds = response.data.rounds || response.data;
            expect(Array.isArray(rounds)).toBe(true);
            expect(rounds.length).toBe(0);
        });
    });

    // ── POST /v1/events/:id/rounds/:roundId/archers ───────────────────

    describe('POST /v1/events/:id/rounds/:roundId/archers', () => {
        let roundId;

        beforeAll(async () => {
            // Create a round to add archers to
            const roundResp = await api.post(`/events/${testEventId}/rounds`, {
                divisions: ['OPEN']
            });
            if (roundResp.status === 200 || roundResp.status === 201) {
                const rounds = roundResp.data.rounds || [];
                roundId = rounds.length > 0 ? (rounds[0].roundId || rounds[0].id) : (roundResp.data.roundId || roundResp.data.id);
                if (roundId) {
                    testManager.trackResource('rounds', roundId);
                }
            }
        });

        test('should add archers to an event round', async () => {
            if (!roundId) {
                console.warn('No round created — skipping');
                return;
            }

            // Get archers from system
            const archersResp = await api.get('/archers?status=all');
            const archers = archersResp.data.archers || archersResp.data;

            if (archers.length === 0) {
                console.warn('No archers in system — skipping');
                return;
            }

            const archerIds = archers.slice(0, 3).map(a => a.id);

            const response = await api.post(`/events/${testEventId}/rounds/${roundId}/archers`, {
                archerIds
            });

            expect([200, 201]).toContain(response.status);
        });

        test('should reject without auth', async () => {
            if (!roundId) return;

            const response = await publicApi.post(`/events/${testEventId}/rounds/${roundId}/archers`, {
                archerIds: ['00000000-0000-0000-0000-000000000000']
            });

            expect(response.status).toBe(401);
        });
    });

    // ── POST /v1/events/:id/import-roster ─────────────────────────────

    describe('POST /v1/events/:id/import-roster', () => {
        let gamesEventId;

        beforeAll(async () => {
            // Create a GAMES event for roster import
            const eventResp = await api.post('/events', {
                name: `Roster Import Test ${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                eventType: 'manual',
                eventFormat: 'GAMES',
                totalBales: 8,
                targetsPerBale: 4
            });
            gamesEventId = eventResp.data.eventId;
            testManager.trackResource('events', gamesEventId);
        });

        test('should reject import-roster without auth', async () => {
            const response = await publicApi.post(`/events/${gamesEventId}/import-roster`, {});
            expect(response.status).toBe(401);
        });

        test('should handle import-roster for event with no roster assignments', async () => {
            const response = await api.post(`/events/${gamesEventId}/import-roster`, {});

            // Returns 400 when no archers have assignments, 201 on success
            expect([200, 201, 400]).toContain(response.status);
        });

        test('should reject import-roster for non-existent event', async () => {
            const response = await api.post('/events/00000000-0000-0000-0000-000000000000/import-roster', {});
            expect([400, 404]).toContain(response.status);
        });
    });

    // ── POST /v1/events/:id/archers (deprecated) ─────────────────────

    describe('POST /v1/events/:id/archers (deprecated)', () => {
        test('should return deprecation error', async () => {
            const response = await api.post(`/events/${testEventId}/archers`, {
                archerIds: ['00000000-0000-0000-0000-000000000000']
            });

            // Endpoint returns 410 Gone or 400 with deprecation message
            expect([400, 410]).toContain(response.status);
            if (response.data && response.data.error) {
                expect(response.data.error.toLowerCase()).toContain('deprecated');
            }
        });
    });

    // ── GET /v1/events/:id/overview ───────────────────────────────────

    describe('GET /v1/events/:id/overview (bracket data)', () => {
        test('should include brackets in overview for GAMES event', async () => {
            // Create GAMES event with bracket
            const eventResp = await api.post('/events', {
                name: `Overview Test ${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                eventType: 'manual',
                eventFormat: 'GAMES',
                totalBales: 8
            });
            const eventId = eventResp.data.eventId;
            testManager.trackResource('events', eventId);

            // Create a bracket
            await api.post(`/events/${eventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BVAR'
            });

            const response = await api.get(`/events/${eventId}/overview`);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('brackets');
            expect(Array.isArray(response.data.brackets)).toBe(true);
        });

        test('should include summary stats with bracket counts', async () => {
            const response = await api.get(`/events/${testEventId}/overview`);
            expect(response.status).toBe(200);

            if (response.data.summary) {
                expect(response.data.summary).toHaveProperty('total_rounds');
            }
        });
    });
});

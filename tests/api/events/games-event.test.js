/**
 * Games Event API Tests
 * Tests for Games Event creation with bale config and roster import
 */

const { TestDataManager, APIClient, TestAssertions } = require('../helpers/test-data');

describe('Games Event API', () => {
    let api;
    let testManager;

    beforeAll(() => {
        const client = new APIClient();
        api = client.withPasscode('wdva26');
        testManager = new TestDataManager();
    });

    describe('POST /v1/events (Games format)', () => {
        test('should create a Games Event with bale configuration', async () => {
            const response = await api.post('/events', {
                name: `Games Test ${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                status: 'Planned',
                entryCode: `GT${Date.now() % 10000}`,
                eventType: 'manual',
                eventFormat: 'GAMES',
                totalBales: 16,
                targetsPerBale: 4
            });

            expect(response.status).toBe(201);
            expect(response.data.eventId).toBeDefined();
            testManager.trackResource('events', response.data.eventId);
        });

        test('should create standard event without Games fields (backward compatible)', async () => {
            const response = await api.post('/events', {
                name: `Standard Test ${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                status: 'Planned',
                entryCode: `ST${Date.now() % 10000}`,
                eventType: 'manual'
            });

            expect(response.status).toBe(201);
            expect(response.data.eventId).toBeDefined();
            testManager.trackResource('events', response.data.eventId);
        });
    });

    describe('PATCH /v1/events/:id (Games format fields)', () => {
        test('should update event with Games format fields', async () => {
            // Create event first
            const createResp = await api.post('/events', {
                name: `Patch Test ${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                status: 'Planned',
                entryCode: `PT${Date.now() % 10000}`,
                eventType: 'manual'
            });
            expect(createResp.status).toBe(201);
            const eventId = createResp.data.eventId;
            testManager.trackResource('events', eventId);

            // Update with Games fields
            const patchResp = await api.patch(`/events/${eventId}`, {
                eventFormat: 'GAMES',
                totalBales: 12,
                targetsPerBale: 4
            });
            expect(patchResp.status).toBe(200);
        });

        test('should reject invalid eventFormat', async () => {
            const createResp = await api.post('/events', {
                name: `Invalid Format ${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                entryCode: `IF${Date.now() % 10000}`,
                eventType: 'manual'
            });
            expect(createResp.status).toBe(201);
            const eventId = createResp.data.eventId;
            testManager.trackResource('events', eventId);

            const patchResp = await api.patch(`/events/${eventId}`, {
                eventFormat: 'INVALID'
            });
            expect(patchResp.status).toBe(400);
        });
    });

    describe('GET /v1/events/recent', () => {
        test('should include event_format in coach view', async () => {
            const response = await api.get('/events/recent');
            expect(response.status).toBe(200);
            expect(response.data.events).toBeDefined();
            expect(Array.isArray(response.data.events)).toBe(true);

            // All events should have event_format field (even if null)
            if (response.data.events.length > 0) {
                const firstEvent = response.data.events[0];
                expect(firstEvent).toHaveProperty('event_format');
            }
        });
    });

    describe('GET /v1/brackets/:id/suggested-rounds', () => {
        test('should return suggested rounds for a Swiss bracket', async () => {
            // Create event
            const eventResp = await api.post('/events', {
                name: `Suggest Test ${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                eventType: 'manual',
                eventFormat: 'GAMES',
                totalBales: 16
            });
            const eventId = eventResp.data.eventId;
            testManager.trackResource('events', eventId);

            // Create bracket
            const bracketResp = await api.post(`/events/${eventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BVAR',
                mode: 'AUTO'
            });
            expect(bracketResp.status).toBe(201);
            const bracketId = bracketResp.data.bracketId || bracketResp.data.id;
            testManager.trackResource('brackets', bracketId);

            // Check suggested rounds (empty bracket)
            const suggestResp = await api.get(`/brackets/${bracketId}/suggested-rounds`);
            expect(suggestResp.status).toBe(200);
            expect(suggestResp.data).toHaveProperty('suggestedRounds');
            expect(suggestResp.data).toHaveProperty('rosterSize');
            expect(suggestResp.data.rosterSize).toBe(0);
            expect(suggestResp.data.suggestedRounds).toBe(0);
        });
    });

    describe('POST /v1/solo-matches (with bale fields)', () => {
        test('should create solo match with bale assignment', async () => {
            const response = await api.post('/solo-matches', {
                date: new Date().toISOString().split('T')[0],
                baleNumber: 3,
                lineNumber: 1,
                wave: 'A'
            });

            expect(response.status).toBe(201);
            expect(response.data.matchId).toBeDefined();
            testManager.trackResource('soloMatches', response.data.matchId);

            // Verify bale fields in GET response
            const getResp = await api.get(`/solo-matches/${response.data.matchId}`);
            expect(getResp.status).toBe(200);
            expect(getResp.data.match.bale_number).toBe(3);
            expect(getResp.data.match.line_number).toBe(1);
            expect(getResp.data.match.wave).toBe('A');
        });

        test('should create solo match without bale fields (backward compatible)', async () => {
            const response = await api.post('/solo-matches', {
                date: new Date().toISOString().split('T')[0]
            });

            expect(response.status).toBe(201);
            const getResp = await api.get(`/solo-matches/${response.data.matchId}`);
            expect(getResp.data.match.bale_number).toBeNull();
            expect(getResp.data.match.line_number).toBeNull();
            expect(getResp.data.match.wave).toBeNull();
            testManager.trackResource('soloMatches', response.data.matchId);
        });
    });

    describe('POST /v1/team-matches (with bale fields)', () => {
        test('should create team match with bale assignment', async () => {
            const response = await api.post('/team-matches', {
                date: new Date().toISOString().split('T')[0],
                baleNumber: 7,
                lineNumber: 2,
                wave: null
            });

            expect(response.status).toBe(201);
            expect(response.data.matchId).toBeDefined();
            testManager.trackResource('teamMatches', response.data.matchId);

            // Verify bale fields in GET response
            const getResp = await api.get(`/team-matches/${response.data.matchId}`);
            expect(getResp.status).toBe(200);
            expect(getResp.data.match.bale_number).toBe(7);
            expect(getResp.data.match.line_number).toBe(2);
        });
    });
});

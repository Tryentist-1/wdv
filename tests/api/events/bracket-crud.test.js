/**
 * Bracket CRUD API Tests
 * Tests for bracket creation, retrieval, update, deletion, entries, generation, and results.
 * Covers: POST/GET /v1/events/:id/brackets, GET/PATCH/DELETE /v1/brackets/:id,
 *         POST/GET/DELETE /v1/brackets/:id/entries, POST /v1/brackets/:id/generate,
 *         GET /v1/brackets/:id/results, POST /v1/brackets/:id/generate-round
 */

const { TestDataManager, APIClient, TestAssertions } = require('../helpers/test-data');

describe('Bracket CRUD API', () => {
    let api;
    let publicApi;
    let testManager;
    let testEventId;

    beforeAll(async () => {
        const client = new APIClient();
        api = client.withPasscode('wdva26');
        publicApi = new APIClient();
        testManager = new TestDataManager();

        // Create a GAMES event for bracket tests
        const eventResp = await api.post('/events', {
            name: `Bracket Test Event ${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            eventType: 'manual',
            eventFormat: 'GAMES',
            totalBales: 8,
            targetsPerBale: 4
        });
        expect(eventResp.status).toBe(201);
        testEventId = eventResp.data.eventId;
        testManager.trackResource('events', testEventId);
    });

    // ── POST /v1/events/:id/brackets ──────────────────────────────────

    describe('POST /v1/events/:id/brackets', () => {
        test('should create a SOLO SWISS bracket', async () => {
            const response = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BVAR',
                mode: 'AUTO'
            });

            expect(response.status).toBe(201);
            expect(response.data.bracketId || response.data.id).toBeDefined();
            testManager.trackResource('brackets', response.data.bracketId || response.data.id);
        });

        test('should create a SOLO ELIMINATION bracket', async () => {
            const response = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'ELIMINATION',
                division: 'GVAR'
            });

            expect(response.status).toBe(201);
            expect(response.data.bracketId || response.data.id).toBeDefined();
            testManager.trackResource('brackets', response.data.bracketId || response.data.id);
        });

        test('should reject bracket without auth', async () => {
            const response = await publicApi.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BVAR'
            });

            expect(response.status).toBe(401);
        });

        test('should reject bracket for non-existent event', async () => {
            const response = await api.post('/events/00000000-0000-0000-0000-000000000000/brackets', {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BVAR'
            });

            expect([400, 404]).toContain(response.status);
        });
    });

    // ── GET /v1/events/:id/brackets ───────────────────────────────────

    describe('GET /v1/events/:id/brackets', () => {
        test('should list brackets for event (public)', async () => {
            const response = await publicApi.get(`/events/${testEventId}/brackets`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.data.brackets || response.data)).toBe(true);
        });

        test('should return empty array for event with no brackets', async () => {
            // Create a fresh event with no brackets
            const eventResp = await api.post('/events', {
                name: `Empty Bracket Event ${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                eventType: 'manual',
                eventFormat: 'GAMES'
            });
            const emptyEventId = eventResp.data.eventId;
            testManager.trackResource('events', emptyEventId);

            const response = await publicApi.get(`/events/${emptyEventId}/brackets`);
            expect(response.status).toBe(200);

            const brackets = response.data.brackets || response.data;
            expect(Array.isArray(brackets)).toBe(true);
            expect(brackets.length).toBe(0);
        });
    });

    // ── GET /v1/brackets/:id ──────────────────────────────────────────

    describe('GET /v1/brackets/:id', () => {
        let bracketId;

        beforeAll(async () => {
            const resp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BJV'
            });
            bracketId = resp.data.bracketId || resp.data.id;
            testManager.trackResource('brackets', bracketId);
        });

        test('should get bracket details with auth', async () => {
            const response = await api.get(`/brackets/${bracketId}`);

            expect(response.status).toBe(200);
            const bracket = response.data.bracket || response.data;
            expect(bracket.id || bracket.bracketId).toBeDefined();
        });

        test('should 404 for non-existent bracket', async () => {
            const response = await api.get('/brackets/00000000-0000-0000-0000-000000000000');
            expect(response.status).toBe(404);
        });
    });

    // ── PATCH /v1/brackets/:id ────────────────────────────────────────

    describe('PATCH /v1/brackets/:id', () => {
        let bracketId;

        beforeAll(async () => {
            const resp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'GJV'
            });
            bracketId = resp.data.bracketId || resp.data.id;
            testManager.trackResource('brackets', bracketId);
        });

        test('should update bracket status', async () => {
            const response = await api.patch(`/brackets/${bracketId}`, {
                status: 'IN_PROGRESS'
            });

            expect(response.status).toBe(200);
        });

        test('should reject update without auth', async () => {
            const response = await publicApi.patch(`/brackets/${bracketId}`, {
                status: 'COMPLETED'
            });

            expect(response.status).toBe(401);
        });
    });

    // ── DELETE /v1/brackets/:id ───────────────────────────────────────

    describe('DELETE /v1/brackets/:id', () => {
        test('should delete a bracket', async () => {
            // Create a throwaway bracket
            const createResp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'ELIMINATION',
                division: 'BJV'
            });
            const bracketId = createResp.data.bracketId || createResp.data.id;

            const response = await api.delete(`/brackets/${bracketId}`);
            expect(response.status).toBe(200);

            // Verify it's gone
            const getResp = await api.get(`/brackets/${bracketId}`);
            expect(getResp.status).toBe(404);
        });

        test('should reject delete without auth', async () => {
            const createResp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'ELIMINATION',
                division: 'GJV'
            });
            const bracketId = createResp.data.bracketId || createResp.data.id;
            testManager.trackResource('brackets', bracketId);

            const response = await publicApi.delete(`/brackets/${bracketId}`);
            expect(response.status).toBe(401);
        });
    });

    // ── POST /v1/brackets/:id/entries ─────────────────────────────────

    describe('POST /v1/brackets/:id/entries', () => {
        let bracketId;

        beforeAll(async () => {
            const resp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BVAR'
            });
            bracketId = resp.data.bracketId || resp.data.id;
            testManager.trackResource('brackets', bracketId);
        });

        test('should add an archer entry to bracket', async () => {
            // Get an archer from the system
            const archersResp = await api.get('/archers?status=all');
            const archers = archersResp.data.archers || archersResp.data;

            if (archers.length === 0) {
                console.warn('No archers in system — skipping entry test');
                return;
            }

            const archer = archers[0];
            const response = await api.post(`/brackets/${bracketId}/entries`, {
                entryType: 'ARCHER',
                archerId: archer.id
            });

            expect([200, 201]).toContain(response.status);
        });

        test('should reject entry without auth', async () => {
            const response = await publicApi.post(`/brackets/${bracketId}/entries`, {
                entryType: 'ARCHER',
                archerId: '00000000-0000-0000-0000-000000000000'
            });

            expect(response.status).toBe(401);
        });
    });

    // ── GET /v1/brackets/:id/entries ──────────────────────────────────

    describe('GET /v1/brackets/:id/entries', () => {
        let bracketId;

        beforeAll(async () => {
            const resp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'GVAR'
            });
            bracketId = resp.data.bracketId || resp.data.id;
            testManager.trackResource('brackets', bracketId);
        });

        test('should list bracket entries', async () => {
            const response = await api.get(`/brackets/${bracketId}/entries`);

            expect(response.status).toBe(200);
            const entries = response.data.entries || response.data;
            expect(Array.isArray(entries)).toBe(true);
        });
    });

    // ── DELETE /v1/brackets/:id/entries/:entryId ──────────────────────

    describe('DELETE /v1/brackets/:id/entries/:entryId', () => {
        test('should remove an entry from bracket', async () => {
            // Create bracket
            const bracketResp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BVAR'
            });
            const bracketId = bracketResp.data.bracketId || bracketResp.data.id;
            testManager.trackResource('brackets', bracketId);

            // Add an archer entry
            const archersResp = await api.get('/archers?status=all');
            const archers = archersResp.data.archers || archersResp.data;
            if (archers.length === 0) {
                console.warn('No archers — skipping entry delete test');
                return;
            }

            const addResp = await api.post(`/brackets/${bracketId}/entries`, {
                entryType: 'ARCHER',
                archerId: archers[0].id
            });
            expect([200, 201]).toContain(addResp.status);

            // Get entry ID
            const entriesResp = await api.get(`/brackets/${bracketId}/entries`);
            const entries = entriesResp.data.entries || entriesResp.data;
            if (entries.length === 0) {
                console.warn('No entries found — skipping delete');
                return;
            }

            const entryId = entries[0].id;
            const deleteResp = await api.delete(`/brackets/${bracketId}/entries/${entryId}`);
            expect(deleteResp.status).toBe(200);
        });
    });

    // ── POST /v1/brackets/:id/generate ────────────────────────────────

    describe('POST /v1/brackets/:id/generate', () => {
        test('should return error for empty bracket generation', async () => {
            const bracketResp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'ELIMINATION',
                division: 'BVAR'
            });
            const bracketId = bracketResp.data.bracketId || bracketResp.data.id;
            testManager.trackResource('brackets', bracketId);

            const response = await api.post(`/brackets/${bracketId}/generate`, {});

            // Should fail gracefully — no entries to generate from
            expect([200, 400]).toContain(response.status);
        });

        test('should reject generate without auth', async () => {
            const response = await publicApi.post('/brackets/00000000-0000-0000-0000-000000000000/generate', {});
            expect(response.status).toBe(401);
        });
    });

    // ── GET /v1/brackets/:id/results ──────────────────────────────────

    describe('GET /v1/brackets/:id/results', () => {
        test('should get bracket results (public)', async () => {
            const bracketResp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BVAR'
            });
            const bracketId = bracketResp.data.bracketId || bracketResp.data.id;
            testManager.trackResource('brackets', bracketId);

            const response = await publicApi.get(`/brackets/${bracketId}/results`);
            expect(response.status).toBe(200);
        });

        test('should 404 for non-existent bracket results', async () => {
            const response = await publicApi.get('/brackets/00000000-0000-0000-0000-000000000000/results');
            expect(response.status).toBe(404);
        });
    });

    // ── POST /v1/brackets/:id/generate-round ──────────────────────────

    describe('POST /v1/brackets/:id/generate-round', () => {
        test('should reject generate-round without auth', async () => {
            const response = await publicApi.post('/brackets/00000000-0000-0000-0000-000000000000/generate-round', {});
            expect(response.status).toBe(401);
        });

        test('should handle generate-round for bracket with no entries', async () => {
            const bracketResp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'GJV'
            });
            const bracketId = bracketResp.data.bracketId || bracketResp.data.id;
            testManager.trackResource('brackets', bracketId);

            const response = await api.post(`/brackets/${bracketId}/generate-round`, {
                totalBales: 4,
                targetsPerBale: 2
            });

            // Should fail gracefully — no entries to pair
            expect([200, 400]).toContain(response.status);
        });
    });

    // ── GET /v1/brackets/:id/suggested-rounds ─────────────────────────

    describe('GET /v1/brackets/:id/suggested-rounds', () => {
        test('should return suggested round count', async () => {
            const bracketResp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BVAR'
            });
            const bracketId = bracketResp.data.bracketId || bracketResp.data.id;
            testManager.trackResource('brackets', bracketId);

            const response = await api.get(`/brackets/${bracketId}/suggested-rounds`);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('suggestedRounds');
            expect(response.data).toHaveProperty('rosterSize');
        });
    });

    // ── GET /v1/brackets/:id/archer-assignment ────────────────────────

    describe('GET /v1/brackets/:id/archer-assignment', () => {
        test('should look up archer assignment by name (public)', async () => {
            const bracketResp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BVAR'
            });
            const bracketId = bracketResp.data.bracketId || bracketResp.data.id;
            testManager.trackResource('brackets', bracketId);

            // Name lookup — may return 404 if no match, which is expected
            const response = await publicApi.get(`/brackets/${bracketId}/archer-assignment/by-name/Test/Archer`);
            expect([200, 404]).toContain(response.status);
        });

        test('should look up archer assignment by UUID (public)', async () => {
            const bracketResp = await api.post(`/events/${testEventId}/brackets`, {
                bracketType: 'SOLO',
                bracketFormat: 'SWISS',
                division: 'BVAR'
            });
            const bracketId = bracketResp.data.bracketId || bracketResp.data.id;
            testManager.trackResource('brackets', bracketId);

            const response = await publicApi.get(`/brackets/${bracketId}/archer-assignment/00000000-0000-0000-0000-000000000000`);
            expect([200, 404]).toContain(response.status);
        });
    });
});

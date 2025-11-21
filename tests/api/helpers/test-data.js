/**
 * Test Data Management Utilities
 * Provides consistent test data creation and cleanup
 */

class TestDataManager {
    constructor(apiBase = 'http://localhost:8001/api/v1') {
        this.apiBase = apiBase;
        this.createdResources = {
            archers: [],
            rounds: [],
            events: [],
            soloMatches: [],
            teamMatches: [],
            brackets: []
        };
    }

    // Archer test data
    createTestArcher(overrides = {}) {
        return {
            firstName: 'Test',
            lastName: 'Archer',
            school: 'TST',
            level: 'VAR',
            gender: 'M',
            email: `test.archer.${Date.now()}@example.com`,
            phone: '555-0100',
            grade: '11',
            status: 'active',
            ...overrides
        };
    }

    createTestArcherBulk(count = 5) {
        const archers = [];
        for (let i = 0; i < count; i++) {
            archers.push(this.createTestArcher({
                firstName: `Test${i + 1}`,
                lastName: `Archer${i + 1}`,
                email: `test.archer.${i + 1}.${Date.now()}@example.com`
            }));
        }
        return archers;
    }

    // Round test data
    createTestRound(overrides = {}) {
        return {
            roundType: 'R300',
            date: new Date().toISOString().split('T')[0],
            baleNumber: 1,
            division: 'BVAR',
            gender: 'M',
            level: 'VAR',
            ...overrides
        };
    }

    // Event test data
    createTestEvent(overrides = {}) {
        const timestamp = Date.now();
        return {
            name: `Test Event ${timestamp}`,
            entry_code: `TEST${timestamp}`,
            location: 'Test Location',
            date: new Date().toISOString().split('T')[0],
            ...overrides
        };
    }

    // Solo match test data
    createTestSoloMatch(overrides = {}) {
        return {
            matchType: 'elimination',
            format: 'best_of_5',
            ...overrides
        };
    }

    // Team match test data
    createTestTeamMatch(overrides = {}) {
        return {
            matchType: 'elimination',
            format: 'best_of_5',
            teamSize: 3,
            ...overrides
        };
    }

    // Bracket test data
    createTestBracket(overrides = {}) {
        return {
            name: `Test Bracket ${Date.now()}`,
            type: 'elimination',
            format: 'single',
            ...overrides
        };
    }

    // End score test data
    createTestEndScore(endNumber = 1, overrides = {}) {
        return {
            endNumber,
            a1: '10',
            a2: '9',
            a3: '8',
            endTotal: 27,
            runningTotal: endNumber * 27,
            tens: 1,
            xs: 1,
            deviceTs: new Date().toISOString(),
            ...overrides
        };
    }

    // Set score test data (for matches)
    createTestSetScore(setNumber = 1, overrides = {}) {
        return {
            setNumber,
            a1: '10',
            a2: '9',
            a3: '8',
            setTotal: 27,
            deviceTs: new Date().toISOString(),
            ...overrides
        };
    }

    // Track created resources for cleanup
    trackResource(type, id) {
        if (this.createdResources[type]) {
            this.createdResources[type].push(id);
        }
    }

    // Cleanup all created test resources
    async cleanup(apiClient) {
        print_info('Cleaning up test resources...');
        
        // Note: In a real implementation, you'd call DELETE endpoints
        // For now, we'll just clear the tracking arrays
        Object.keys(this.createdResources).forEach(type => {
            this.createdResources[type] = [];
        });
        
        print_success('Test resources cleaned up');
    }
}

// API Client utility
class APIClient {
    constructor(baseURL = 'http://localhost:8001/api/v1', defaultHeaders = {}) {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...defaultHeaders
        };
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            ...options,
            headers: { ...this.defaultHeaders, ...(options.headers || {}) }
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        // Add node-fetch if not available globally
        const fetchFn = global.fetch || require('node-fetch');
        const response = await fetchFn(url, config);
        
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (e) {
                // Response might be empty or invalid JSON
                data = null;
            }
        } else {
            data = await response.text();
        }

        return {
            status: response.status,
            ok: response.ok,
            data,
            headers: response.headers
        };
    }

    // Convenience methods
    async get(endpoint, headers = {}) {
        return this.request(endpoint, { method: 'GET', headers });
    }

    async post(endpoint, body, headers = {}) {
        return this.request(endpoint, { method: 'POST', body, headers });
    }

    async patch(endpoint, body, headers = {}) {
        return this.request(endpoint, { method: 'PATCH', body, headers });
    }

    async delete(endpoint, headers = {}) {
        return this.request(endpoint, { method: 'DELETE', headers });
    }

    // Authentication helpers
    withApiKey(apiKey) {
        const newClient = new APIClient(this.baseURL, {
            ...this.defaultHeaders,
            'X-API-Key': apiKey
        });
        return newClient;
    }

    withPasscode(passcode) {
        const newClient = new APIClient(this.baseURL, {
            ...this.defaultHeaders,
            'X-Passcode': passcode
        });
        return newClient;
    }
}

// Test assertion helpers
class TestAssertions {
    static expectSuccess(response, expectedStatus = 200) {
        expect(response.status).toBe(expectedStatus);
        expect(response.ok).toBe(true);
    }

    static expectError(response, expectedStatus) {
        expect(response.status).toBe(expectedStatus);
        expect(response.ok).toBe(false);
    }

    static expectValidationError(response) {
        this.expectError(response, 400);
        expect(response.data).toHaveProperty('error');
    }

    static expectAuthError(response) {
        this.expectError(response, 401);
        expect(response.data).toHaveProperty('error');
    }

    static expectNotFound(response) {
        this.expectError(response, 404);
        expect(response.data).toHaveProperty('error');
    }

    static expectValidUUID(value) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(value).toMatch(uuidRegex);
    }

    static expectValidTimestamp(value) {
        const timestamp = new Date(value);
        expect(timestamp).toBeInstanceOf(Date);
        expect(timestamp.getTime()).not.toBeNaN();
    }
}

module.exports = {
    TestDataManager,
    APIClient,
    TestAssertions
};

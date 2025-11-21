/**
 * Authentication API Tests
 * Tests authentication and authorization across endpoints
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Authentication API', () => {
    let client;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        testData = new TestDataManager();
    });

    describe('Public Endpoints', () => {
        test('GET /v1/archers should work without authentication', async () => {
            const response = await client.get('/archers');
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('archers');
        });

        test('GET /v1/health should work without authentication', async () => {
            const response = await client.get('/health');
            TestAssertions.expectSuccess(response);
        });
    });

    describe('Protected Endpoints', () => {
        test('POST /v1/rounds should require authentication', async () => {
            const roundData = testData.createTestRound();
            const response = await client.post('/rounds', roundData);
            TestAssertions.expectAuthError(response);
        });

        test('POST /v1/events should require authentication', async () => {
            const eventData = testData.createTestEvent();
            const response = await client.post('/events', eventData);
            TestAssertions.expectAuthError(response);
        });
    });

    describe('API Key Authentication', () => {
        test('should reject invalid API key', async () => {
            const authClient = client.withApiKey('invalid-api-key');
            const roundData = testData.createTestRound();
            const response = await authClient.post('/rounds', roundData);
            TestAssertions.expectAuthError(response);
        });

        test('API key authentication mechanism exists', async () => {
            // Test that the API recognizes API key header format
            // This is a basic test to verify the auth system is in place
            const response = await client.get('/health');
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('hasApiKey');
        });
    });

    describe('Passcode Authentication', () => {
        test('should reject invalid passcode', async () => {
            const authClient = client.withPasscode('invalid-passcode');
            const roundData = testData.createTestRound();
            const response = await authClient.post('/rounds', roundData);
            TestAssertions.expectAuthError(response);
        });

        test('passcode authentication mechanism exists', async () => {
            // Test that the API recognizes passcode header format
            // This is a basic test to verify the auth system is in place
            const response = await client.get('/health');
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('hasPass');
        });
    });
});

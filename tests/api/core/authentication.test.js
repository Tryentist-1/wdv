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
        test('should accept valid API key', async () => {
            // Note: Use actual API key from config for real tests
            const authClient = client.withApiKey('qpeiti183djeiw930238sie75k3ha9laweithlwkeu');
            const roundData = testData.createTestRound();
            const response = await authClient.post('/rounds', roundData);
            
            // Should succeed or fail for business reasons, not auth
            expect(response.status).not.toBe(401);
        });

        test('should reject invalid API key', async () => {
            const authClient = client.withApiKey('invalid-api-key');
            const roundData = testData.createTestRound();
            const response = await authClient.post('/rounds', roundData);
            TestAssertions.expectAuthError(response);
        });
    });

    describe('Passcode Authentication', () => {
        test('should accept valid passcode', async () => {
            // Note: Use actual passcode from config for real tests
            const authClient = client.withPasscode('wdva26');
            const roundData = testData.createTestRound();
            const response = await authClient.post('/rounds', roundData);
            
            // Should succeed or fail for business reasons, not auth
            expect(response.status).not.toBe(401);
        });

        test('should reject invalid passcode', async () => {
            const authClient = client.withPasscode('invalid-passcode');
            const roundData = testData.createTestRound();
            const response = await authClient.post('/rounds', roundData);
            TestAssertions.expectAuthError(response);
        });
    });
});

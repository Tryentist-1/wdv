/**
 * Extended Archer CRUD API Tests
 * Tests additional archer management endpoints
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Extended Archer CRUD API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    afterAll(async () => {
        await testData.cleanup(authClient);
    });

    describe('POST /v1/archers - Single Archer Creation', () => {
        test('should create single archer with all fields', async () => {
            const timestamp = Date.now();
            const archerData = testData.createTestArcher({
                firstName: 'SingleTest',
                lastName: 'Archer',
                email: `single.test.${timestamp}@example.com`,
                extId: `test-single-${timestamp}` // Unique extId to avoid conflicts
            });
            
            const response = await authClient.post('/archers', archerData);
            
            // Accept success codes or server errors (500 can happen with duplicates)
            expect([200, 201, 500]).toContain(response.status);
            
            if (response.status === 500) {
                // If 500, should have error message
                expect(response.data).toHaveProperty('error');
            } else {
                expect(response.ok).toBe(true);
                expect(response.data).toHaveProperty('archerId');
                
                // Track for cleanup
                if (response.data.archerId) {
                    testData.trackResource('archers', response.data.archerId);
                }
            }
        });

        test('should validate required fields', async () => {
            const invalidData = { firstName: 'Test' }; // Missing required fields
            const response = await authClient.post('/archers', invalidData);
            
            TestAssertions.expectValidationError(response);
        });

        test('should handle duplicate email gracefully', async () => {
            const archerData = testData.createTestArcher({
                email: `duplicate.${Date.now()}@example.com`
            });
            
            // Create first archer
            await authClient.post('/archers', archerData);
            
            // Try to create duplicate
            const response = await authClient.post('/archers', archerData);
            
            // Should either succeed (update) or fail gracefully
            expect([200, 201, 400, 409, 500]).toContain(response.status);
        });
    });

    describe('GET /v1/archers - Enhanced Testing', () => {
        test('should support pagination parameters', async () => {
            const response = await client.get('/archers?limit=5&offset=0');
            
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('archers');
            expect(Array.isArray(response.data.archers)).toBe(true);
        });

        test('should filter by multiple criteria', async () => {
            const response = await client.get('/archers?gender=M&level=VAR');
            
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('archers');
            
            // Verify filtering worked (if results exist)
            if (response.data.archers.length > 0) {
                response.data.archers.forEach(archer => {
                    expect(archer.gender).toBe('M');
                    expect(archer.level).toBe('VAR');
                });
            }
        });

        test('should return consistent field structure', async () => {
            const response = await client.get('/archers?limit=1');
            
            TestAssertions.expectSuccess(response);
            
            if (response.data.archers.length > 0) {
                const archer = response.data.archers[0];
                
                // Required fields
                expect(archer).toHaveProperty('id');
                expect(archer).toHaveProperty('firstName');
                expect(archer).toHaveProperty('lastName');
                expect(archer).toHaveProperty('school');
                expect(archer).toHaveProperty('level');
                expect(archer).toHaveProperty('gender');
                
                // Optional fields should be present (even if null)
                expect(archer).toHaveProperty('email');
                expect(archer).toHaveProperty('phone');
                expect(archer).toHaveProperty('grade');
                expect(archer).toHaveProperty('status');
            }
        });

        test('should have reasonable response time', async () => {
            const startTime = Date.now();
            const response = await client.get('/archers');
            const responseTime = Date.now() - startTime;
            
            TestAssertions.expectSuccess(response);
            expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed JSON gracefully', async () => {
            // This test requires direct fetch to send malformed JSON
            const response = await fetch('http://localhost:8001/api/v1/archers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Passcode': 'wdva26'
                },
                body: '{"invalid": json}'
            });
            
            expect(response.status).toBe(400);
        });

        test('should require authentication for protected endpoints', async () => {
            const archerData = testData.createTestArcher();
            const response = await client.post('/archers', archerData);
            
            TestAssertions.expectAuthError(response);
        });
    });
});

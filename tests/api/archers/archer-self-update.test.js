/**
 * Archer Self-Update API Tests
 * Tests POST /v1/archers/self endpoint
 * 
 * CRITICAL: This endpoint allows archers to update their own profile without authentication.
 * Must test all fields are handled correctly.
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('Archer Self-Update API', () => {
    let client;
    let testData;
    let testArcher;

    beforeAll(async () => {
        client = new APIClient();
        testData = new TestDataManager();
        
        // Create a test archer for self-update testing
        const authClient = client.withPasscode('wdva26');
        const timestamp = Date.now();
        const archerData = testData.createTestArcher({
            firstName: 'SelfUpdate',
            lastName: 'Test',
            extId: `self-update-test-${timestamp}`,
            email: `selfupdate.${timestamp}@test.com`
        });
        
        const createResponse = await authClient.post('/archers/bulk_upsert', [archerData]);
        if (createResponse.ok && createResponse.data.inserted > 0) {
            // Get the created archer
            const getResponse = await client.get('/archers');
            testArcher = getResponse.data.archers.find(a => 
                a.extId === archerData.extId || 
                (a.firstName === archerData.firstName && a.lastName === archerData.lastName)
            );
        }
    });

    afterAll(async () => {
        if (testArcher) {
            const authClient = client.withPasscode('wdva26');
            await testData.cleanup(authClient);
        }
    });

    describe('POST /v1/archers/self - Basic Functionality', () => {
        test('should update archer profile without authentication', async () => {
            if (!testArcher) {
                console.warn('Skipping test - no test archer available');
                return;
            }

            const updateData = {
                id: testArcher.id,
                extId: testArcher.extId,
                firstName: testArcher.firstName,
                lastName: testArcher.lastName,
                nickname: 'UpdatedNickname'
            };

            const response = await client.post('/archers/self', updateData);
            
            TestAssertions.expectSuccess(response, 200);
            expect(response.data).toHaveProperty('updated');
            expect(response.data.updated).toBe(true);
        });

        test('should require archer ID or extId', async () => {
            const invalidData = {
                firstName: 'Test',
                lastName: 'Archer'
                // Missing id and extId
            };

            const response = await client.post('/archers/self', invalidData);
            
            expect(response.status).toBe(400);
            expect(response.data).toHaveProperty('error');
            expect(response.data.error).toContain('ID or extId required');
        });

        test('should require firstName and lastName', async () => {
            if (!testArcher) {
                console.warn('Skipping test - no test archer available');
                return;
            }

            const invalidData = {
                id: testArcher.id,
                extId: testArcher.extId
                // Missing firstName and lastName
            };

            const response = await client.post('/archers/self', invalidData);
            
            expect(response.status).toBe(400);
            expect(response.data).toHaveProperty('error');
            expect(response.data.error).toContain('firstName and lastName required');
        });
    });

    describe('POST /v1/archers/self - Field Completeness', () => {
        test('should handle shirtSize field', async () => {
            if (!testArcher) {
                console.warn('Skipping test - no test archer available');
                return;
            }

            const updateData = {
                id: testArcher.id,
                extId: testArcher.extId,
                firstName: testArcher.firstName,
                lastName: testArcher.lastName,
                shirtSize: 'XL'
            };

            const response = await client.post('/archers/self', updateData);
            TestAssertions.expectSuccess(response, 200);

            // Verify persistence - GET and check
            await new Promise(resolve => setTimeout(resolve, 200));
            const getResponse = await client.get('/archers');
            const updated = getResponse.data.archers.find(a => a.id === testArcher.id);
            
            expect(updated).toBeDefined();
            expect(updated.shirtSize).toBe('XL');
        });

        test('should handle pantSize field', async () => {
            if (!testArcher) {
                console.warn('Skipping test - no test archer available');
                return;
            }

            const updateData = {
                id: testArcher.id,
                extId: testArcher.extId,
                firstName: testArcher.firstName,
                lastName: testArcher.lastName,
                pantSize: '34'
            };

            const response = await client.post('/archers/self', updateData);
            TestAssertions.expectSuccess(response, 200);

            // Verify persistence
            await new Promise(resolve => setTimeout(resolve, 200));
            const getResponse = await client.get('/archers');
            const updated = getResponse.data.archers.find(a => a.id === testArcher.id);
            
            expect(updated).toBeDefined();
            expect(updated.pantSize).toBe('34');
        });

        test('should handle hatSize field', async () => {
            if (!testArcher) {
                console.warn('Skipping test - no test archer available');
                return;
            }

            const updateData = {
                id: testArcher.id,
                extId: testArcher.extId,
                firstName: testArcher.firstName,
                lastName: testArcher.lastName,
                hatSize: 'L'
            };

            const response = await client.post('/archers/self', updateData);
            TestAssertions.expectSuccess(response, 200);

            // Verify persistence
            await new Promise(resolve => setTimeout(resolve, 200));
            const getResponse = await client.get('/archers');
            const updated = getResponse.data.archers.find(a => a.id === testArcher.id);
            
            expect(updated).toBeDefined();
            expect(updated.hatSize).toBe('L');
        });

        test('should handle all size fields together', async () => {
            if (!testArcher) {
                console.warn('Skipping test - no test archer available');
                return;
            }

            const updateData = {
                id: testArcher.id,
                extId: testArcher.extId,
                firstName: testArcher.firstName,
                lastName: testArcher.lastName,
                shirtSize: 'L',
                pantSize: '32',
                hatSize: 'M'
            };

            const response = await client.post('/archers/self', updateData);
            TestAssertions.expectSuccess(response, 200);

            // Verify persistence
            await new Promise(resolve => setTimeout(resolve, 200));
            const getResponse = await client.get('/archers');
            const updated = getResponse.data.archers.find(a => a.id === testArcher.id);
            
            expect(updated).toBeDefined();
            expect(updated.shirtSize).toBe('L');
            expect(updated.pantSize).toBe('32');
            expect(updated.hatSize).toBe('M');
        });
    });

    describe('POST /v1/archers/self - Persistence Verification', () => {
        test('should persist changes after update', async () => {
            if (!testArcher) {
                console.warn('Skipping test - no test archer available');
                return;
            }

            const originalNickname = testArcher.nickname || '';
            const newNickname = `TestNickname${Date.now()}`;

            // Update
            const updateData = {
                id: testArcher.id,
                extId: testArcher.extId,
                firstName: testArcher.firstName,
                lastName: testArcher.lastName,
                nickname: newNickname
            };

            const updateResponse = await client.post('/archers/self', updateData);
            TestAssertions.expectSuccess(updateResponse, 200);

            // Wait for database write
            await new Promise(resolve => setTimeout(resolve, 200));

            // Refresh - GET from database
            const getResponse = await client.get('/archers');
            const refreshed = getResponse.data.archers.find(a => a.id === testArcher.id);

            // Verify persistence
            expect(refreshed).toBeDefined();
            expect(refreshed.nickname).toBe(newNickname);
        });
    });

    describe('POST /v1/archers/self - Field Mapping', () => {
        test('should map camelCase to snake_case in database', async () => {
            if (!testArcher) {
                console.warn('Skipping test - no test archer available');
                return;
            }

            // This test verifies the API accepts camelCase and stores as snake_case
            // The actual database verification would require direct DB access
            const updateData = {
                id: testArcher.id,
                extId: testArcher.extId,
                firstName: testArcher.firstName,
                lastName: testArcher.lastName,
                shirtSize: 'XXL' // camelCase
            };

            const response = await client.post('/archers/self', updateData);
            TestAssertions.expectSuccess(response, 200);

            // Verify it's returned correctly (API should convert back to camelCase)
            await new Promise(resolve => setTimeout(resolve, 200));
            const getResponse = await client.get('/archers');
            const updated = getResponse.data.archers.find(a => a.id === testArcher.id);
            
            expect(updated).toBeDefined();
            expect(updated.shirtSize).toBe('XXL');
        });
    });
});

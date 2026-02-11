# API Test Suite

Comprehensive testing for WDV Archery Score Management API endpoints.

## Overview

This test suite provides comprehensive coverage of all 63 API endpoints with:
- **Core functionality testing** (health, authentication)
- **CRUD operation testing** (create, read, update, delete)
- **Error scenario testing** (validation, authorization)
- **Integration testing** (full workflows)
- **Performance testing** (response times, load)

## Quick Start

### Prerequisites
```bash
# Start local development server (REQUIRED - API tests hit localhost)
npm run serve

# Optional: Set API base URL if different from default
# export API_BASE_URL=http://localhost:8001/api/index.php/v1

# Install test dependencies (if not already installed)
npm install --save-dev jest supertest node-fetch
```

### Run Tests
```bash
# Run all API tests
./scripts/test-api-suite.sh all

# Run specific test categories
./scripts/test-api-suite.sh core      # Health & authentication
./scripts/test-api-suite.sh archers   # Archer management
./scripts/test-api-suite.sh rounds    # Round management
./scripts/test-api-suite.sh events    # Event management

# Run with coverage report
./scripts/test-api-suite.sh coverage
```

## Test Structure

```
tests/api/
├── core/                    # Core functionality
│   ├── health.test.js      # Health check endpoint
│   ├── authentication.test.js # Auth & authorization
│   └── error-handling.test.js # Error scenarios
├── archers/                 # Archer management
│   ├── archer-crud.test.js # CRUD operations
│   ├── archer-search.test.js # Search functionality
│   └── archer-bulk-operations.test.js # Bulk operations
├── rounds/                  # Round management
├── events/                  # Event management
├── matches/                 # Solo/Team matches
├── integration/             # Integration tests
└── helpers/                 # Test utilities
    ├── test-data.js        # Test data management
    └── api-client.js       # API client utilities
```

## Test Categories

### 1. Core Tests (`tests/api/core/`)
- Health check endpoint
- Authentication methods (API key, passcode)
- Authorization validation
- Error handling

### 2. Archer Tests (`tests/api/archers/`)
- Archer CRUD operations
- Search functionality
- Bulk operations
- Data validation

### 3. Round Tests (`tests/api/rounds/`)
- Round creation and management
- Archer assignment
- Scoring workflows
- Verification processes

### 4. Event Tests (`tests/api/events/`)
- Event creation and management
- Event-round relationships
- Event snapshots
- QR code generation

### 5. Match Tests (`tests/api/matches/`)
- Solo match workflows
- Team match workflows
- Match verification
- Set scoring

### 6. Integration Tests (`tests/api/integration/`)
- Full workflow testing
- Cross-entity relationships
- Concurrent access testing
- Performance validation

## Test Utilities

### TestDataManager
Provides consistent test data creation:
```javascript
const testData = new TestDataManager();
const archer = testData.createTestArcher();
const round = testData.createTestRound();
```

### APIClient
Simplified API interaction:
```javascript
const client = new APIClient();
const authClient = client.withPasscode('wdva26');
const response = await authClient.post('/rounds', roundData);
```

### TestAssertions
Common test assertions:
```javascript
TestAssertions.expectSuccess(response);
TestAssertions.expectValidationError(response);
TestAssertions.expectValidUUID(id);
```

## Coverage Goals

### Current Status
- **Endpoint Coverage:** 15% (10/63 endpoints)
- **Scenario Coverage:** Basic happy path only
- **Error Coverage:** Limited

### Target Status
- **Endpoint Coverage:** 100% (63/63 endpoints)
- **Scenario Coverage:** 85% (happy path + error scenarios)
- **Error Coverage:** 80% (all major error cases)

## Running Individual Tests

```bash
# Run specific test file
npx jest tests/api/core/health.test.js

# Run tests matching pattern
npx jest --testNamePattern="authentication"

# Run with verbose output
npx jest tests/api/archers --verbose

# Run with coverage
npx jest tests/api --coverage
```

## Configuration

### Jest Configuration (`jest.config.js`)
- Test environment: Node.js
- Test timeout: 30 seconds
- Coverage reporting: HTML, LCOV, text
- Test pattern: `tests/api/**/*.test.js`

### Environment Variables
- `API_BASE_URL` - API base URL (default: http://localhost:8001/api/v1)
- `API_KEY` - API key for authenticated tests
- `PASSCODE` - Passcode for authenticated tests

## Best Practices

### Test Data
- Use TestDataManager for consistent data
- Clean up created resources after tests
- Use unique identifiers to avoid conflicts

### Assertions
- Use TestAssertions for common validations
- Test both success and error scenarios
- Validate response structure and data types

### Performance
- Set reasonable timeouts (30 seconds)
- Test response times for critical endpoints
- Monitor memory usage during bulk operations

## Troubleshooting

### Common Issues

**Server not running:**
```bash
npm run serve
```

**Tests timing out:**
- Check server is responding
- Increase timeout in jest.config.js
- Check for infinite loops in test code

**Authentication failures:**
- Verify API key and passcode in test configuration
- Check server authentication configuration

**Database conflicts:**
- Ensure test data cleanup is working
- Use unique identifiers for test data
- Consider using test database

## Contributing

### Adding New Tests
1. Create test file in appropriate category directory
2. Use TestDataManager for test data
3. Use APIClient for API calls
4. Use TestAssertions for validations
5. Add cleanup in afterAll hooks

### Test Naming
- Use descriptive test names
- Group related tests in describe blocks
- Use consistent naming patterns

### Documentation
- Document complex test scenarios
- Update coverage goals when adding tests
- Keep README updated with new test categories

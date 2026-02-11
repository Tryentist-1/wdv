# API Test Suite

Comprehensive testing for WDV Archery Score Management API endpoints.

**Canonical reference:** [docs/testing/TESTING_GUIDE.md](../../docs/testing/TESTING_GUIDE.md)

## Quick Start

### Prerequisites
```bash
# Start local development server (REQUIRED - API tests hit localhost)
npm run serve

# Optional: Set API base URL if different from default
# export API_BASE_URL=http://localhost:8001/api/index.php/v1
```

### Run Tests
```bash
# Run all API tests
./tests/scripts/test-api-suite.sh all

# Run specific test categories
./tests/scripts/test-api-suite.sh core      # Health & authentication
./tests/scripts/test-api-suite.sh archers   # Archer management
./tests/scripts/test-api-suite.sh rounds    # Round management
./tests/scripts/test-api-suite.sh events    # Event management
./tests/scripts/test-api-suite.sh matches   # Solo/Team matches
./tests/scripts/test-api-suite.sh scoring   # Match scoring
./tests/scripts/test-api-suite.sh verification # Verification workflows
./tests/scripts/test-api-suite.sh integration # Integration tests

# Or use npm scripts
npm run test:api:core
npm run test:api:archers
npm run test:api:all
```

## Test Structure

```
tests/api/
├── core/                    # Health, authentication
│   ├── health.test.js
│   └── authentication.test.js
├── archers/                  # Archer CRUD, search, bulk, self-update
│   ├── archer-crud.test.js
│   ├── archer-crud-extended.test.js
│   ├── archer-search.test.js
│   ├── archer-bulk-operations.test.js
│   └── archer-self-update.test.js
├── rounds/                   # Round CRUD
│   ├── round-crud.test.js
│   └── round-archers.test.js
├── events/                   # Event CRUD, verification
│   ├── event-crud.test.js
│   └── event-verification.test.js
├── matches/                  # Solo/Team matches
│   ├── solo-matches.test.js
│   ├── team-matches.test.js
│   └── match-integration.test.js
├── scoring/                  # Match scoring
│   ├── match-scoring.test.js
│   ├── scoring-validation.test.js
│   ├── scoring-workflows.test.js
│   └── scoring-performance.test.js
├── verification/             # Verification workflows
│   ├── solo-match-verification-smoke.test.js
│   ├── verification-workflows.test.js
│   └── verification-security.test.js
├── integration/              # Workflow tests
│   ├── event-round-integration.test.js
│   └── workflow-validation.test.js
├── helpers/
│   └── test-data.js         # APIClient, TestAssertions, TestDataManager
├── harness/
│   └── test_harness.html    # Browser-based API testing (local)
└── setup.js                 # Jest setup
```

## Environment Variables

- `API_BASE_URL` - API base URL (default: `http://localhost:8001/api/index.php/v1`)

## Troubleshooting

**"fetch failed" / ECONNREFUSED:** Server not running. Run `npm run serve` in another terminal.

**401 on endpoints:** Tests that create rounds/events need auth. Use `withPasscode()` or `withApiKey()` on APIClient.

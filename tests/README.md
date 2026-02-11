# WDV Testing Suite

**Canonical reference:** [docs/testing/TESTING_GUIDE.md](../docs/testing/TESTING_GUIDE.md) — single source of truth. Update when tests change.

## Quick Start

### Pre-Deploy (MANDATORY)
```bash
npm run test:pre-deploy
```

### Essential Commands
```bash
# Start development server
npm run serve

# Component library (visual testing)
open http://localhost:8001/tests/components/style-guide.html

# Run all E2E tests
npm test

# Interactive test UI
npm run test:ui

# Test workflow (comprehensive)
./tests/scripts/test-workflow.sh development
```

### Testing Workflows
```bash
npm run test:workflow:dev    # Development
npm run test:workflow:pre    # Pre-deployment
npm run test:workflow:post   # Post-deployment
```

### Specialized Test Commands
```bash
# E2E Tests
npm test                     # Production E2E tests
npm run test:local           # Local development E2E tests
npm run test:ui              # Interactive test interface
npm run test:headed           # Visible browser testing

# Component Tests
open http://localhost:8001/tests/components/style-guide.html

# API Tests (start server first: npm run serve)
./tests/scripts/test_api.sh            # Production API health check
./tests/scripts/test_phase1_local.sh   # Local API smoke test
npm run test:api:archers               # Jest API tests (requires server)

# Manual Tests
cat tests/manual_sanity_check.md
```

## Test Structure

### E2E Tests (Playwright)
**Location:** `tests/*.spec.js`  
**Coverage:** Critical user journeys, cross-browser, mobile-first

**Files:** `ranking_round.spec.js`, `ranking_round_setup_sections.spec.js`, `verification.spec.js`, `resume_round_flow.spec.js`, `ranking_round_archer_selector.spec.js`, `ranking_round_live_sync.spec.js`, `resume_round_standalone_flow.spec.js`, `smart_reconnect.spec.js`, `archer_results_pivot.spec.js`, `diagnostic-ranking-round.spec.js`, `ranking_round.local.spec.js` (LOCAL)

### Component Tests
**Location:** `tests/components/style-guide.html`  
**Purpose:** Visual component library and manual testing

### API Tests (Jest)
**Location:** `tests/api/**/*.test.js`  
**Requires:** `npm run serve` — server must be running  
**API base:** `API_BASE_URL` env (default: `http://localhost:8001/api/index.php/v1`)

### Unit Tests (QUnit)
**Location:** `tests/index.html`, `tests/test.js`  
**Purpose:** JavaScript function testing

## Quick Test Run
```bash
npm run test:setup-sections   # Setup sections only
npm run test:ranking-round    # Main ranking round
```

## References

- **[docs/testing/TESTING_GUIDE.md](../docs/testing/TESTING_GUIDE.md)** — Canonical testing reference (MANDATORY)
- **[TEST_ORGANIZATION.md](TEST_ORGANIZATION.md)** — Test structure
- **[.agent/workflows/test-lifecycle.md](../.agent/workflows/test-lifecycle.md)** — Creating, running, troubleshooting
- **[manual_sanity_check.md](manual_sanity_check.md)** — Pre-deployment checklist

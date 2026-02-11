# Test Organization & Structure

**Purpose:** Organize and structure all testing approaches for WDV Archery Score Management

**Canonical reference:** [docs/testing/TESTING_GUIDE.md](../docs/testing/TESTING_GUIDE.md) — single source of truth. Update this file when structure changes.

---

## 📁 Test Directory Structure

```
tests/
├── TEST_ORGANIZATION.md          # This file - test structure overview
├── README.md                     # Quick test commands and status
├── manual_sanity_check.md        # Pre-deployment checklist
│
├── *.spec.js                     # Playwright E2E Tests (root)
│   ├── ranking_round.spec.js     # Production ranking round tests
│   ├── ranking_round.local.spec.js # Local development tests (@LOCAL)
│   ├── ranking_round_setup_sections.spec.js # Setup UI components
│   ├── ranking_round_archer_selector.spec.js # Archer selector
│   ├── ranking_round_live_sync.spec.js # Live sync E2E
│   ├── resume_round_flow.spec.js # Resume from index
│   ├── resume_round_standalone_flow.spec.js # Standalone round resume
│   ├── verification.spec.js      # Verification, locking
│   ├── smart_reconnect.spec.js   # Reconnect flow
│   ├── archer_results_pivot.spec.js # Results pivot
│   └── diagnostic-ranking-round.spec.js # Diagnostics
│
├── api/                          # Jest API Tests (require: npm run serve)
│   ├── core/                     # Health, auth
│   ├── archers/                  # Archer CRUD, search, bulk, self-update
│   ├── rounds/                   # Round CRUD
│   ├── events/                   # Event CRUD
│   ├── matches/                  # Solo/Team matches
│   ├── scoring/                  # Match scoring, validation, workflows
│   ├── integration/              # Workflow tests
│   ├── verification/             # Verification workflows
│   ├── helpers/test-data.js      # APIClient, TestAssertions, TestDataManager
│   └── harness/test_harness.html # Browser-based API testing (local)
│
├── components/                   # Component Testing
│   └── style-guide.html          # Visual component library
│
├── helpers/                      # Test Utilities
│   └── ranking_round_utils.js    # Ranking round test helpers
│
├── scripts/                      # Test Scripts (run from project root)
│   ├── test_api.sh               # Production API health
│   ├── test_phase1_local.sh      # Local API smoke test
│   ├── test-api-suite.sh         # Jest API runner
│   ├── test-workflow.sh          # Dev/pre/post deploy workflow
│   └── test-summary.sh           # Test summary report
│
└── (playwright-report/, test-results/ - gitignored)
```

---

## 🎯 Test Categories & Responsibilities

### 1. **E2E Tests** (`tests/*.spec.js`)
**Framework:** Playwright  
**Purpose:** End-to-end user journey validation  
**Scope:** Full application workflows

**Files:**
- `ranking_round.spec.js` - Production tests
- `ranking_round.local.spec.js` - Local development tests
- `ranking_round_setup_sections.spec.js` - UI component integration
- `verification.spec.js` - Data validation and integrity
- `diagnostic-ranking-round.spec.js` - System diagnostics

**Coverage:**
- ✅ Event modal functionality
- ✅ Manual vs pre-assigned setup
- ✅ Archer selection and assignment
- ✅ Scoring workflow
- ✅ Live sync and offline queue
- ✅ Mobile responsiveness
- ✅ Cross-browser compatibility

### 2. **API Tests** (`tests/api/`)
**Framework:** Jest + supertest  
**Purpose:** Backend API validation  
**Scope:** REST endpoints and data integrity

**Requires:** Server running (`npm run serve`). Uses `API_BASE_URL` env (default: `http://localhost:8001/api/index.php/v1`).

**Files:**
- `tests/api/harness/test_harness.html` - Interactive browser-based API testing (local only)
- `tests/api/core/`, `archers/`, `rounds/`, `events/`, `matches/`, `scoring/`, `integration/`, `verification/` - Jest test files

**Coverage:**
- Authentication endpoints
- CRUD operations
- Data validation
- Error handling

### 3. **Component Tests** (`tests/components/`)
**Framework:** Manual + Visual  
**Purpose:** UI component validation  
**Scope:** Visual consistency and mobile usability

**Files:**
- `tests/components/style-guide.html` - Complete component showcase

**Coverage:**
- All UI components
- Dark/light mode
- Responsive design
- Touch interactions
- Accessibility

---

## 🚀 Test Execution Workflow

### Development Workflow
```bash
# 1. Start development environment
npm run serve

# 2. Component library check
open http://localhost:8001/tests/components/style-guide.html

# 3. Local E2E tests
npm run test:local

# 4. API tests (server must be running)
./tests/scripts/test_phase1_local.sh
npm run test:api:archers
```

### Pre-Deployment Workflow
```bash
# 1. Pre-deploy suite (MANDATORY)
npm run test:pre-deploy

# 2. API tests (with server, when changing backend)
npm run serve  # In another terminal
npm run test:api:archers

# 3. Test harness (manual, local)
open http://localhost:8001/tests/api/harness/test_harness.html

# 4. Manual sanity check
cat tests/manual_sanity_check.md
```

### Post-Deployment Workflow
```bash
# 1. Production E2E tests
npm run test:remote

# 2. Production API check
./tests/scripts/test_api.sh

# 3. Production test harness
open https://archery.tryentist.com/api/test_harness.html
```

---

## 📱 Mobile-First Testing Strategy

### Device Priority Matrix
| Device | Priority | Purpose | Framework |
|--------|----------|---------|-----------|
| iPhone 13 | 1 (Primary) | Mobile Safari testing | Playwright |
| Galaxy S21 | 2 (Secondary) | Android Chrome testing | Playwright |
| iPhone 13 Pro | 3 (Tertiary) | iOS Pro features | Playwright |
| Desktop Chrome | 4 (Development) | Development testing | Playwright |
| Desktop Safari | 5 (Cross-browser) | Safari compatibility | Playwright |

### Mobile Test Focus Areas
1. **Touch Interactions**
   - Minimum 44px touch targets
   - Touch-friendly button spacing
   - Swipe and gesture support

2. **Responsive Design**
   - Viewport adaptation (375px to 1200px)
   - Safe area insets (iOS notch)
   - Orientation changes

3. **Performance**
   - Load times on mobile networks
   - Touch response times
   - Memory usage optimization

4. **Offline Functionality**
   - Offline queue management
   - Data synchronization
   - Network recovery

---

## 🎨 Component Library Integration

### Component Testing Approach
The `style-guide.html` file serves multiple purposes:

1. **Visual Reference** - Complete UI component showcase
2. **Manual Testing** - Interactive component validation
3. **Design System** - Consistent styling reference
4. **Mobile Testing** - Touch-friendly component verification

### Component Categories
- **Buttons** - All states, sizes, and colors
- **Tables** - Scoring tables and data display
- **Forms** - Input fields and validation
- **Badges** - Status indicators and labels
- **Headers** - Page and section headers
- **Modals** - Dialog and overlay components
- **Keypad** - Score input interface (4x3 layout)
- **Archer Selection** - Archer picker components

### Testing Integration
```bash
# Component library as part of test workflow
npm run serve
open http://localhost:8001/tests/components/style-guide.html

# Verify components before E2E tests
npm test

# Production component verification (if deployed)
open https://archery.tryentist.com/tests/components/style-guide.html
```

---

## 📊 Test Metrics & Reporting

### Success Metrics
- **E2E Test Pass Rate:** Target 100% (currently 42/42)
- **Test Execution Time:** < 30 seconds for full suite
- **Mobile Coverage:** All primary devices tested
- **Component Coverage:** All UI components verified
- **API Coverage:** All endpoints validated

### Reporting Structure
```
reports/
├── playwright-report/           # Playwright HTML reports
│   ├── index.html              # Main report dashboard
│   ├── data/                   # Test execution data
│   └── trace-*.zip             # Execution traces
│
├── test-results/               # Failed test artifacts
│   ├── screenshots/            # Failure screenshots
│   ├── videos/                 # Test execution videos
│   └── traces/                 # Detailed execution traces
│
└── coverage/                   # Code coverage reports
    ├── index.html              # Coverage dashboard
    └── lcov.info               # Coverage data
```

### Report Access
```bash
# View latest test report
npx playwright show-report

# Generate test summary
./tests/scripts/test-summary.sh

# View component library
open http://localhost:8001/tests/components/style-guide.html
```

---

## 🔧 Configuration Management

### Playwright Configurations
- **Production:** `playwright.config.js`
  - Base URL: `https://archery.tryentist.com`
  - Full browser matrix
  - Production-ready settings

- **Local:** `playwright.config.local.js`
  - Base URL: `http://localhost:8001`
  - Development-friendly settings
  - Faster execution

### Environment-Specific Testing
```bash
# Production testing
npm test                    # Uses playwright.config.js

# Local development testing
npm run test:local         # Uses playwright.config.local.js

# Interactive testing
npm run test:ui            # Visual test interface

# Headed testing (visible browser)
npm run test:headed        # See tests execute
```

---

## 🚨 Critical Test Scenarios

### 1. **Scoring Workflow** (Highest Priority)
- Archer selection and assignment
- Score input validation
- End synchronization
- Running total calculations
- Offline queue handling

### 2. **Authentication & Security**
- Event code validation
- Coach passcode authentication
- API key authorization
- Session persistence

### 3. **Mobile Experience**
- Touch interactions
- Responsive layouts
- Performance optimization
- Offline functionality

### 4. **Data Integrity**
- Score accuracy
- Database synchronization
- Backup and restore
- Data validation

---

## 📈 Test Evolution Plan

### Phase 1: Organization (Current)
- ✅ Restructure test directories
- ✅ Create comprehensive documentation
- ✅ Integrate component library
- ✅ Establish clear workflows

### Phase 2: Enhancement
- 🔄 Add visual regression testing
- 🔄 Implement performance testing
- 🔄 Expand API test coverage
- 🔄 Add accessibility testing

### Phase 3: Automation
- 📅 CI/CD integration
- 📅 Automated deployment testing
- 📅 Performance monitoring
- 📅 Test result analytics

---

## 🎯 Quick Reference

### Essential Commands
```bash
# Pre-deploy (MANDATORY)
npm run test:pre-deploy

# Start development
npm run serve

# Component library
open http://localhost:8001/tests/components/style-guide.html

# Run all tests
npm test

# Interactive testing
npm run test:ui

# Test summary
./tests/scripts/test-summary.sh
```

### Key Files
- **[docs/testing/TESTING_GUIDE.md](../docs/testing/TESTING_GUIDE.md)** - Canonical testing reference (MANDATORY)
- **[.agent/workflows/test-lifecycle.md](../.agent/workflows/test-lifecycle.md)** - Creating, running, troubleshooting
- `tests/manual_sanity_check.md` - Pre-deployment checklist
- `tests/README.md` - Test suite documentation

---

**Last Updated:** February 2026  
**Status:** Test Organization Complete  
**Next:** Documentation integration and workflow refinement

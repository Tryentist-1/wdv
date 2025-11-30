# Test Organization & Structure

**Purpose:** Organize and structure all testing approaches for WDV Archery Score Management

---

## 📁 Test Directory Structure

```
tests/
├── TEST_ORGANIZATION.md          # This file - test structure overview
├── README.md                     # Quick test commands and status
├── manual_sanity_check.md        # Pre-deployment checklist
│
├── e2e/                          # Playwright E2E Tests
│   ├── ranking_round.spec.js     # Production ranking round tests
│   ├── ranking_round.local.spec.js # Local development tests
│   ├── ranking_round_setup_sections.spec.js # UI component tests
│   ├── verification.spec.js      # Data validation tests
│   └── diagnostic-ranking-round.spec.js # Diagnostic tests
│
├── unit/                         # QUnit Unit Tests
│   ├── index.html               # QUnit test runner
│   ├── test.js                  # Main unit test file
│   ├── test_suites.js           # Test suite organization
│   ├── qunit-2.20.0.js          # QUnit framework
│   └── qunit-2.20.0.css         # QUnit styling
│
├── api/                          # API Testing
│   ├── test_harness.html        # Interactive API testing UI
│   ├── test_harness.php         # CLI API testing
│   └── endpoints/               # Individual endpoint tests
│
├── components/                   # Component Testing
│   ├── style-guide.html     # Visual component library
│   ├── component-tests.md       # Component testing checklist
│   └── mobile-testing.md        # Mobile-specific component tests
│
├── helpers/                      # Test Utilities
│   ├── ranking_round_utils.js   # Ranking round test helpers
│   ├── test-data-creation.js    # Test data generation
│   └── mobile-test-utils.js     # Mobile testing utilities
│
└── reports/                      # Test Reports & Results
    ├── playwright-report/        # Playwright HTML reports
    ├── test-results/            # Failed test artifacts
    └── coverage/                # Code coverage reports
```

---

## 🎯 Test Categories & Responsibilities

### 1. **E2E Tests** (`tests/e2e/`)
**Framework:** Playwright  
**Purpose:** End-to-end user journey validation  
**Scope:** Full application workflows

**Files:**
- `ranking_round.spec.js` - Production tests (42 tests)
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

### 2. **Unit Tests** (`tests/unit/`)
**Framework:** QUnit  
**Purpose:** JavaScript function and logic testing  
**Scope:** Individual functions and utilities

**Files:**
- `index.html` - QUnit test runner interface
- `test.js` - Main unit test implementations
- `test_suites.js` - Test suite organization

**Coverage:**
- JavaScript utility functions
- Score calculations
- Data processing logic
- Component state management

### 3. **API Tests** (`tests/api/`)
**Framework:** Custom scripts + curl  
**Purpose:** Backend API validation  
**Scope:** REST endpoints and data integrity

**Files:**
- `test_harness.html` - Interactive browser-based API testing
- `test_harness.php` - CLI-based API testing
- Individual endpoint test files

**Coverage:**
- Authentication endpoints
- CRUD operations
- Data validation
- Error handling
- Performance testing

### 4. **Component Tests** (`tests/components/`)
**Framework:** Manual + Visual  
**Purpose:** UI component validation  
**Scope:** Visual consistency and mobile usability

**Files:**
- `style-guide.html` - Complete component showcase
- `component-tests.md` - Component testing checklist
- `mobile-testing.md` - Mobile-specific testing guide

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

# 3. Unit tests (fast feedback)
open http://localhost:8001/tests/unit/index.html

# 4. Local E2E tests
npm run test:local

# 5. API tests
./test_phase1_local.sh
```

### Pre-Deployment Workflow
```bash
# 1. Full E2E test suite
npm test

# 2. API production health check
./test_api.sh

# 3. Manual sanity check
cat tests/manual_sanity_check.md

# 4. Component library verification
open http://localhost:8001/tests/components/style-guide.html
```

### Post-Deployment Workflow
```bash
# 1. Production E2E tests
npm run test:remote

# 2. Production API check
./test_api.sh

# 3. Production component library
open https://tryentist.com/wdv/style-guide.html

# 4. Test report generation
./scripts/test-summary.sh
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

# Production component verification
open https://tryentist.com/wdv/style-guide.html
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
./scripts/test-summary.sh

# View component library
open http://localhost:8001/tests/components/style-guide.html
```

---

## 🔧 Configuration Management

### Playwright Configurations
- **Production:** `playwright.config.js`
  - Base URL: `https://tryentist.com/wdv`
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
# Start development
npm run serve

# Component library
open http://localhost:8001/tests/components/style-guide.html

# Run all tests
npm test

# Interactive testing
npm run test:ui

# Test summary
./scripts/test-summary.sh
```

### Key Files
- `TESTING_STRATEGY.md` - Complete testing overview
- `tests/manual_sanity_check.md` - Pre-deployment checklist
- `style-guide.html` - Component library
- `tests/README.md` - Test suite documentation

---

**Last Updated:** November 21, 2025  
**Status:** Test Organization Complete  
**Next:** Documentation integration and workflow refinement

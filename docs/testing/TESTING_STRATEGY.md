# Testing Strategy & Organization

**Branch:** `testing-cleanup`  
**Goal:** Structured, comprehensive testing approach for WDV Archery Score Management

---

## 🎯 Testing Philosophy

### Mobile-First Testing
- **Primary Focus:** 99% phone usage [[memory:10705663]]
- **Device Priority:** iPhone 13, Galaxy S21, then desktop
- **Touch Targets:** Minimum 44px (iOS/Android guidelines)
- **Responsive Design:** Test all breakpoints

### Test Pyramid Structure
```
    E2E Tests (Playwright)
   ├─ Critical User Journeys
   ├─ Cross-browser/device
   └─ Production & Local

  Integration Tests (API + UI)
 ├─ Component Integration
 ├─ API Endpoint Testing
 └─ Database Operations

Unit Tests (QUnit)
├─ JavaScript Functions
├─ Utility Methods
└─ Component Logic
```

---

## 📋 Test Categories

### 1. **E2E Tests (Playwright)** - Primary Testing
**Location:** `/tests/*.spec.js`  
**Purpose:** End-to-end user journeys  
**Coverage:** Critical workflows, cross-browser, mobile-first

**Current Status:** ✅ 42/42 tests passing
- `ranking_round.spec.js` - Production tests
- `ranking_round.local.spec.js` - Local development
- `ranking_round_setup_sections.spec.js` - UI components
- `verification.spec.js` - Data validation

### 2. **Component Tests** - UI Library
**Location:** `style-guide.html`  
**Purpose:** Visual component library and manual testing  
**Coverage:** All UI components, dark mode, responsive design

**Features:**
- ✅ Complete UI component showcase
- ✅ Dark/light mode toggle
- ✅ Mobile-responsive design
- ✅ All button states and colors
- ✅ Score input colors (archery rings)
- ✅ Keypad layouts (4x3 improved design)
- ✅ Archer selection components

### 3. **API Tests** - Backend Validation
**Location:** `api/test_harness.html`, `test_*.sh`  
**Purpose:** API endpoint testing and data validation  
**Coverage:** Authentication, CRUD operations, data integrity

**Scripts:**
- `test_api.sh` - Production API health checks
- `test_phase1_local.sh` - Local API testing
- `api/test_harness.html` - Interactive API testing

### 4. **Unit Tests (QUnit)** - JavaScript Logic
**Location:** `/tests/test.js`, `/tests/index.html`  
**Purpose:** JavaScript function testing  
**Coverage:** Utility functions, calculations, data processing

### 5. **Manual Tests** - Human Validation
**Location:** `/tests/manual_sanity_check.md`  
**Purpose:** Human-verified workflows  
**Coverage:** Complex user interactions, edge cases

---

## 🚀 Testing Workflow

### Pre-Development
```bash
# 1. Start local environment
npm run serve

# 2. Run component library check
open http://localhost:8001/style-guide.html

# 3. Run local tests
npm run test:local
```

### During Development
```bash
# 1. Unit tests (fast feedback)
npm run test:unit

# 2. Component testing (visual verification)
open http://localhost:8001/style-guide.html

# 3. API testing (backend validation)
./test_phase1_local.sh
```

### Pre-Deployment
```bash
# 1. Full test suite
npm test

# 2. API health check
./test_api.sh

# 3. Manual sanity check
cat tests/manual_sanity_check.md
```

### Post-Deployment
```bash
# 1. Production E2E tests
npm run test:remote

# 2. API production check
./test_api.sh

# 3. Component library verification
open https://tryentist.com/wdv/style-guide.html
```

---

## 📊 Test Commands Reference

### Primary Commands
```bash
# Run all E2E tests (excludes local)
npm test

# Run all tests including local
npm run test:all

# Interactive test UI
npm run test:ui

# Visual browser testing
npm run test:headed
```

### Specialized Commands
```bash
# Component-specific tests
npm run test:setup-sections
npm run test:ranking-round

# Local development tests
npm run test:local
npm run test:local:ui

# API testing
./test_api.sh
./test_phase1_local.sh

# Test summary
./test-summary.sh
```

### Development Server
```bash
# Start local PHP server
npm run serve

# Build CSS (required for styling)
npm run build:css
```

---

## 🎨 Component Library Integration

### Purpose
`style-guide.html` serves as:
1. **UI Reference** - Complete component showcase
2. **Manual Testing** - Visual verification of components
3. **Design System** - Consistent styling reference
4. **Mobile Testing** - Touch-friendly component validation

### Usage in Testing
1. **Before Development** - Reference for consistent UI
2. **During Development** - Visual component verification
3. **Before Deployment** - Final UI consistency check
4. **Documentation** - Living style guide

### Mobile Testing Focus
- Touch targets (44px minimum)
- Safe area insets (iOS notch)
- Responsive breakpoints
- Dark mode support
- Score colors (archery ring colors)

---

## 📱 Mobile-First Test Strategy

### Device Priority
1. **iPhone 13** (Primary) - Safari mobile
2. **Galaxy S21** (Secondary) - Chrome mobile
3. **Desktop Chrome** (Tertiary) - Development
4. **Desktop Safari** (Quaternary) - Cross-browser

### Mobile Test Focus
- Touch interactions
- Viewport responsiveness
- Safe area handling
- Performance on mobile
- Offline functionality

---

## 🔧 Test Configuration

### Playwright Configuration
- **Production:** `playwright.config.js` → `https://tryentist.com/wdv`
- **Local:** `playwright.config.local.js` → `http://localhost:8001`
- **Parallel:** Full parallelization enabled
- **Retries:** 2 retries on CI, 0 locally
- **Screenshots:** On failure only
- **Trace:** On first retry

### Browser Matrix
- Chromium (Desktop Chrome)
- WebKit (Desktop Safari)
- iPhone 13 (Mobile Safari)
- iPhone 13 Pro (Mobile Safari)
- Pixel 5 (Mobile Chrome)
- Galaxy S21 (Mobile Chrome)

---

## 📚 Documentation Structure

### Root Level (Quick Access)
- `TESTING_STRATEGY.md` (this file) - Complete testing overview
- `tests/manual_sanity_check.md` - Pre-deployment checklist

### Tests Directory
- `tests/README.md` - Test suite documentation
- `tests/*.spec.js` - Playwright test files
- `tests/helpers/` - Test utilities and data

### Docs Directory
- `docs/AUTOMATED_TESTING.md` - Detailed Playwright documentation
- `docs/MANUAL_TESTING_CHECKLIST.md` - Comprehensive manual tests
- `docs/PHASE_0_TESTING_PLAN.md` - Testing strategy evolution

---

## 🎯 Success Metrics

### Test Coverage Goals
- **E2E Coverage:** All critical user journeys
- **Component Coverage:** All UI components tested
- **API Coverage:** All endpoints validated
- **Mobile Coverage:** Primary mobile devices tested
- **Browser Coverage:** Safari + Chrome (mobile + desktop)

### Performance Targets
- **Test Execution:** < 30 seconds for full suite
- **Component Library:** < 2 seconds load time
- **API Tests:** < 5 seconds per endpoint
- **Mobile Tests:** < 10 seconds per device

### Quality Gates
- **Pre-commit:** Unit tests pass
- **Pre-deployment:** All E2E tests pass
- **Post-deployment:** Production health checks pass
- **Component Library:** Visual consistency verified

---

## 🚨 Critical Test Areas

### 1. Scoring Workflow
- Archer selection and assignment
- Score input and validation
- End synchronization
- Offline queue handling

### 2. Authentication & Security
- Event code validation
- Coach passcode authentication
- API key authorization
- Session management

### 3. Mobile Experience
- Touch interactions
- Responsive layouts
- Performance on mobile devices
- Offline functionality

### 4. Data Integrity
- Score calculations
- Database synchronization
- Backup and restore
- Data validation

---

## 📈 Testing Evolution

### Current State (v1.5.1)
- ✅ Playwright E2E tests (42/42 passing)
- ✅ Component library complete
- ✅ API testing scripts
- ✅ Manual testing checklist
- ⚠️ Fragmented documentation
- ⚠️ Inconsistent test organization

### Target State (Testing Cleanup)
- ✅ Unified testing strategy
- ✅ Structured documentation
- ✅ Integrated component testing
- ✅ Clear testing workflow
- ✅ Mobile-first approach
- ✅ Comprehensive coverage

---

**Last Updated:** November 21, 2025  
**Status:** Testing Cleanup in Progress  
**Branch:** `testing-cleanup`

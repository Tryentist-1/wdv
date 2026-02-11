# WDV Testing Suite - Comprehensive Testing Strategy

## Overview
The WDV testing suite provides comprehensive testing coverage for the Archery Score Management application, including E2E tests, component testing, API validation, and manual testing procedures. All tests are optimized for mobile-first usage and cross-browser compatibility.

## 🚀 Quick Start Testing

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
./scripts/test-workflow.sh development
```

### Testing Workflows
```bash
# Development workflow
npm run test:workflow:dev

# Pre-deployment workflow  
npm run test:workflow:pre

# Post-deployment workflow
npm run test:workflow:post
```

### Specialized Test Commands
```bash
# E2E Tests
npm test                    # Production E2E tests (42 tests)
npm run test:local         # Local development E2E tests
npm run test:ui            # Interactive test interface
npm run test:headed        # Visible browser testing

# Component Tests
open http://localhost:8001/style-guide.html  # Visual component library

# API Tests (start server first: npm run serve)
./tests/scripts/test_api.sh           # Production API health check
./tests/scripts/test_phase1_local.sh  # Local API testing
npm run test:api:archers              # Jest API tests (requires server)

# Manual Tests
cat tests/manual_sanity_check.md  # Pre-deployment checklist
```

## 📁 Test Structure

### E2E Tests (Playwright)
**Location:** `/tests/*.spec.js`  
**Status:** ✅ 42/42 tests passing  
**Coverage:** Critical user journeys, cross-browser, mobile-first

**Files:**
- `ranking_round.spec.js` - Production tests (main test suite)
- `ranking_round.local.spec.js` - Local development tests
- `ranking_round_setup_sections.spec.js` - UI component tests
- `verification.spec.js` - Data validation tests
- `diagnostic-ranking-round.spec.js` - System diagnostics

### Component Tests
**Location:** `style-guide.html`  
**Purpose:** Visual component library and manual testing  
**Coverage:** All UI components, responsive design, mobile usability

**Features:**
- ✅ Complete UI component showcase
- ✅ Dark/light mode toggle  
- ✅ Mobile-responsive design
- ✅ Touch-friendly interactions (44px minimum)
- ✅ Archery score colors (ring colors)
- ✅ Keypad layouts (4x3 improved design)

### API Tests
**Location:** `api/test_harness.html`, `test_*.sh`  
**Purpose:** Backend API validation  
**Coverage:** Authentication, CRUD operations, data integrity

### Unit Tests (QUnit)
**Location:** `/tests/unit/`  
**Purpose:** JavaScript function testing  
**Coverage:** Utility functions, calculations, component logic

### 2. `ranking_round.local.spec.js` - Local Development Tests
**Updated for new UI/UX design**

**Test Groups:**
- **Local Testing** - Tests against localhost:8000

**Key Tests:**
- ✅ Modal shows on fresh start (LOCAL)
- ✅ JavaScript loads correctly (LOCAL)
- ✅ Cache busters are correct (LOCAL)
- ✅ Manual setup section shows when canceling modal (LOCAL)
- ✅ New setup section elements exist (LOCAL)

### 3. `ranking_round_setup_sections.spec.js` - New Comprehensive Tests
**Brand new test file for setup sections**

**Test Groups:**
- **Setup Sections Functionality** - Mode detection and switching
- **Manual Setup Controls** - All manual setup functionality
- **Pre-assigned Setup Controls** - Pre-assigned bale list functionality
- **Setup Mode Switching** - Switching between modes
- **Mobile Responsiveness** - Mobile and tablet testing

**Key Tests:**
- ✅ Manual mode detection
- ✅ Pre-assigned mode detection
- ✅ All manual setup controls present
- ✅ Bale number updates and persists
- ✅ Selection indicator updates
- ✅ Selected archers display
- ✅ Functional search input
- ✅ Bale list container renders
- ✅ Bale list items with Start Scoring buttons
- ✅ Proper bale list styling
- ✅ Mode switching functionality
- ✅ Mobile viewport compatibility
- ✅ Tablet viewport compatibility

## Test Coverage

### Manual Setup Section
- ✅ Bale selector (`#bale-number-input-manual`)
- ✅ Archer search (`#archer-search-manual`)
- ✅ Selection indicator (`#selected-count-chip`)
- ✅ Selected archers display (`#selected-archers-display`)
- ✅ Start Scoring button (`#manual-start-scoring-btn`)
- ✅ State persistence
- ✅ Mobile responsiveness

### Pre-assigned Setup Section
- ✅ Bale list container (`#bale-list-container`)
- ✅ Bale list items (`.bale-list-item`)
- ✅ Bale information (`.bale-number`, `.bale-archers`)
- ✅ Start Scoring buttons
- ✅ Proper styling and hover effects
- ✅ Mobile responsiveness

### Setup Mode Detection
- ✅ Manual mode when no event connected
- ✅ Pre-assigned mode when event connected
- ✅ Proper section visibility switching
- ✅ Mode switching functionality

### Mobile/Responsive Testing
- ✅ Mobile viewport (375x667)
- ✅ Tablet viewport (768x1024)
- ✅ All controls visible and functional
- ✅ Proper responsive behavior

## Running Tests

### Quick Test Run
```bash
# Test just the new setup sections
npm run test:setup-sections

# Test main ranking round functionality
npm run test:ranking-round
```

### Full Test Suite
```bash
# Run all tests
npm run test:all

# Run with UI for debugging
npm run test:ui
```

### Local Development Testing
```bash
# Start local server
npm run serve

# In another terminal, run local tests
npm run test:local
```

## Test Results

All tests are designed to work with the new UI/UX design and validate:
- ✅ Proper setup section visibility
- ✅ Manual setup controls functionality
- ✅ Pre-assigned setup controls functionality
- ✅ Mode detection and switching
- ✅ State persistence
- ✅ Mobile responsiveness
- ✅ Event modal functionality
- ✅ QR code parameter handling

## 📱 Mobile-First Testing

### Device Priority
1. **iPhone 13** (Primary) - Mobile Safari
2. **Galaxy S21** (Secondary) - Android Chrome  
3. **Desktop Chrome** (Development)
4. **Desktop Safari** (Cross-browser)

### Mobile Focus Areas
- Touch interactions (44px minimum targets)
- Responsive design (375px to 1200px)
- Safe area insets (iOS notch)
- Performance on mobile networks
- Offline functionality

## 🎯 Testing Documentation

### Quick Reference
- **📋 [TESTING_STRATEGY.md](../TESTING_STRATEGY.md)** - Complete testing overview
- **📁 [TEST_ORGANIZATION.md](TEST_ORGANIZATION.md)** - Test structure and organization
- **🎨 [style-guide.html](../style-guide.html)** - Visual component library

### Detailed Documentation
- **[AUTOMATED_TESTING.md](../docs/AUTOMATED_TESTING.md)** - Playwright E2E testing
- **[MANUAL_TESTING_CHECKLIST.md](../docs/MANUAL_TESTING_CHECKLIST.md)** - Manual procedures
- **[manual_sanity_check.md](manual_sanity_check.md)** - Pre-deployment checklist

## 🔧 Configuration

### Playwright Configurations
- **Production:** `playwright.config.js` → `https://archery.tryentist.com`
- **Local:** `playwright.config.local.js` → `http://localhost:8001`

### Browser Matrix
- Chromium (Desktop Chrome)
- WebKit (Desktop Safari)
- iPhone 13 (Mobile Safari)
- iPhone 13 Pro (Mobile Safari)
- Pixel 5 (Mobile Chrome)
- Galaxy S21 (Mobile Chrome)

## 📊 Test Status

### Current Status
- **E2E Tests:** ✅ 42/42 passing
- **Component Library:** ✅ Complete and integrated
- **API Tests:** ✅ Production and local
- **Mobile Testing:** ✅ Primary devices covered
- **Documentation:** ✅ Comprehensive and organized

### Success Metrics
- Test execution time: < 30 seconds
- Mobile coverage: All primary devices
- Component coverage: All UI components
- API coverage: All endpoints validated
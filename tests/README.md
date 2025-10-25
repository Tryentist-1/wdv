# NPM Test Suite - Updated for New UI/UX Design

## Overview
The NPM test suite has been completely updated to work with the new Manual vs Pre-assigned Setup sections design. All tests now properly validate the new UI structure and functionality.

## Available Test Commands

### Main Test Commands
```bash
# Run all tests (excluding LOCAL tests)
npm test

# Run all tests including LOCAL tests  
npm run test:all

# Run tests with UI interface
npm run test:ui

# Run tests in headed mode (visible browser)
npm run test:headed

# Run tests against remote production
npm run test:remote
```

### Specialized Test Commands
```bash
# Test new setup sections functionality
npm run test:setup-sections

# Test main ranking round functionality
npm run test:ranking-round

# Test local development files
npm run test:local

# Test local files with UI
npm run test:local:ui
```

### Development Server
```bash
# Start local PHP server for testing
npm run serve
```

## Test Files

### 1. `ranking_round.spec.js` - Main Production Tests
**Updated for new UI/UX design**

**Test Groups:**
- **Event Modal** - Modal functionality and event connection
- **Manual Setup Section** - Manual setup controls and functionality
- **Pre-assigned Setup Section** - Pre-assigned bale list functionality
- **Setup Mode Detection** - Automatic mode switching

**Key Tests:**
- ✅ Modal shows on fresh start
- ✅ Event connection shows pre-assigned setup
- ✅ Manual setup shows when no event connected
- ✅ Bale selector works in manual section
- ✅ Search functionality in manual section
- ✅ Selection indicator updates correctly
- ✅ Pre-assigned bale list renders properly

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

## Browser Support

Tests run on:
- ✅ **Chromium** (Desktop Chrome)
- ✅ **WebKit** (Desktop Safari)  
- ✅ **iPhone 13** (Mobile Safari)

## Notes

- Tests use the production URL: `https://tryentist.com/wdv/ranking_round_300.html`
- Local tests use: `http://localhost:8000/ranking_round_300.html`
- All tests include proper timeouts and error handling
- Tests validate both functionality and UI elements
- Mobile responsiveness is thoroughly tested
- State persistence is validated across page reloads
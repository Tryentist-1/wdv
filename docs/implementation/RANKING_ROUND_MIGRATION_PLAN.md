# Ranking Round Module Migration Plan
## Migrating to Tailwind CSS and Consistent Component Design

### Overview
The Ranking Round module is the most complex and frequently used part of the application. This plan breaks down the migration into manageable, testable steps that can be completed incrementally without breaking functionality.

### Current State Analysis
- **CSS**: Uses legacy `main.css` instead of Tailwind
- **Keypad**: Uses old 4x4 layout with navigation buttons (prev/next arrows)
- **Archer Selection**: Custom checkbox-based UI instead of `ArcherSelector` component
- **Tables**: Legacy CSS classes instead of Tailwind table components
- **Modals**: Legacy modal styling instead of Tailwind modal design
- **Headers/Footers**: Custom CSS instead of Tailwind layout classes
- **Dark Mode**: Not implemented

### Target State (from style-guide.html)
- Tailwind CSS compiled stylesheet
- 4x3 keypad layout (no navigation buttons)
- ArcherSelector component integration
- Tailwind table classes with score colors
- Tailwind modal design with dark mode
- Tailwind header/footer with dark mode
- Consistent button styling
- Mobile-first responsive design

---

## Phase 1: Foundation & Setup
**Goal**: Prepare the HTML structure and add Tailwind without breaking existing functionality

### Step 1.1: Add Tailwind CSS to HTML
- [ ] Add `<link rel="stylesheet" href="css/tailwind-compiled.css">` to `ranking_round.html`
- [ ] Add dark mode script (from style-guide.html)
- [ ] Add score color utility classes (from solo_card.html)
- [ ] Add `.score-input` utility class (from style-guide.html)
- [ ] Keep `main.css` link temporarily (for gradual migration)

**Files**: `ranking_round.html`

**Testing**: Page should load with both CSS files, no visual changes yet

---

### Step 1.2: Update HTML Structure for Tailwind
- [ ] Wrap main container with Tailwind classes: `min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col`
- [ ] Update view containers to use Tailwind display utilities
- [ ] Add dark mode classes to body/html elements

**Files**: `ranking_round.html`

**Testing**: Basic layout should work, dark mode toggle should function

---

## Phase 2: Header & Footer Migration
**Goal**: Migrate header and footer to Tailwind design system

### Step 2.1: Migrate Page Header
- [ ] Replace `.page-header` with Tailwind classes:
  - `px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700`
- [ ] Update header content structure:
  - Left section: `flex items-center gap-2`
  - Right section: `text-right text-sm text-gray-600 dark:text-gray-300`
- [ ] Migrate status badge to Tailwind badge classes
- [ ] Update h1 styling: `text-xl font-bold text-gray-800 dark:text-white`

**Files**: `ranking_round.html`, `js/ranking_round.js` (if header is dynamically generated)

**Testing**: Header should match style-guide.html design, dark mode should work

---

### Step 2.2: Migrate Page Subheader (Setup Controls)
- [ ] Replace `.page-subheader` with Tailwind classes:
  - `px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex gap-3 flex-wrap`
- [ ] Update search input to match style-guide.html:
  - `flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary`
- [ ] Migrate all buttons to Tailwind button classes:
  - Primary: `px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors min-h-[44px]`
  - Secondary: `px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark font-semibold transition-colors min-h-[44px]`
  - Danger: `px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger-dark font-semibold transition-colors min-h-[44px]`
  - Warning: `px-4 py-2 bg-warning text-gray-800 rounded-lg hover:bg-warning-dark font-semibold transition-colors min-h-[44px]`

**Files**: `ranking_round.html`, `js/ranking_round.js` (subheader is dynamically generated)

**Testing**: Subheader should match design, all buttons should be properly styled

---

### Step 2.3: Migrate Global Footer
- [ ] Replace `.global-footer` with Tailwind classes:
  - `px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-2 safe-bottom`
- [ ] Update footer buttons to Tailwind button classes
- [ ] Remove inline styles, use Tailwind utilities

**Files**: `ranking_round.html`

**Testing**: Footer should match design, safe area insets should work on iOS

---

## Phase 3: Keypad Migration
**Goal**: Migrate from old 4x4 keypad to new 4x3 layout

### Step 3.1: Update Keypad Container
- [ ] Update keypad container HTML structure:
  - `fixed bottom-0 left-0 right-0 w-full bg-gray-800 dark:bg-gray-900 shadow-lg z-50 safe-bottom overflow-hidden`
- [ ] Remove old keypad CSS classes

**Files**: `ranking_round.html`

**Testing**: Keypad container should be positioned correctly

---

### Step 3.2: Migrate Keypad Rendering Function
- [ ] Replace `renderKeypad()` function to use new 4x3 layout
- [ ] Use `ScoreKeypad` component OR copy layout from `js/score_keypad.js`
- [ ] Remove navigation buttons (prev/next arrows)
- [ ] Update button classes to match style-guide.html:
  - Score buttons: `p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center [score-color-classes] min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98`
  - Action buttons: CLOSE and CLEAR (full width, col-span-2)

**Files**: `js/ranking_round.js` (renderKeypad function, ~line 813)

**Testing**: Keypad should display 4x3 layout, no navigation buttons, all buttons should work

---

### Step 3.3: Update Keypad Event Handlers
- [ ] Remove prev/next navigation logic from `handleKeypadClick()`
- [ ] Update auto-advance logic to work without navigation buttons
- [ ] Ensure CLOSE and CLEAR buttons work correctly
- [ ] Test touch interactions on mobile

**Files**: `js/ranking_round.js` (handleKeypadClick function, ~line 818)

**Testing**: Keypad should work correctly, auto-advance should function, close/clear should work

---

## Phase 4: Table Migration
**Goal**: Migrate scoring table to Tailwind design system

### Step 4.1: Update Scoring Table Structure
- [ ] Update `renderScoringView()` table HTML to use Tailwind classes
- [ ] Table container: `overflow-x-auto -mx-6 px-6`
- [ ] Table: `w-full border-collapse text-sm bg-white dark:bg-gray-700 min-w-[600px]`
- [ ] Table header: `bg-primary dark:bg-primary-dark text-white sticky top-0`
- [ ] Table cells: Use Tailwind padding and border classes
- [ ] Sticky first column: `sticky left-0 bg-white dark:bg-gray-700 z-10`

**Files**: `js/ranking_round.js` (renderScoringView function, ~line 626)

**Testing**: Table should match style-guide.html design, sticky columns should work

---

### Step 4.2: Update Score Input Cells
- [ ] Replace score input classes with Tailwind:
  - Container: `p-0 border-r border-gray-200 dark:border-gray-600`
  - Input: `score-input [bg-score-color] [text-color]` (from utility classes)
- [ ] Ensure score colors match style-guide.html
- [ ] Update calculated cells: `px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200`

**Files**: `js/ranking_round.js` (renderScoringView function)

**Testing**: Score inputs should have correct colors, calculated cells should be styled

---

### Step 4.3: Update Card View Table
- [ ] Migrate `renderCardView()` table to Tailwind classes
- [ ] Match card view table design from style-guide.html
- [ ] Update footer row styling
- [ ] Ensure score colors work in card view

**Files**: `js/ranking_round.js` (renderCardView function, ~line 699)

**Testing**: Card view table should match design, all styling should be consistent

---

## Phase 5: Archer Selection Migration
**Goal**: Replace custom archer selection with ArcherSelector component

### Step 5.1: Add ArcherSelector to Setup View
- [ ] Add ArcherSelector container to HTML:
  - `<div id="archer-selection-container" class="flex-1 overflow-auto p-4"></div>`
- [ ] Add search input above selector (if not already present)
- [ ] Import `archer_selector.js` script

**Files**: `ranking_round.html`

**Testing**: Container should be present, script should load

---

### Step 5.2: Initialize ArcherSelector Component
- [ ] Create `initializeArcherSelector()` function
- [ ] Configure ArcherSelector with target assignment groups (A, B, C, D)
- [ ] Set up context (favorites, selfExtId)
- [ ] Wire up selection change handler
- [ ] Wire up favorite toggle handler

**Files**: `js/ranking_round.js`

**Testing**: ArcherSelector should initialize and display archers

---

### Step 5.3: Integrate ArcherSelector with State
- [ ] Update `renderSetupForm()` to use ArcherSelector instead of custom list
- [ ] Sync state.archers with ArcherSelector selection
- [ ] Handle target assignment changes from selector
- [ ] Update `showScoringView()` to validate selection
- [ ] Remove old `renderArcherSelectList()` function (or keep for pre-assigned mode)

**Files**: `js/ranking_round.js` (renderSetupForm, ~line 231)

**Testing**: Archer selection should work, state should sync correctly, scoring should start with selected archers

---

### Step 5.4: Handle Pre-Assigned Mode
- [ ] Keep pre-assigned archer display (if needed)
- [ ] Ensure ArcherSelector works with pre-assigned archers
- [ ] Update `renderPreAssignedArchers()` to use Tailwind classes

**Files**: `js/ranking_round.js` (renderPreAssignedArchers, ~line 249)

**Testing**: Pre-assigned mode should still work correctly

---

## Phase 6: Modal Migration
**Goal**: Migrate all modals to Tailwind design system

### Step 6.1: Migrate Reset Modal
- [ ] Update reset modal HTML structure:
  - Overlay: `fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50`
  - Content: `bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6`
- [ ] Update modal buttons to Tailwind classes
- [ ] Update text styling

**Files**: `ranking_round.html` (reset-modal, ~line 119)

**Testing**: Modal should match style-guide.html design, dark mode should work

---

### Step 6.2: Migrate Verify Totals Modal
- [ ] Update verify modal structure to Tailwind
- [ ] Migrate totals table to Tailwind classes
- [ ] Update modal buttons

**Files**: `ranking_round.html` (verify-totals-modal, ~line 131), `js/ranking_round.js` (renderVerifyModal, ~line 792)

**Testing**: Modal should display correctly, table should be styled

---

### Step 6.3: Migrate Export Modal
- [ ] Update export modal structure to Tailwind
- [ ] Update export option cards to match style-guide.html
- [ ] Migrate all buttons to Tailwind classes

**Files**: `ranking_round.html` (export-modal, ~line 144)

**Testing**: Export modal should match design, all options should be styled

---

### Step 6.4: Migrate Card View Header/Footer
- [ ] Update card view header to Tailwind classes
- [ ] Update card view footer buttons to Tailwind classes
- [ ] Ensure navigation buttons are styled correctly

**Files**: `ranking_round.html` (card-view, ~line 98)

**Testing**: Card view should match design system

---

## Phase 7: Setup View Migration
**Goal**: Migrate setup view to Tailwind design

### Step 7.1: Update Setup View Container
- [ ] Update setup view structure:
  - Header: Tailwind header classes
  - Content: `flex-1 overflow-auto p-4`
- [ ] Update bale number input styling

**Files**: `ranking_round.html` (setup-view, ~line 58)

**Testing**: Setup view should match design

---

### Step 7.2: Update Archer Selection Display
- [ ] Ensure ArcherSelector container is properly styled
- [ ] Update empty state message styling
- [ ] Update any remaining custom archer list styling

**Files**: `ranking_round.html`, `js/ranking_round.js`

**Testing**: Archer selection should look consistent

---

## Phase 8: Scoring View Migration
**Goal**: Complete scoring view migration

### Step 8.1: Update Scoring View Container
- [ ] Ensure scoring view uses Tailwind layout classes
- [ ] Update controls container styling
- [ ] Migrate end navigation buttons to Tailwind

**Files**: `ranking_round.html` (scoring-view, ~line 75), `js/ranking_round.js`

**Testing**: Scoring view should be fully styled

---

### Step 8.2: Update Controls Container
- [ ] Migrate prev/next end buttons to Tailwind classes
- [ ] Ensure buttons match style-guide.html button design
- [ ] Update spacing and layout

**Files**: `ranking_round.html` (controls-container, ~line 91)

**Testing**: Controls should be properly styled

---

## Phase 9: Cleanup & Polish
**Goal**: Remove legacy CSS and finalize migration

### Step 9.1: Remove Legacy CSS Dependencies
- [ ] Remove `main.css` link from HTML
- [ ] Remove any inline styles that can be replaced with Tailwind
- [ ] Clean up unused CSS classes from JavaScript

**Files**: `ranking_round.html`, `js/ranking_round.js`

**Testing**: All functionality should still work, no broken styles

---

### Step 9.2: Add Dark Mode Toggle (Optional)
- [ ] Add dark mode toggle button to header (if desired)
- [ ] Ensure all components support dark mode
- [ ] Test dark mode across all views

**Files**: `ranking_round.html`, `js/ranking_round.js`

**Testing**: Dark mode should work throughout the application

---

### Step 9.3: Final Testing & Refinement
- [ ] Test all functionality:
  - Setup view: Archer selection, bale setup
  - Scoring view: Score entry, end navigation, keypad
  - Card view: Individual scorecard display
  - Modals: All modals should work
  - Export: All export functions
- [ ] Test on mobile devices (primary use case)
- [ ] Test dark mode
- [ ] Verify responsive behavior
- [ ] Check for any visual inconsistencies

**Files**: All

**Testing**: Complete end-to-end testing

---

## Implementation Notes

### Key Challenges
1. **State Management**: ArcherSelector uses different data structure - need to map between formats
2. **Keypad Integration**: Old keypad has navigation buttons that need to be removed
3. **Pre-Assigned Mode**: May need special handling with ArcherSelector
4. **Live Updates**: Ensure sync status indicators still work with new table design

### Testing Strategy
- Test each phase independently before moving to next
- Keep `main.css` until Phase 9 to allow rollback
- Test on actual mobile devices frequently
- Verify localStorage persistence works throughout migration

### Rollback Plan
- Keep `main.css` link until Phase 9
- Use feature flags if needed to toggle between old/new implementations
- Commit after each completed phase

---

## Estimated Timeline
- **Phase 1**: 1-2 hours
- **Phase 2**: 2-3 hours
- **Phase 3**: 2-3 hours
- **Phase 4**: 3-4 hours
- **Phase 5**: 4-5 hours (most complex)
- **Phase 6**: 2-3 hours
- **Phase 7**: 1-2 hours
- **Phase 8**: 1-2 hours
- **Phase 9**: 2-3 hours

**Total**: ~18-27 hours of focused work

---

## Success Criteria
- [ ] All components match style-guide.html design
- [ ] Dark mode works throughout
- [ ] Mobile-first responsive design
- [ ] All functionality preserved
- [ ] No legacy CSS dependencies
- [ ] Consistent with solo_card and team_card modules
- [ ] Keypad uses 4x3 layout
- [ ] ArcherSelector component integrated
- [ ] All modals use Tailwind design
- [ ] Tables use Tailwind classes with score colors


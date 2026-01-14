# Ranking Round Bug: Manual Setup Controls Not Working

**Date:** 2025-01-27
**Page/Module:** `ranking_round_300.html` / `js/ranking_round_300.js`
**Severity:** High
**Status:** 🔴 Open

---

## 🐛 Bug Description

**What's broken:**
Two critical controls in the ranking round manual setup section are not functioning correctly:
1. The "Start Scoring" button (`#manual-start-scoring-btn`) is not working when clicked
2. The archer search filter input (`#archer-search-manual`) is not filtering the archer list correctly

**User Impact:**
- Users cannot start scoring rounds in manual mode, blocking core functionality
- Users cannot search/filter archers, making it difficult to find and select archers when the roster is large
- Affects 100% of users using manual setup mode (as opposed to pre-assigned mode)
- Mobile users are particularly impacted as they rely on search to find archers quickly

**Environment:**
- Page: `ranking_round_300.html`
- DOM Path (Search Input): `div#app-container > div#setup-view > div#manual-setup-section > div.bg-white dark:bg-gray-800 rounded-lg .hadow-md p-6 tran.ition-color. duration-200 > div.pace-y-4 > div.flex gap-3 > input#archer-search-manual`
- DOM Path (Start Button): `div#app-container > div#setup-view > div#manual-setup-section > div.bg-white dark:bg-gray-800 rounded-lg .hadow-md p-6 tran.ition-color. duration-200 > div.pace-y-4 > div.flex gap-3 > button#manual-start-scoring-btn`

---

## 🔍 Steps to Reproduce

### Bug 1: Start Scoring Button Not Working

1. Navigate to `ranking_round_300.html`
2. Select an event (or proceed in standalone mode)
3. Ensure you're in manual setup mode (not pre-assigned)
4. Select 1-4 archers using the archer selection interface
5. Click the "Start Scoring" button
6. **Observe:** Button click does nothing, or error occurs
7. **Expected:** Should transition to scoring view and begin scoring

### Bug 2: Search Filter Not Working

1. Navigate to `ranking_round_300.html`
2. Select an event (or proceed in standalone mode)
3. Ensure you're in manual setup mode
4. Type text into the "Search archers..." input field (`#archer-search-manual`)
5. **Observe:** Archer list does not filter based on search term
6. **Expected:** Archer list should filter to show only archers matching the search term (name or school)

---

## 🔍 Root Cause Analysis

### Initial Investigation

**Files to check:**
- `js/ranking_round_300.js` - Main logic file
  - Line ~7045-7053: Search input handler attachment
  - Line ~7056-7136: Start scoring button handler attachment
  - Line ~2089-2099: `updateSelectionCount()` function that updates button state
  - Line ~2218-2258: `renderManualArcherList()` function that renders archer list
  - Line ~2260-2600: `renderManualArcherListFallback()` function with search filtering logic

**Suspected causes:**

1. **Start Scoring Button:**
   - Handler may not be properly attached on page load
   - Button may be disabled and not re-enabled when archers are selected
   - `updateSelectionCount()` may not be called when state is restored from localStorage
   - Handler may be attached before DOM elements are ready

2. **Search Filter:**
   - Search input handler may not be attached correctly
   - Filter logic may not be applied when using ArcherSelector component
   - Fallback renderer may not be re-rendering when filter changes
   - Filter state may not be preserved when switching between ArcherSelector and fallback

---

## 📸 Evidence

**Console Errors:**
[To be filled during investigation]

**Network Errors:**
[To be filled during investigation]

**Code Locations:**
- Search input handler: `js/ranking_round_300.js:7045-7053`
- Start scoring handler: `js/ranking_round_300.js:7056-7136`
- Button state update: `js/ranking_round_300.js:2089-2099`
- Search filter logic: `js/ranking_round_300.js:2297-2308` (fallback renderer)

---

## 🔗 Related

- Similar button state management in `js/solo_card.js` and `js/team_card.js`
- ArcherSelector component in `js/archer_selector.js` may have filter issues
- Manual setup section rendering in `ranking_round_300.html:287-303`

---

## ✅ Solution

### Root Cause

1. **Start Scoring Button:**
   - Handlers were only attached in `init()` function, but if the code returned early (e.g., session restored, URL parameters handled), handlers were never attached
   - Division validation only checked `state.selectedDivision`, but should also check `state.divisionCode` or the division select element's value
   - Button state was updated in `updateSelectionCount()`, which was called in `renderManualSetup()`, so that part was working

2. **Search Filter:**
   - Search input handler was only attached in `init()` function, same issue as above
   - The fallback renderer (`renderManualArcherListFallback()`) correctly reads the search input value, so the filtering logic was correct, but the handler wasn't always attached

### Fix Strategy

Move handler attachment to `renderManualSetup()` function so handlers are always attached when manual setup is shown, regardless of initialization path.

### Implementation

**File:** `js/ranking_round_300.js`
**Location:** `renderManualSetup()` function (lines ~1868-1890)

**Changes:**
1. Moved search input handler attachment to `renderManualSetup()` to ensure it's always attached
2. Moved start scoring button handler attachment to `renderManualSetup()` to ensure it's always attached
3. Fixed division validation to check `state.selectedDivision`, `state.divisionCode`, or the division select element's value
4. Handlers in `init()` remain as fallback, but `renderManualSetup()` ensures they're always attached when needed

### Code Changes

**Before:**
- Handlers only attached in `init()` function
- Division check only looked at `state.selectedDivision`
- If `init()` returned early, handlers were never attached

**After:**
- Handlers attached in both `init()` and `renderManualSetup()`
- Division check looks at `state.selectedDivision`, `state.divisionCode`, or division select value
- Handlers always attached when manual setup is rendered

---

## 🧪 Testing Plan

### Test Cases

1. **Start Scoring Button Test**
   - Navigate to ranking round page
   - Select event and enter manual mode
   - Select 1-4 archers
   - Select a division
   - Click "Start Scoring" button
   - **Expected:** Should transition to scoring view

2. **Search Filter Test**
   - Navigate to ranking round page
   - Select event and enter manual mode
   - Type text in search input
   - **Expected:** Archer list should filter to show only matching archers

3. **Button State Test**
   - Navigate to ranking round page
   - Select event and enter manual mode
   - **Expected:** Button should be disabled when 0 archers selected
   - Select 1 archer
   - **Expected:** Button should be enabled

4. **Division Validation Test**
   - Navigate to ranking round page
   - Select event and enter manual mode
   - Select archers but don't select division
   - Click "Start Scoring"
   - **Expected:** Should show alert asking to select division

### Mobile Testing ⚠️ **CRITICAL**

- [ ] Test on iPhone (Safari)
- [ ] Test search filter on mobile
- [ ] Test button tap on mobile
- [ ] Verify touch targets are adequate (44px minimum)

---

**Status:** ✅ Fixed
**Priority:** High
**Fix Applied:** 2025-01-27
**Files Changed:**
- `js/ranking_round_300.js` - Moved handler attachment to `renderManualSetup()` and fixed division validation

# Resume Round Data Integration Analysis

> ⚠️ **DEPRECATED** - This document has been superseded by the master strategy.
> 
> **See:** [DATA_SYNCHRONIZATION_STRATEGY.md](../core/DATA_SYNCHRONIZATION_STRATEGY.md)
> 
> This document is kept for historical reference only. For current implementation
> guidance, refer to the master strategy document.
> 
> **Deprecated:** December 1, 2025  
> **Reason:** Replaced by universal synchronization rules

**Date:** November 28, 2025  
**Issue:** Ranking round cards not resuming correctly - data integration between localStorage and server  
**Status:** 🔍 ANALYSIS

---

## Problem Statement

When resuming a ranking round session, the scorecard data is not being properly reconstructed from the server, resulting in blank or incomplete cards. The issue appears to be in how local stored data (localStorage) is integrated with server stored data during the resume process.

---

## Data Storage Architecture

### Three-Tier Storage Pattern

The application uses a **3-tier storage pattern**:

1. **Database (MySQL)** - Source of truth
   - `rounds` table - Round metadata (division, event_id, round_type)
   - `round_archers` table - Archer assignments to rounds
   - `end_events` table - Individual end scores

2. **localStorage** - Cache + Session state
   - `rankingRound300_<date>` - Full application state
   - `current_bale_session` - Minimal session recovery data
   - `event:<eventId>:archers_v2` - Cached archer roster
   - `event:<eventId>:meta` - Cached event metadata
   - `live_updates_session:<roundId>` - LiveUpdates state

3. **Cookies** - Persistent identification
   - `oas_archer_id` - Archer UUID (365 days)
   - `coach_auth` - Coach authentication

---

## Resume Flow Analysis

### Current Resume Paths

There are **3 different resume paths** in the code:

#### Path 1: `restoreCurrentBaleSession()` (Lines 709-905)
**Trigger:** Called from `init()` if `current_bale_session` exists in localStorage  
**Data Source:** Server API `/v1/rounds/{roundId}/bales/{baleNumber}/archers`

**Flow:**
```javascript
1. Check localStorage for 'current_bale_session'
2. Validate session age (< 24 hours)
3. Peek at server data to show user accurate info
4. Prompt user to resume or start fresh
5. Fetch full bale group from server
6. Reconstruct state.archers from server response
7. Extract division from baleData.division (FIX 1)
8. Restore LiveUpdates state
9. Transition to scoring view
```

**Key Code:**
```javascript
// Line 816-847: Reconstruct archers array from server scorecards
state.archers = baleData.archers.map(archer => {
    const scoreSheet = createEmptyScoreSheet(state.totalEnds);
    const endsList = Array.isArray(archer.scorecard?.ends) ? archer.scorecard.ends : [];
    
    // Map server ends to local score sheet
    endsList.forEach(end => {
        const idx = Math.max(0, Math.min(state.totalEnds - 1, (end.endNumber || 1) - 1));
        scoreSheet[idx] = [end.a1 || '', end.a2 || '', end.a3 || ''];
    });
    
    // Build state archer object
    return buildStateArcherFromRoster(rosterPayload, overrides);
});
```

#### Path 2: `proceedWithResume()` (Lines 4560-4587)
**Trigger:** Called from `init()` when localStorage state exists but no bale session  
**Data Source:** Event snapshot API `/v1/events/{eventId}/snapshot`

**Flow:**
```javascript
1. Load existing scores via loadExistingScoresForArchers()
2. Extract division from event snapshot (FIX 2)
3. Always update division from first archer (FIX 3)
4. Initialize LiveUpdates
5. Transition to scoring view
```

**Key Code:**
```javascript
// Line 4571-4580: Always trust server data
if (state.archers && state.archers.length > 0) {
    const firstArcher = state.archers[0];
    if (firstArcher.division) {
        state.divisionCode = firstArcher.division;
        console.log('[RESUME] ✅ Set division from first archer:', firstArcher.division);
    }
}
```

#### Path 3: `loadExistingRound()` (Lines 575-648)
**Trigger:** Called from `checkExistingRounds()` when archer has IN_PROGRESS round  
**Data Source:** Round detail API `/v1/rounds/{roundId}`

**Flow:**
```javascript
1. Fetch full round data from server
2. Update state with round metadata
3. Extract division from roundData.division
4. Map archers and scores from API response
5. Initialize LiveUpdates if enabled
6. Render view
```

---

## Critical Data Mapping Issues

### Issue 1: Scorecard Data Structure Mismatch

**Server Response Structure:**
```json
{
  "archers": [
    {
      "archerId": "uuid",
      "firstName": "John",
      "lastName": "Smith",
      "scorecard": {
        "currentEnd": 5,
        "ends": [
          { "endNumber": 1, "a1": "X", "a2": "10", "a3": "9" },
          { "endNumber": 2, "a1": "9", "a2": "8", "a3": "7" }
        ]
      }
    }
  ]
}
```

**State Structure:**
```javascript
state.archers = [
  {
    id: "uuid",
    firstName: "John",
    lastName: "Smith",
    scores: [
      ["X", "10", "9"],  // End 1
      ["9", "8", "7"],   // End 2
      ["", "", ""],      // End 3 (empty)
      // ... more ends
    ]
  }
]
```

**Mapping Code (Line 816-822):**
```javascript
const scoreSheet = createEmptyScoreSheet(state.totalEnds);
const endsList = Array.isArray(archer.scorecard?.ends) ? archer.scorecard.ends : [];

endsList.forEach(end => {
    const idx = Math.max(0, Math.min(state.totalEnds - 1, (end.endNumber || 1) - 1));
    scoreSheet[idx] = [end.a1 || '', end.a2 || '', end.a3 || ''];
});
```

**✅ This mapping appears correct** - it creates an empty score sheet and fills in the ends from the server.

### Issue 2: Division Code Propagation

**Problem:** Division code must be set correctly for LiveUpdates to work.

**Current Fixes (from RESUME_ROUND_DIVISION_FIX_SUMMARY.md):**
- ✅ FIX 1: Extract from `baleData.division` (line 851-863)
- ✅ FIX 2: Set from event snapshot in `loadExistingScoresForArchers()`
- ✅ FIX 3: Always update from first archer in `proceedWithResume()` (line 4571-4580)
- ✅ FIX 4: Fallback in `ensureLiveRoundReady()` (line 3973+)
- ✅ FIX 5: Persist to localStorage in session (line 692-693)

**Status:** Division fixes appear comprehensive.

### Issue 3: Archer ID Mapping for LiveUpdates

**Problem:** LiveUpdates needs to map local archer IDs to server `round_archer_id`.

**Current Code (Line 869-873):**
```javascript
state.archers.forEach(archer => {
    if (archer.roundArcherId) {
        window.LiveUpdates._state.archerIds[archer.id] = archer.roundArcherId;
    }
});
```

**⚠️ POTENTIAL ISSUE:** If `archer.roundArcherId` is not set during reconstruction, the mapping will fail.

**Check:** Does the server response include `roundArcherId`?

### Issue 4: Card View Data Access

**Card View Code (Line 2864-2896):**
```javascript
function renderCardView(archerId) {
    const archer = state.archers.find(a => a.id == archerId);
    if (!archer) return;  // ⚠️ If archer not found, card is blank!
    
    const archerData = {
        id: archer.id,
        firstName: archer.firstName,
        lastName: archer.lastName,
        scores: archer.scores,  // ⚠️ Must be populated from server
        // ...
    };
    
    ScorecardView.showScorecardModal(archerData, roundData, { ... });
}
```

**⚠️ CRITICAL:** If `state.archers` is not properly populated during resume, the card will be blank.

---

## Root Cause Hypothesis

### Most Likely Issue: Incomplete Archer Reconstruction

When resuming via `restoreCurrentBaleSession()`, the archer objects may not be fully reconstructed:

1. **Missing `roundArcherId`** - Server response may not include this field
2. **Incomplete score mapping** - `archer.scorecard.ends` may be missing or malformed
3. **Timing issue** - Card view rendered before server data fully loaded

### API Response Validation - ✅ VERIFIED

**API Endpoint:** `GET /v1/rounds/{roundId}/bales/{baleNumber}/archers`  
**Location:** `/api/index.php` lines 1041-1164

**Actual Response Structure (from backend code):**

```php
json_response([
    'roundId' => $roundId,
    'division' => $roundData['division'],  // ✅ Division at top level
    'roundType' => $roundData['round_type'],
    'baleNumber' => $baleNumber,
    'archers' => [
        [
            'roundArcherId' => $archer['roundArcherId'],  // ✅ Present
            'archerId' => $archer['archerId'],
            'firstName' => $archer['firstName'],
            'lastName' => $archer['lastName'],
            'school' => $archer['school'],
            'level' => $archer['level'],
            'gender' => $archer['gender'],
            'targetAssignment' => $archer['targetAssignment'],
            'targetSize' => $archer['targetSize'],
            'scorecard' => [
                'ends' => [  // ✅ Array of end objects
                    [
                        'endNumber' => 1,
                        'a1' => 'X',
                        'a2' => '10',
                        'a3' => '9',
                        'endTotal' => 29,
                        'runningTotal' => 29,
                        'tens' => 2,
                        'xs' => 1,
                        'serverTs' => '2025-11-28 12:00:00'
                    ],
                    // ... more ends
                ],
                'currentEnd' => 5,
                'runningTotal' => 145,
                'tens' => 8,
                'xs' => 3
            ]
        ]
    ]
]);
```

**✅ ALL REQUIRED FIELDS ARE PRESENT**

The API response includes:
- ✅ `roundArcherId` - For LiveUpdates mapping
- ✅ `scorecard.ends[]` - For score reconstruction
- ✅ `division` - At top level (not per-archer)
- ✅ `firstName`, `lastName`, `school` - For display
- ✅ `level`, `gender` - For archer metadata

**⚠️ CRITICAL FINDING:** The `division` field is at the **top level** of the response, not per-archer. This is correct because all archers on a bale should be in the same division.

---

## Debugging Steps

### 1. Add Comprehensive Logging

Add logging to track data flow during resume:

```javascript
// In restoreCurrentBaleSession() after line 805
console.log('[Phase 0 Session] Server response structure:', {
    hasArchers: !!baleData.archers,
    archerCount: baleData.archers?.length,
    firstArcher: baleData.archers?.[0],
    hasDivision: !!baleData.division,
    hasScorecard: !!baleData.archers?.[0]?.scorecard,
    endsCount: baleData.archers?.[0]?.scorecard?.ends?.length
});

// After line 847 (after archer reconstruction)
console.log('[Phase 0 Session] Reconstructed archers:', state.archers.map(a => ({
    id: a.id,
    name: `${a.firstName} ${a.lastName}`,
    hasScores: a.scores?.some(end => end.some(score => score !== '')),
    scoreCount: a.scores?.flat().filter(s => s !== '').length,
    roundArcherId: a.roundArcherId
})));
```

### 2. Verify API Response Structure

Check the actual API endpoint to see what it returns:

```javascript
// Temporary debug code in restoreCurrentBaleSession()
console.log('[DEBUG] Full baleData:', JSON.stringify(baleData, null, 2));
```

### 3. Test Card View Immediately After Resume

```javascript
// After line 900 (after successful restore)
console.log('[Phase 0 Session] Testing card view data:', {
    archersInState: state.archers.length,
    firstArcherScores: state.archers[0]?.scores,
    canRenderCard: !!state.archers[0]?.id
});
```

---

## Actual Issue Identified

### Problem: Missing `division` Field in Archer Objects

**Location:** `restoreCurrentBaleSession()` line 836

**Current Code:**
```javascript
const overrides = {
    extId,
    targetAssignment: archer.targetAssignment || archer.target,
    baleNumber: archer.baleNumber || session.baleNumber,
    level: archer.level,
    gender: archer.gender,
    division: archer.division,  // ⚠️ PROBLEM: archer.division is undefined!
    scores: scoreSheet
};
```

**Root Cause:**  
The API response has `division` at the **top level** (`baleData.division`), not per-archer (`archer.division`). When we try to set `division: archer.division`, it's `undefined`.

**Impact:**
1. Archers reconstructed without division field
2. `state.divisionCode` may not be set correctly
3. LiveUpdates fails because division is required
4. Cards may show blank because archer data is incomplete

**Evidence from Code:**

```javascript
// Line 851-863: Division extraction happens AFTER archer reconstruction
if (baleData.division) {
    state.divisionCode = baleData.division;  // ✅ Global state gets it
    // But individual archers already created without division!
}
```

**The Fix Flow Should Be:**
1. Extract `division` from `baleData.division` FIRST
2. Pass it to each archer during reconstruction
3. Ensure all archers have the division field

---

## Recommended Fixes

### Fix 1: Extract Division Before Archer Reconstruction ⭐ CRITICAL

**Location:** `restoreCurrentBaleSession()` line 815

**Current:**
```javascript
// Line 815-847: Reconstruct archers array from server scorecards
state.archers = baleData.archers.map(archer => {
    // ... reconstruction code ...
    const overrides = {
        division: archer.division,  // ❌ undefined
        // ...
    };
});

// Line 851-863: Extract division AFTER reconstruction
if (baleData.division) {
    state.divisionCode = baleData.division;
}
```

**Fixed:**
```javascript
// CRITICAL FIX: Extract division BEFORE archer reconstruction
const baleDivision = baleData.division || null;
if (baleDivision) {
    state.divisionCode = baleDivision;
    state.divisionRoundId = session.roundId;
    console.log('[Phase 0 Session] ✅ Set division from server:', baleDivision);
}

// Now reconstruct archers WITH division
state.archers = baleData.archers.map(archer => {
    const scoreSheet = createEmptyScoreSheet(state.totalEnds);
    const endsList = Array.isArray(archer.scorecard?.ends) ? archer.scorecard.ends : [];
    
    endsList.forEach(end => {
        const idx = Math.max(0, Math.min(state.totalEnds - 1, (end.endNumber || 1) - 1));
        scoreSheet[idx] = [end.a1 || '', end.a2 || '', end.a3 || ''];
    });
    
    const provisional = {
        extId: archer.extId,
        firstName: archer.firstName,
        lastName: archer.lastName,
        school: archer.school
    };
    
    const extId = getExtIdFromArcher(provisional);
    const overrides = {
        extId,
        targetAssignment: archer.targetAssignment || archer.target,
        baleNumber: archer.baleNumber || session.baleNumber,
        level: archer.level,
        gender: archer.gender,
        division: baleDivision || archer.division,  // ✅ Use bale division
        scores: scoreSheet
    };
    
    const rosterPayload = Object.assign({}, provisional, {
        level: archer.level,
        gender: archer.gender,
        division: baleDivision || archer.division  // ✅ Use bale division
    });
    
    const stateArcher = buildStateArcherFromRoster(rosterPayload, overrides);
    stateArcher.roundArcherId = archer.roundArcherId;
    
    // Validate reconstruction
    if (!stateArcher.roundArcherId) {
        console.warn('[Phase 0 Session] ⚠️ Missing roundArcherId for:', archer.firstName, archer.lastName);
    }
    if (!stateArcher.division) {
        console.warn('[Phase 0 Session] ⚠️ Missing division for:', archer.firstName, archer.lastName);
    }
    
    return stateArcher;
});

// Fallback: If no division from bale data, try first archer
if (!state.divisionCode && state.archers && state.archers.length > 0 && state.archers[0].division) {
    state.divisionCode = state.archers[0].division;
    state.divisionRoundId = session.roundId;
    console.log('[Phase 0 Session] ✅ Set division from first archer:', state.divisionCode);
}
```

### Fix 2: Ensure `roundArcherId` is Captured

**Location:** `restoreCurrentBaleSession()` line 845

**Current:**
```javascript
const stateArcher = buildStateArcherFromRoster(rosterPayload, overrides);
stateArcher.roundArcherId = archer.roundArcherId;
```

**Issue:** If `archer.roundArcherId` is undefined, this silently fails.

**Fix:**
```javascript
const stateArcher = buildStateArcherFromRoster(rosterPayload, overrides);
stateArcher.roundArcherId = archer.roundArcherId || archer.round_archer_id || null;

if (!stateArcher.roundArcherId) {
    console.warn('[Phase 0 Session] ⚠️ Missing roundArcherId for archer:', archer.firstName, archer.lastName);
}
```

### Fix 2: Validate Score Reconstruction

**Location:** After line 822

**Add:**
```javascript
// Validate score reconstruction
const nonEmptyEnds = scoreSheet.filter(end => end.some(score => score !== '')).length;
console.log('[Phase 0 Session] Reconstructed scores for', archer.firstName, archer.lastName, ':', {
    endsFromServer: endsList.length,
    endsInScoreSheet: nonEmptyEnds,
    scoreSheet: scoreSheet.slice(0, 3) // First 3 ends for debugging
});

if (endsList.length > 0 && nonEmptyEnds === 0) {
    console.error('[Phase 0 Session] ❌ Score reconstruction failed! Server had', endsList.length, 'ends but scoreSheet is empty');
}
```

### Fix 3: Add Fallback for Missing Data

**Location:** `renderCardView()` line 2865

**Current:**
```javascript
const archer = state.archers.find(a => a.id == archerId);
if (!archer) return;
```

**Fix:**
```javascript
const archer = state.archers.find(a => a.id == archerId);
if (!archer) {
    console.error('[renderCardView] ❌ Archer not found in state:', archerId);
    console.error('[renderCardView] Available archers:', state.archers.map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName}` })));
    alert('Error: Archer data not found. Please try refreshing the page.');
    return;
}

// Validate archer has scores
if (!archer.scores || !Array.isArray(archer.scores)) {
    console.error('[renderCardView] ❌ Archer has no scores array:', archer);
    alert('Error: Scorecard data is missing. Please try resuming the session again.');
    return;
}
```

### Fix 4: Ensure Server Response Includes All Fields

**Backend Check:** Verify `/v1/rounds/{roundId}/bales/{baleNumber}/archers` returns:

```php
// In api/index.php - Bale archers endpoint
$archerData = [
    'archerId' => $archer['archer_id'],
    'roundArcherId' => $archer['round_archer_id'],  // ⚠️ CRITICAL
    'firstName' => $archer['first_name'],
    'lastName' => $archer['last_name'],
    'school' => $archer['school'],
    'division' => $archer['division'],
    'level' => $archer['level'],
    'gender' => $archer['gender'],
    'targetAssignment' => $archer['target_assignment'],
    'baleNumber' => $archer['bale_number'],
    'scorecard' => [
        'currentEnd' => $currentEnd,
        'ends' => $ends  // Array of end objects
    ]
];
```

---

## Testing Plan

### Test 1: Resume with Existing Scores
1. Start a ranking round, score 3 ends
2. Note the roundId and baleNumber from console
3. Reload the page
4. Click "OK" to resume
5. **Verify:** All 3 ends show scores
6. Click "View Card" for first archer
7. **Verify:** Card shows all 3 ends with scores

### Test 2: Resume After Browser Close
1. Start a ranking round, score 5 ends
2. Close browser completely
3. Reopen browser, navigate to ranking round page
4. **Verify:** Resume prompt appears
5. Click "OK" to resume
6. **Verify:** All 5 ends show scores
7. **Verify:** Can view cards for all archers

### Test 3: Cross-Device Resume
1. Device A: Start round, score 3 ends
2. Device B: Open same event with same entry code
3. **Verify:** Device B can see Device A's scores in coach view
4. Device B: Resume the same round
5. **Verify:** Scores appear correctly

---

## Next Steps

1. **Add debug logging** to track data flow during resume
2. **Test API endpoint** to verify response structure
3. **Implement validation fixes** to catch missing data
4. **Test resume scenarios** to confirm fixes work
5. **Update documentation** with findings

---

**Status:** Ready for debugging session  
**Priority:** HIGH - Affects core resume functionality

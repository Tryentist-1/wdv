# Resume Round Division Analysis

**Date:** November 27, 2025  
**Status:** Root Cause Analysis  
**Issue:** Division field missing when resuming ranking rounds, causing blank scorecard

---

## Executive Summary

The "resume round" feature fails because the **division field is not properly restored** from the server when resuming a session. The division MUST come from the `rounds` table (not from archer profiles), but the current code has multiple gaps in the resume flow that cause `state.divisionCode` to remain null.

**Key Insight:** Archers' master profiles may say "JV" but they shoot in "VAR" or "OPEN" divisions at specific events. The division is **event/round-specific**, not archer-specific.

---

## Data Flow: Where Division Lives

### Database Schema

```sql
-- Division is stored in the ROUNDS table (source of truth)
rounds
  ├─ id (UUID)
  ├─ division (VARCHAR) ← "BVAR", "GJV", "OPEN", etc.
  ├─ event_id (UUID)
  └─ round_type ("R300", "R360")

-- Archers table has DEFAULT division (NOT event-specific)
archers
  ├─ id (UUID)
  ├─ level ("VAR", "JV") ← This is their general level
  └─ gender ("M", "F")

-- Round archers links archers to specific rounds
round_archers
  ├─ id (UUID - roundArcherId)
  ├─ round_id (UUID) → rounds.id
  ├─ archer_id (UUID) → archers.id
  └─ bale_number (INT)
```

### API Endpoints That Return Division

#### 1. `/v1/rounds/{roundId}/bales/{baleNumber}/archers` (GET)
**Returns:**
```json
{
  "roundId": "uuid",
  "division": "BVAR",  ← FROM rounds.division
  "roundType": "R300",
  "baleNumber": 1,
  "archers": [
    {
      "roundArcherId": "uuid",
      "archerId": "uuid",
      "firstName": "John",
      "lastName": "Smith",
      "level": "JV",      ← From archers.level (NOT the division!)
      "gender": "M",
      "targetAssignment": "A",
      "scorecard": { ... }
    }
  ]
}
```

**Source:** `api/index.php` lines 1041-1164  
**Key:** Returns `division` from `rounds` table (line 1155)

#### 2. `/v1/events/{eventId}/snapshot` (GET)
**Returns:**
```json
{
  "event": { "id": "uuid", "name": "Practice Meet" },
  "divisions": {
    "BVAR": {
      "roundId": "uuid",  ← Division-specific round ID
      "archers": [
        {
          "archerId": "uuid",
          "archerName": "John Smith",
          "bale": 1,
          "target": "A",
          "division": "BVAR",  ← Event-specific division
          "scorecard": { ... }
        }
      ]
    }
  }
}
```

**Source:** Event snapshot endpoint  
**Key:** Each division has its own `roundId`

---

## Current Code Analysis

### Resume Flow 1: `restoreCurrentBaleSession()` (Lines 700-880)

**Purpose:** Restore session from `localStorage.current_bale_session`  
**Status:** ✅ **WORKS CORRECTLY** (mostly)

```javascript
// Line 776: Fetches bale data from server
const response = await fetch(`${API_BASE}/rounds/${session.roundId}/bales/${session.baleNumber}/archers`);
const baleData = await response.json();

// Lines 806-838: Reconstructs archers from server data
state.archers = baleData.archers.map(archer => {
    // ...
    division: archer.division,  // ← Sets archer.division
    // ...
});
```

**Problem:** 
- Sets `archer.division` for each archer ✅
- **DOES NOT** set `state.divisionCode` ❌
- **DOES NOT** set `state.divisionRoundId` ❌

**The API returns `division` at the top level** (line 1155 in API), but the code doesn't capture it!

```javascript
// MISSING CODE (should be added after line 838):
state.divisionCode = baleData.division;  // From API response
state.divisionRoundId = session.roundId; // Already have this
```

---

### Resume Flow 2: `proceedWithResume()` (Lines 4546-4569)

**Purpose:** Resume from server-synced progress (fallback to localStorage)  
**Status:** ⚠️ **PARTIALLY WORKS**

```javascript
// Line 4550: Load existing scores
await loadExistingScoresForArchers();

// Lines 4552-4559: Try to set division from first archer
if (state.archers && state.archers.length > 0 && !state.divisionCode) {
    const firstArcher = state.archers[0];
    if (firstArcher.division) {
        state.divisionCode = firstArcher.division;  // ✅ Sets from archer
    }
}
```

**Problem:**
- Only runs if `!state.divisionCode` (line 4553)
- If `state.divisionCode` was set incorrectly earlier, this won't fix it
- Relies on `loadExistingScoresForArchers()` to populate `archer.division`

---

### Resume Flow 3: `loadExistingScoresForArchers()` (Lines 1814-1944)

**Purpose:** Load scores from event snapshot  
**Status:** ⚠️ **SETS ARCHER DIVISION BUT NOT STATE DIVISION**

```javascript
// Lines 1912-1920: Updates archer.division from event snapshot
if (data.divisions && typeof data.divisions === 'object') {
    Object.keys(data.divisions).forEach(divCode => {
        const div = data.divisions[divCode];
        if (div.archers && div.archers.some(a => (a.archerId || a.id) === archerId)) {
            stateArcher.division = divCode;  // ✅ Sets archer.division
            console.log(`[loadExistingScores] Updated division for ${stateArcher.firstName}: ${divCode}`);
        }
    });
}
```

**Problem:**
- Sets `stateArcher.division` ✅
- **DOES NOT** set `state.divisionCode` ❌
- **DOES NOT** set `state.divisionRoundId` ❌

**Missing code:**
```javascript
// Should add after line 1920:
if (!state.divisionCode && divCode) {
    state.divisionCode = divCode;
    state.divisionRoundId = div.roundId;  // Also available in snapshot
    console.log(`[loadExistingScores] Set global division: ${divCode}, roundId: ${div.roundId}`);
}
```

---

### Resume Flow 4: `loadPreAssignedBale()` (Lines 3665-3747)

**Purpose:** Load bale from event snapshot  
**Status:** ✅ **WORKS CORRECTLY**

```javascript
// Lines 3689-3696: Extract division from event snapshot
for (const [divCode, divData] of Object.entries(data.divisions)) {
    if (divData.archers && divData.archers.length > 0) {
        const baleArchers = divData.archers.filter(a => a.bale === targetBale);
        if (baleArchers.length > 0) {
            divisionCode = divCode;           // ✅ Captures division code
            divisionRoundId = divData.roundId; // ✅ Captures round ID
            break;
        }
    }
}

// Lines 3737-3738: Sets global state
state.divisionCode = divisionCode;       // ✅ Sets state
state.divisionRoundId = divisionRoundId; // ✅ Sets state
```

**This is the GOLD STANDARD** - it correctly extracts and stores division data!

---

## Comparison: Local vs Remote Data

### What's in localStorage?

```javascript
// current_bale_session
{
  "roundId": "uuid",
  "baleNumber": 1,
  "eventId": "uuid",
  "archerIds": ["uuid1", "uuid2"],
  "currentEnd": 3,
  "lastSaved": "2025-11-27T18:00:00Z"
  // ❌ NO division field!
  // ❌ NO divisionCode field!
}

// rankingRound300_{date}
{
  "archers": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Smith",
      "division": "BVAR",  // ← May or may not be present
      "scores": [[10,9,10], ...]
    }
  ],
  "divisionCode": "BVAR",  // ← May be missing or stale
  "baleNumber": 1,
  "activeEventId": "uuid"
}
```

### What's on the Server?

```javascript
// GET /v1/rounds/{roundId}/bales/{baleNumber}/archers
{
  "roundId": "uuid",
  "division": "BVAR",  ← ✅ AUTHORITATIVE SOURCE
  "roundType": "R300",
  "baleNumber": 1,
  "archers": [...]
}

// GET /v1/events/{eventId}/snapshot
{
  "divisions": {
    "BVAR": {
      "roundId": "uuid",  ← ✅ Division-specific round ID
      "archers": [...]
    }
  }
}
```

**Key Insight:** The server ALWAYS has the correct division. We just need to extract it properly.

---

## The Fix

### Strategy: Trust the Server, Not localStorage

1. **Always fetch division from server** when resuming
2. **Update `state.divisionCode` immediately** after fetching
3. **Persist division to localStorage** for offline resilience
4. **Validate division before LiveUpdates** initialization

### Implementation

#### Fix 1: Update `restoreCurrentBaleSession()` (Line 838)

```javascript
// After line 838, add:
// CRITICAL: Extract division from server response
if (baleData.division) {
    state.divisionCode = baleData.division;
    state.divisionRoundId = session.roundId;
    console.log('[Phase 0 Session] Set division from server:', baleData.division);
}
```

#### Fix 2: Update `loadExistingScoresForArchers()` (Line 1920)

```javascript
// After line 1920, add:
// CRITICAL: Set global division code from first match
if (!state.divisionCode) {
    state.divisionCode = divCode;
    console.log(`[loadExistingScores] Set global division code: ${divCode}`);
}

// Also capture roundId if available
if (!state.divisionRoundId && div.roundId) {
    state.divisionRoundId = div.roundId;
    console.log(`[loadExistingScores] Set global roundId: ${div.roundId}`);
}
```

#### Fix 3: Update `proceedWithResume()` (Line 4553)

```javascript
// Replace lines 4552-4559 with:
// CRITICAL: Always update division from archers (trust server data)
if (state.archers && state.archers.length > 0) {
    const firstArcher = state.archers[0];
    if (firstArcher.division) {
        state.divisionCode = firstArcher.division;
        console.log('[RESUME] Set division from first archer:', firstArcher.division);
    }
}
```

#### Fix 4: Add fallback in `ensureLiveRoundReady()` (Before Line 3941)

```javascript
// Before line 3941, add final fallback:
// FINAL FALLBACK: Extract division from any archer
if (!division && state.archers && state.archers.length > 0) {
    for (const archer of state.archers) {
        if (archer.division) {
            division = archer.division;
            console.log('[ensureLiveRoundReady] Fallback: Using division from archer:', division);
            break;
        }
    }
}
```

#### Fix 5: Persist division to localStorage (In `saveData()`)

Ensure `state.divisionCode` and `state.divisionRoundId` are always saved:

```javascript
// In saveData() function, ensure these fields are included:
const sessionData = {
    archers: state.archers,
    divisionCode: state.divisionCode,      // ← Add this
    divisionRoundId: state.divisionRoundId, // ← Add this
    baleNumber: state.baleNumber,
    activeEventId: state.activeEventId,
    // ... other fields
};
```

---

## Testing Plan

### Test Scenario 1: Resume from Server (Clear localStorage)
1. Start scoring session on Device A
2. Score 3 ends
3. Clear localStorage on Device A
4. Reload page
5. **Expected:** Division loaded from server, scoring resumes

### Test Scenario 2: Resume from localStorage (Offline)
1. Start scoring session
2. Score 3 ends
3. Disconnect from network
4. Reload page
5. **Expected:** Division loaded from localStorage, scoring resumes offline

### Test Scenario 3: Cross-Device Resume
1. Start scoring on Device A (division = "BVAR")
2. Score 3 ends
3. Open same event on Device B
4. **Expected:** Division = "BVAR" loaded from server

### Test Scenario 4: Division Mismatch
1. Archer profile says "JV"
2. Event assigns archer to "VAR" division
3. Resume session
4. **Expected:** Division = "VAR" (from event, not profile)

---

## Root Cause Summary

The resume feature fails because:

1. **`restoreCurrentBaleSession()`** fetches division from API but doesn't store it in `state.divisionCode`
2. **`loadExistingScoresForArchers()`** updates `archer.division` but not `state.divisionCode`
3. **`proceedWithResume()`** only sets division if `!state.divisionCode` (doesn't override stale data)
4. **`ensureLiveRoundReady()`** requires `division` but has no fallback to extract from archers
5. **localStorage** doesn't persist `divisionCode` reliably

**The fix:** Extract division from server responses and update `state.divisionCode` in ALL resume paths.

---

## Related Files

- `js/ranking_round_300.js` - Main ranking round logic
- `api/index.php` - API endpoints (lines 1041-1164 for bale archers)
- `docs/BALE_GROUP_SCORING_WORKFLOW.md` - Workflow documentation

---

**Document Owner:** Development Team  
**Last Updated:** November 27, 2025  
**Next Steps:** Implement fixes and test all resume scenarios

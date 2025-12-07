# Ranking Round Implementation Guidance

**Date:** January 21, 2025  
**Status:** Implementation Guidance - Ready for Development  
**Priority:** High  
**Branch:** feature/ranking-round-event-division-refactor

---

## 🎯 Core Principles (From User Requirements)

### 1. **Resume Path Definition**
**A Resume Path should resume a Scorecard Group, which is:**
- **RoundID + Bale Number** (the unique identifier for a bale group)
- This is the atomic unit of scoring - all archers on the same bale in the same round

### 2. **Standalone Round Bale Selection**
- ✅ **Standalone rounds MUST require bale selection** (not auto-assigned)
- Bale number must be provided before starting scoring
- No default to Bale 1

### 3. **Standalone Event**
- ✅ **Create a special "Standalone" event** to prevent `event_id = NULL`
- All standalone rounds should link to this event
- Prevents NULL handling complexity in SQL queries

### 4. **Archer ID Format**
- ✅ **ALWAYS use UUIDs** for joins, queries, and interactions
- Standardize on `archerId` field name (master archer UUID)
- Use `roundArcherId` for round-specific entries

### 5. **"Open Assignments" Filtering**
- The backend query correctly filters by `archer_id`
- Frontend should verify archer ID matches (double-check)
- Only show rounds where the archer is actually assigned (in `round_archers` table)

---

## 📋 All Resume Paths Identified

### Path 1: `restoreCurrentBaleSession()` 
**Location:** `js/ranking_round_300.js` lines ~1241-1556  
**Trigger:** `current_bale_session` exists in localStorage  
**Entry Point:** Called from `init()` if session exists  
**Data Source:** `/v1/rounds/{roundId}/bales/{baleNumber}/archers`  
**Key:** Resumes by RoundID + Bale Number (Scorecard Group)

**Flow:**
1. Check localStorage for `current_bale_session`
2. Validate session age (< 24 hours)
3. Show resume dialog with server verification
4. Fetch bale group from server
5. Reconstruct archers from server response
6. Restore LiveUpdates state
7. Transition to scoring view

---

### Path 2: `handleDirectLink(eventId, roundId, archerId)`
**Location:** `js/ranking_round_300.js` lines 5827-6389  
**Trigger:** URL parameters `?event=X&round=Y&archer=Z`  
**Entry Point:** Called from `handleUrlParameters()` or `init()`  
**Data Source:** `/v1/rounds/{roundId}/snapshot` + `/v1/rounds/{roundId}/bales/{baleNumber}/archers`  
**Key:** Resumes by RoundID + Bale Number (from archer's assignment)

**Flow:**
1. Clear state to prevent pollution
2. Check if matches current session (try `restoreCurrentBaleSession()`)
3. Fetch entry code (event code or round entry code)
4. Fetch round snapshot to find archer's bale number
5. Filter archers by bale number (same bale OR NULL)
6. Merge snapshot archers with bale data
7. Reconstruct state.archers
8. Load existing scores
9. Initialize LiveUpdates
10. Transition to scoring view

**Issues:**
- Includes archers with NULL bale_number (can cause cross-contamination)
- No per-archer round ID verification
- State clearing may not be aggressive enough

---

### Path 3: `proceedWithResume()`
**Location:** `js/ranking_round_300.js` lines 6604-6631  
**Trigger:** localStorage state exists but no `current_bale_session`  
**Entry Point:** Called from `init()` when state exists  
**Data Source:** Event snapshot + existing scores  
**Key:** Legacy resume path (uses localStorage state)

**Flow:**
1. Load existing scores via `loadExistingScoresForArchers()`
2. Extract division from first archer
3. Initialize LiveUpdates
4. Transition to scoring view

**Issues:**
- Relies on localStorage state (may be stale)
- Doesn't verify with server
- May not have correct RoundID + Bale Number

---

### Path 4: `loadExistingRound(round)`
**Location:** `js/ranking_round_300.js` lines 863-936  
**Trigger:** `checkExistingRounds()` finds IN_PROGRESS round  
**Entry Point:** Called from `checkExistingRounds()` (line 846)  
**Data Source:** `/v1/rounds/{roundId}`  
**Key:** Resumes by RoundID (prompts user first)

**Flow:**
1. Fetch full round data from server
2. Update state with round metadata
3. Extract division from round data
4. Map archers and scores from API response
5. Initialize LiveUpdates if enabled
6. Render view

**Issues:**
- Doesn't filter by bale number (loads all archers in round)
- May not have correct Scorecard Group (RoundID + Bale Number)

---

### Path 5: `handleStandaloneRoundLink(entryCode, archerId, showDialog)`
**Location:** `js/ranking_round_300.js` lines ~5700-5825  
**Trigger:** URL parameters `?code={entry_code}&archer={id}` (standalone round)  
**Entry Point:** Called from `init()` (line 6643)  
**Data Source:** `/v1/rounds?entry_code={code}` + `/v1/rounds/{roundId}/snapshot`  
**Key:** Resumes standalone round by entry code

**Flow:**
1. Look up round by entry code
2. Fetch round snapshot
3. Find archer in snapshot
4. Get bale number from archer assignment
5. Fetch bale group
6. Reconstruct archers
7. Load scores
8. Initialize LiveUpdates
9. Transition to scoring view

**Issues:**
- Similar to `handleDirectLink()` - may have same filtering issues

---

### Path 6: Event Modal Resume
**Location:** `js/ranking_round_300.js` lines ~5379-5383  
**Trigger:** User clicks event in modal that has in-progress round  
**Entry Point:** Event selection handler  
**Data Source:** Event snapshot  
**Key:** Builds URL and navigates (uses Path 2: `handleDirectLink()`)

**Flow:**
1. User selects event in modal
2. System detects in-progress round
3. Builds URL: `?event={id}&round={id}&archer={id}`
4. Navigates (triggers Path 2: `handleDirectLink()`)

---

### Path 7: "Open Assignments" Resume (index.html)
**Location:** `index.html` lines 404-571  
**Trigger:** User clicks "Resume" on open assignment card  
**Entry Point:** `loadOpenAssignments()` builds links  
**Data Source:** `/v1/archers/{archerId}/history`  
**Key:** Builds URL and navigates (uses Path 2: `handleDirectLink()`)

**Flow:**
1. Fetch archer history
2. Filter incomplete rounds
3. Build URL: `?event={id}&round={id}&archer={id}`
4. User clicks link → navigates (triggers Path 2: `handleDirectLink()`)

**Note:** The backend query correctly filters by `archer_id`, so this should work. Frontend just needs to verify.

---

## 🔍 Resume Path Priority (When Multiple Available)

**User Question:** "Which resume path should take priority when multiple are available?"

**Answer:** Resume should prioritize **Scorecard Group (RoundID + Bale Number)**:

1. **URL Parameters** (Path 2, 5) - Highest priority
   - Explicit user action (clicked link)
   - Most specific (has RoundID + ArcherID)

2. **Current Bale Session** (Path 1) - High priority
   - Recent session (< 24 hours)
   - Has RoundID + Bale Number

3. **Check Existing Rounds** (Path 4) - Medium priority
   - Server-verified IN_PROGRESS round
   - Prompts user to confirm

4. **localStorage State** (Path 3) - Low priority
   - Legacy path
   - May be stale
   - Should verify with server first

**Recommended Priority Order:**
```
1. URL Parameters (handleDirectLink / handleStandaloneRoundLink)
2. Current Bale Session (restoreCurrentBaleSession)
3. Check Existing Rounds (loadExistingRound)
4. localStorage State (proceedWithResume) - Only if no other path available
```

---

## 🛠️ Implementation Requirements

### 1. **Create "Standalone" Event**

**Database Migration:**
```sql
-- Create special "Standalone" event
INSERT INTO events (id, name, date, entry_code, status, event_type, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Standalone Rounds',
    '2000-01-01',
    'STANDALONE',
    'CLOSED',
    'system',
    NOW()
);

-- Update existing standalone rounds to link to Standalone event
UPDATE rounds 
SET event_id = '00000000-0000-0000-0000-000000000001'
WHERE event_id IS NULL;
```

**API Changes:**
- When creating standalone round, set `event_id = '00000000-0000-0000-0000-000000000001'`
- Update round creation logic in `api/index.php` (line ~1029)

---

### 2. **Require Bale Selection for Standalone Rounds**

**Frontend Validation:**
- Add validation in Setup mode before starting scoring
- Check: `state.archers.every(a => a.baleNumber !== null && a.baleNumber !== undefined)`
- Show error: "All archers must have a bale number before starting scoring"

**UI Changes:**
- Make bale number input mandatory for standalone rounds
- Show clear error if bale number is missing
- Disable "Start Scoring" button until bale number is set

**Backend Validation:**
- When adding archer to round, require `baleNumber` for standalone rounds
- Return error if `baleNumber` is missing for standalone round

---

### 3. **Fix Resume Archer Selection**

**Problem:** `handleDirectLink()` includes archers with NULL bale_number, causing cross-contamination.

**Fix:**
```javascript
// Current (WRONG):
const relevantArchers = snapshotData.archers.filter(a => 
    a.baleNumber === baleNumber || 
    a.baleNumber === null || 
    a.baleNumber === undefined
);

// Fixed (CORRECT):
const relevantArchers = snapshotData.archers.filter(a => {
    // Only include archers on the same bale
    // For standalone rounds, be strict - no NULL bale numbers
    if (isStandalone) {
        return a.baleNumber === baleNumber && a.baleNumber !== null;
    }
    // For event-linked rounds, allow NULL only if they're explicitly part of this round
    return a.baleNumber === baleNumber || 
           (a.baleNumber === null && a.roundId === roundId);
});
```

**Additional Fixes:**
1. **Verify Round ID per Archer:** Check that each archer's `round_archers` entry links to the correct `roundId`
2. **Clear State Aggressively:** Clear all state (including localStorage session) before loading new round
3. **Add Logging:** Log RoundID + Bale Number for each archer to verify correct grouping

---

### 4. **Standardize Archer ID Handling**

**Create Helper Function:**
```javascript
/**
 * Normalize archer ID to UUID format
 * Always returns UUID from archers table
 */
function normalizeArcherId(archer) {
    // Priority order:
    // 1. archerId (master UUID)
    // 2. id (if UUID format)
    // 3. Look up by extId
    // 4. Error if not found
    
    if (archer.archerId && isValidUUID(archer.archerId)) {
        return archer.archerId;
    }
    if (archer.id && isValidUUID(archer.id)) {
        return archer.id;
    }
    // TODO: Look up by extId if needed
    throw new Error('Cannot normalize archer ID - not a valid UUID');
}

function isValidUUID(str) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
```

**Update All Resume Paths:**
- Use `normalizeArcherId()` before any archer ID comparison
- Always use `archerId` field name (not `id`, `databaseId`, etc.)
- Verify UUID format before database queries

---

### 5. **Fix "Open Assignments" Filtering**

**Backend (Already Correct):**
- SQL query filters by `ra.archer_id = ?` ✅

**Frontend (Add Verification):**
```javascript
// In index.html loadOpenAssignments()
const openRounds = rankingRounds.filter(round => {
    // Double-check: Verify archer ID matches
    // The backend should already filter, but verify here too
    if (round.archer_id && round.archer_id !== archerId) {
        console.warn('[index] Round archer_id mismatch:', round.archer_id, 'vs', archerId);
        return false;
    }
    
    // Check if round is incomplete
    const endsCompleted = parseInt(round.ends_completed || 0);
    const hasIncompleteEnds = endsCompleted < 10;
    const isToday = round.event_date === new Date().toISOString().slice(0, 10);
    
    return hasIncompleteEnds || (isToday && endsCompleted > 0);
});
```

---

## 📝 Implementation Checklist

### Phase 1: Database & Backend
- [ ] Create "Standalone" event in database
- [ ] Update existing standalone rounds to link to Standalone event
- [ ] Update round creation to set `event_id = Standalone` for standalone rounds
- [ ] Add validation: Require `baleNumber` for standalone rounds
- [ ] Update history API to handle Standalone event correctly

### Phase 2: Resume Path Fixes
- [ ] Fix `handleDirectLink()` archer filtering (remove NULL bale_number for standalone)
- [ ] Add round ID verification per archer
- [ ] Add aggressive state clearing before resume
- [ ] Update `restoreCurrentBaleSession()` to verify Scorecard Group
- [ ] Update `loadExistingRound()` to filter by bale number
- [ ] Standardize archer ID handling (create `normalizeArcherId()`)

### Phase 3: Frontend Validation
- [ ] Add bale number validation in Setup mode
- [ ] Require bale selection before starting scoring
- [ ] Add "Open Assignments" archer ID verification
- [ ] Update UI to show RoundID + Bale Number clearly

### Phase 4: Testing
- [ ] Test all resume paths with standalone rounds
- [ ] Test resume with multiple rounds (same bale number)
- [ ] Test "Open Assignments" filtering
- [ ] Test bale number validation
- [ ] Test Standalone event creation and linking

---

## 🎯 Success Criteria

✅ **Resume Path:**
- Resumes correct Scorecard Group (RoundID + Bale Number)
- No cross-contamination between rounds
- All archers belong to the correct round

✅ **Standalone Rounds:**
- Require bale selection before starting
- Link to Standalone event (not NULL)
- Can be resumed correctly

✅ **Archer ID:**
- Always uses UUIDs
- Consistent field names (`archerId`)
- No ID format mismatches

✅ **"Open Assignments":**
- Only shows rounds for selected archer
- Correctly filters by `archer_id`
- Shows correct resume links

---

## 📚 Related Documentation

- [RankingRoundRefactorAnalysis.md](RankingRoundRefactorAnalysis.md) - Original analysis
- [RANKING_ROUND_EVENT_DIVISION_REFACTOR_ANALYSIS.md](../features/ranking-rounds/RANKING_ROUND_EVENT_DIVISION_REFACTOR_ANALYSIS.md) - Refactor analysis
- [RESUME_ROUND_DATA_INTEGRATION_ANALYSIS.md](RESUME_ROUND_DATA_INTEGRATION_ANALYSIS.md) - Resume flow analysis

---

**Last Updated:** January 21, 2025  
**Status:** Ready for Implementation  
**Next Step:** Begin Phase 1 (Database & Backend)






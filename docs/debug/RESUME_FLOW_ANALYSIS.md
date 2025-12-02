# Resume Flow Analysis & Improvement Plan

**Date:** January 21, 2025  
**Status:** Analysis Complete - Questions for Review  
**Priority:** High - Blocking resume functionality

---

## 🔍 Problem Analysis

### Bug 1: "Open Assignments" Showing Incorrect Data

**Symptom:** Standalone rounds appear for all archers, not just the creator.

**Root Cause Analysis:**

1. **API Query (`api/index.php:219`):**
   ```sql
   WHERE ra.archer_id = ?
   ```
   - ✅ This should correctly filter by archer_id
   - ⚠️ **Potential Issue:** If `round_archers` entries have `archer_id = NULL` (orphaned entries), they won't match the filter, BUT they might be included in GROUP BY results if there's a JOIN issue

2. **Frontend Filtering (`index.html:493`):**
   ```javascript
   const openRounds = rankingRounds.filter(round => {
     // Only checks completion status, not archer assignment
     const endsCompleted = parseInt(round.ends_completed || 0);
     const hasIncompleteEnds = endsCompleted < 10;
     return shouldShow;
   });
   ```
   - ⚠️ **Issue:** Frontend doesn't explicitly verify that the archer is actually assigned to the round
   - The history API should already filter, but if there's data corruption (orphaned entries), this could leak through

3. **Data Integrity Issue:**
   - Orphaned `round_archers` entries with `archer_id = NULL` might exist
   - These could be grouped incorrectly in the SQL query
   - The GROUP BY at line 220 might be including rounds where the archer isn't actually assigned

**Questions:**
- Q1.1: Should we add explicit frontend validation to check `round.archer_id === archerId` before displaying?
- Q1.2: Should we run the cleanup script first to remove orphaned entries before fixing the code?
- Q1.3: Should the history API query be more defensive and exclude rounds where `ra.archer_id IS NULL`?

---

### Bug 2: Resume Not Selecting Correct Archers

**Symptom:** Clicking resume on different rounds shows the same set of archers.

**Root Cause Analysis:**

1. **State Clearing (`ranking_round_300.js:5860`):**
   ```javascript
   // State is cleared at start of handleDirectLink
   state.archers = [];
   state.roundId = null;
   ```
   - ✅ State is cleared, which is good
   - ⚠️ **Potential Issue:** `state.roundId` is set to `null` but then immediately used to fetch snapshot

2. **Snapshot Fetching (`ranking_round_300.js:6000`):**
   ```javascript
   const snapshotResponse = await fetch(`${API_BASE}/rounds/${roundId}/snapshot`, {
     headers: { 'X-Passcode': entryCode }
   });
   ```
   - ✅ Uses `roundId` from URL parameters
   - ⚠️ **Potential Issue:** If `roundId` is not properly extracted from URL, wrong round is fetched

3. **Archer Merging Logic (`ranking_round_300.js:1105-1107`):**
   ```javascript
   const snapshotArchers = snapshotData.archers.filter(a =>
     a.baleNumber === session.baleNumber || 
     a.baleNumber === null || 
     a.baleNumber === undefined
   );
   ```
   - ⚠️ **Issue:** This filter includes ALL archers with NULL bale numbers
   - For standalone rounds where everyone defaults to Bale 1, this might include archers from other rounds that also have NULL or Bale 1

4. **Bale Number Default (`ranking_round_300.js:227`):**
   ```javascript
   const baleNumber = Number(overrides.baleNumber ?? rosterArcher.baleNumber ?? rosterArcher.bale ?? state.baleNumber) || 1;
   ```
   - ⚠️ **Issue:** Defaults to `1` if no bale number is found
   - This means multiple standalone rounds could all have baleNumber = 1, making them indistinguishable

**Questions:**
- Q2.1: Should we add explicit logging to verify the `roundId` being used matches the URL parameter?
- Q2.2: Should the snapshot merge logic ONLY include archers from the specific `roundId`, not filter by bale number at all?
- Q2.3: Should we add a verification step that checks `snapshotData.round.id === roundId` before proceeding?

---

### Design Flaw 1: Standalone Rounds Defaulting to Bale 1

**Symptom:** Multiple standalone rounds all have baleNumber = 1, making restoration impossible.

**Root Cause Analysis:**

1. **Round Creation (`live_updates.js:337`):**
   ```javascript
   return request('/rounds', 'POST', { roundType, date, division, gender, level, eventId: eventId || null })
   ```
   - ✅ No bale number passed (correct - bale numbers are per-archer)
   - ⚠️ **Issue:** When archers are added, bale number is optional

2. **Archer Addition (`api/index.php:1152`):**
   ```php
   $baleNumber = isset($input['baleNumber']) ? (int)$input['baleNumber'] : null;
   ```
   - ⚠️ **Issue:** `baleNumber` can be `null`
   - If not provided, archer is added without a bale assignment

3. **Default Bale Assignment (`ranking_round_300.js:227`):**
   ```javascript
   const baleNumber = ... || 1;
   ```
   - ⚠️ **Issue:** Defaults to `1` when bale number is missing
   - This means all standalone rounds without explicit bale selection end up as Bale 1

**Questions:**
- Q3.1: Should standalone rounds **require** bale selection before starting scoring?
- Q3.2: Should we auto-assign unique bale numbers for standalone rounds (e.g., incrementing: 1, 2, 3...)?
- Q3.3: Should we prevent starting scoring if any archer has `baleNumber = NULL`?
- Q3.4: Should we add a UI step in Setup mode that explicitly requires bale selection for standalone rounds?

---

### Design Flaw 2: Standalone Rounds with NULL event_id

**Symptom:** Standalone rounds have `event_id = NULL`, causing filtering and display issues.

**Root Cause Analysis:**

1. **Database Schema:**
   - `rounds.event_id` is `NULL` for standalone rounds
   - Frontend sets `event_name = 'Standalone Round'` for display (line 231)
   - But database still has `NULL`, which can cause SQL filtering issues

2. **SQL Filtering Issues:**
   - `WHERE event_id IS NULL` might match unintended rows
   - `JOIN events e ON e.id = r.event_id` excludes standalone rounds (LEFT JOIN fixes this)
   - `ORDER BY COALESCE(e.date, r.date)` works but is fragile

**Questions:**
- Q4.1: Should we create a special "Standalone" event in the database with a fixed UUID?
- Q4.2: Should we add a `is_standalone` boolean column to `rounds` table instead?
- Q4.3: Should we use a special event code value (e.g., `'STANDALONE'`) instead of NULL?
- Q4.4: What's the migration strategy? Update existing NULL rounds or leave them as-is?

---

## 💡 Suggested Improvements

### Improvement 1: Fix "Open Assignments" Filtering

**Option A: Add Frontend Validation (Quick Fix)**
```javascript
const openRounds = rankingRounds.filter(round => {
  // Explicitly verify archer is assigned to this round
  if (round.archer_id !== archerId) {
    console.warn('[index] Round filtered out - archer mismatch:', {
      round_id: round.round_id,
      expected_archer: archerId,
      round_archer: round.archer_id
    });
    return false;
  }
  // ... rest of filtering logic
});
```

**Option B: Fix API Query (Better Fix)**
```sql
WHERE ra.archer_id = ? AND ra.archer_id IS NOT NULL
```
- Add explicit NULL check to prevent orphaned entries

**Option C: Both (Most Robust)**
- Fix API query + add frontend validation as safety net

---

### Improvement 2: Fix Resume Archer Selection

**Option A: Remove Bale Filtering (Simplest)**
```javascript
// Don't filter by bale - just use all archers from snapshot for this round
const snapshotArchers = snapshotData.archers; // All archers in this round
```

**Option B: Add Round ID Verification (Safer)**
```javascript
// Verify we got the right round
if (snapshotData.round.id !== roundId) {
  console.error('[handleDirectLink] Round ID mismatch!', {
    expected: roundId,
    received: snapshotData.round.id
  });
  alert('Round data mismatch. Please try again.');
  return false;
}
```

**Option C: Use Round Snapshot Only (Most Reliable)**
```javascript
// Don't merge with bale data - just use snapshot archers
state.archers = snapshotData.archers.map(archer => {
  // Convert snapshot format to state format
  return buildStateArcherFromSnapshot(archer);
});
```

---

### Improvement 3: Fix Standalone Round Bale Assignment

**Option A: Require Bale Selection (Strict)**
- Add validation in Setup mode: "All archers must have a bale number before starting"
- Show error if any archer has `baleNumber = NULL`

**Option B: Auto-Assign Unique Bales (Convenient)**
```javascript
// When creating standalone round, auto-assign bale numbers
let nextBaleNumber = 1;
state.archers.forEach((archer, index) => {
  if (!archer.baleNumber) {
    archer.baleNumber = nextBaleNumber;
    if ((index + 1) % 4 === 0) nextBaleNumber++; // 4 archers per bale
  }
});
```

**Option C: Use Round ID as Bale Identifier (Creative)**
- For standalone rounds, use a hash of `roundId` to generate unique bale numbers
- Ensures each standalone round has distinct bale numbers

---

### Improvement 4: Fix NULL event_id for Standalone Rounds

**Option A: Create "Standalone" Event (Database Change)**
```sql
-- Create special event
INSERT INTO events (id, name, date, entry_code, status) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Standalone Rounds', '2000-01-01', 'STANDALONE', 'CLOSED');

-- Update existing standalone rounds
UPDATE rounds SET event_id = '00000000-0000-0000-0000-000000000001' WHERE event_id IS NULL;
```

**Option B: Add is_standalone Column (Schema Change)**
```sql
ALTER TABLE rounds ADD COLUMN is_standalone BOOLEAN DEFAULT FALSE;
UPDATE rounds SET is_standalone = TRUE WHERE event_id IS NULL;
```

**Option C: Use Special Event Code (No Schema Change)**
- Keep `event_id = NULL` but add special handling in queries
- Use `COALESCE(event_id, 'STANDALONE')` in display logic

---

## 🎯 Recommended Approach

### Phase 1: Quick Fixes (Immediate)
1. ✅ Add frontend validation in `index.html` to filter by `archer_id`
2. ✅ Add round ID verification in `handleDirectLink`
3. ✅ Remove bale filtering from snapshot merge (use all archers from round)

### Phase 2: Data Cleanup (Before Testing)
1. ✅ Run cleanup script to remove orphaned `round_archers` entries
2. ✅ Verify data integrity in dev database

### Phase 3: Design Improvements (After Testing)
1. ⚠️ **Require bale selection for standalone rounds** (Option A from Improvement 3)
2. ⚠️ **Create "Standalone" event** (Option A from Improvement 4) - **Requires decision on Q4.1-Q4.4**

---

## ❓ Questions for Review

### Critical Questions (Block Implementation)

1. **Q4.1-Q4.4: Standalone Event Handling**
   - Should we create a special "Standalone" event in the database?
   - Or add an `is_standalone` boolean column?
   - Or keep NULL but improve handling?
   - **Impact:** Affects database schema and migration strategy

2. **Q3.1-Q3.4: Bale Assignment for Standalone Rounds**
   - Should standalone rounds require explicit bale selection?
   - Or auto-assign unique bale numbers?
   - **Impact:** Affects UX flow and data integrity

### Implementation Questions (Can Proceed with Assumptions)

3. **Q1.1-Q1.3: Open Assignments Filtering**
   - Should we add frontend validation as safety net?
   - **Recommendation:** Yes, add both API fix and frontend validation

4. **Q2.1-Q2.3: Resume Archer Selection**
   - Should we verify round ID matches before proceeding?
   - **Recommendation:** Yes, add verification and remove bale filtering

---

## 📋 Next Steps

1. **Review this analysis** and answer questions Q4.1-Q4.4 and Q3.1-Q3.4
2. **Run cleanup script** to fix dirty data in dev database
3. **Implement Phase 1 fixes** (quick fixes)
4. **Test resume flow** with cleaned data
5. **Implement Phase 3 improvements** based on answers to questions

---

**Ready for Review:** Please answer the questions above so we can proceed with implementation.


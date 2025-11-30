# Handle Direct Link API Fix

**Date:** November 28, 2025  
**Issue:** handleDirectLink was using non-existent API endpoint  
**Status:** ✅ FIXED  
**Files Modified:** `js/ranking_round_300.js`

---

## Problem

The `handleDirectLink()` function was trying to use `/v1/rounds/{roundId}` endpoint which doesn't exist!

**Error:**
```
GET /api/v1/rounds/21d8ad92-8aa3-47f1-b84b-3bd230225427
404 Not Found
```

**Available endpoints:**
- ✅ `/v1/rounds/{roundId}/snapshot` - Returns round info and archer list (minimal data)
- ✅ `/v1/rounds/{roundId}/bales/{baleNumber}/archers` - Returns full archer data with scores
- ❌ `/v1/rounds/{roundId}` - **Does not exist!**

---

## The Fix

Changed `handleDirectLink()` to use a **two-step process**:

### Step 1: Get Round Snapshot
```javascript
GET /v1/rounds/{roundId}/snapshot

Returns:
{
  round: { id, division, baleNumber, ... },
  archers: [
    { roundArcherId, archerName, targetAssignment, scores, ... }
  ]
}
```

**Purpose:** Find the bale number for this round

### Step 2: Get Full Bale Data
```javascript
GET /v1/rounds/{roundId}/bales/{baleNumber}/archers

Returns:
{
  division: "VAR",
  archers: [
    {
      roundArcherId, archerId, firstName, lastName,
      school, level, gender, targetAssignment,
      baleNumber, scorecard: { ends: [...] }
    }
  ]
}
```

**Purpose:** Get complete archer data with scores

---

## New Flow

```
1. User clicks link from index.html
   URL: ?event=X&round=Y&archer=Z
   ↓
2. handleDirectLink() called
   ↓
3. Fetch round snapshot
   GET /v1/rounds/{roundId}/snapshot
   ↓
4. Find archer in snapshot (to verify they're in this round)
   Get bale number from snapshot
   ↓
5. Fetch full bale data
   GET /v1/rounds/{roundId}/bales/{baleNumber}/archers
   ↓
6. Find archer in bale data
   ↓
7. Reconstruct state.archers (same as restoreCurrentBaleSession)
   ↓
8. Initialize LiveUpdates
   ↓
9. Save session
   ↓
10. Go to scoring view
```

---

## Code Changes

### Before (Broken):
```javascript
// ❌ This endpoint doesn't exist!
const response = await fetch(`${API_BASE}/rounds/${roundId}`);
const roundData = await response.json();

// ❌ roundData.archers doesn't have full data
state.archers = roundData.archers.map(a => buildStateArcherFromRoundData(a));
```

### After (Fixed):
```javascript
// ✅ Step 1: Get snapshot to find bale
const snapshotResponse = await fetch(`${API_BASE}/rounds/${roundId}/snapshot`);
const snapshotData = await snapshotResponse.json();
const baleNumber = snapshotData.round?.baleNumber || 1;

// ✅ Step 2: Get full bale data
const baleResponse = await fetch(`${API_BASE}/rounds/${roundId}/bales/${baleNumber}/archers`);
const baleData = await baleResponse.json();

// ✅ Use same logic as restoreCurrentBaleSession
state.archers = baleData.archers.map(archer => {
    // ... full reconstruction logic ...
    const stateArcher = buildStateArcherFromRoster(rosterPayload, overrides);
    stateArcher.roundArcherId = archer.roundArcherId;
    return stateArcher;
});
```

---

## Enhanced Logging

Added comprehensive logging at each step:

```javascript
[handleDirectLink] Loading round: { eventId, roundId, archerId }
[handleDirectLink] Using entry code: Yes/No
[handleDirectLink] Snapshot API response status: 200
[handleDirectLink] ✅ Snapshot received: { division, baleNumber, archerCount }
[handleDirectLink] ✅ Found archer, bale: 1
[handleDirectLink] ✅ Bale data received: { division, archerCount }
[handleDirectLink] Looking for archer: 3edd0f5d... in 4 archers
[handleDirectLink] ✅ Found archer: Terry Adams
[handleDirectLink] State configured: { baleNumber, division, assignmentMode }
[handleDirectLink] ✅ Set division from bale data: VAR
[handleDirectLink] ✅ Reconstructed 4 archers for bale 1
[handleDirectLink] Initializing Live Updates...
[handleDirectLink] ✅ Direct link handled - going to scoring view
```

---

## Error Handling

Added specific error messages for each failure case:

| Error | Message |
|-------|---------|
| 401 Unauthorized | "Authentication required. Please enter the event code." |
| 404 Not Found | "Round not found. It may have been deleted or the link is invalid." |
| Archer not in snapshot | "You are not assigned to this round." |
| Invalid data structure | "Invalid round data received from server. Please contact support." |

---

## Testing

### Test URL:
```
http://localhost:8001/ranking_round_300.html?event=29028a52-b889-4f05-9eb1-7cf87cbd5a62&round=21d8ad92-8aa3-47f1-b84b-3bd230225427&archer=3edd0f5d-8f17-4e4f-ac72-e5c04d9899b1
```

### Expected Console Output:
```
[handleUrlParameters] 🎯 Direct link detected - loading round
[handleDirectLink] Loading round: { eventId, roundId, archerId }
[handleDirectLink] Using entry code: Yes
[handleDirectLink] Snapshot API response status: 200
[handleDirectLink] ✅ Snapshot received: { division: "VAR", baleNumber: 1, archerCount: 4 }
[handleDirectLink] ✅ Found archer, bale: 1
[handleDirectLink] ✅ Bale data received: { division: "VAR", archerCount: 4 }
[handleDirectLink] Looking for archer: 3edd0f5d-8f17-4e4f-ac72-e5c04d9899b1 in 4 archers
[handleDirectLink] ✅ Found archer: Terry Adams
[handleDirectLink] State configured: { baleNumber: 1, division: "VAR", assignmentMode: "pre-assigned" }
[handleDirectLink] ✅ Set division from bale data: VAR
[handleDirectLink] ✅ Reconstructed 4 archers for bale 1
[handleDirectLink] ✅ Direct link handled - going to scoring view
[init] ✅ URL parameters handled successfully - skipping other checks
```

### Expected Result:
- ✅ Terry Adams loaded (correct archer)
- ✅ Bale 1, Division VAR
- ✅ All scores visible
- ✅ No errors

---

## Files Modified

- `js/ranking_round_300.js`
  - Updated `handleDirectLink()` (lines ~4780-4920)
  - Changed from single API call to two-step process
  - Added comprehensive error handling and logging
  - Uses same archer reconstruction logic as `restoreCurrentBaleSession()`

---

**Fix Complete:** November 28, 2025  
**Ready for Testing:** Yes  
**Status:** ✅ RESOLVED

Now try the link again - it should work!

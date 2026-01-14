# Scorecard Editor Bug: Delete Button Fails for Solo Matches

**Date:** 2025-01-XX
**Page/Module:** `scorecard_editor.html`
**Severity:** 🔴 High
**Status:** 🔴 Open

---

## 🐛 Bug Description

**What's broken:**
The delete button in the Scorecard Editor fails with a 404 error when attempting to delete a solo match scorecard. The error shows `undefined` and `null` values in the API route: `/v1/rounds/undefined/archers/null`.

**User Impact:**
- Coaches cannot delete solo match scorecards through the Scorecard Editor
- Error message: `Failed to delete scorecard (HTTP 404): {"error":"Not Found", "route":"\/v1\/rounds\/undefined\/archers\/null"}`
- This blocks cleanup of abandoned or test solo matches
- Affects both mobile and desktop users

---

## 🔍 Steps to Reproduce

1. Navigate to Scorecard Editor with a solo match: `scorecard_editor.html?match={matchId}&mode=coach`
2. Click the "Delete" button (red button with trash icon)
3. Confirm deletion in the dialog
4. **Observe:** Console shows error: `Failed to delete scorecard (HTTP 404): {"error":"Not Found", "route":"\/v1\/rounds\/undefined\/archers\/null"}`
5. **Expected:** Scorecard should be deleted successfully and user redirected back

**Environment:**
- Device: Any (mobile/desktop)
- Browser: Any
- Page: `scorecard_editor.html?match={soloMatchId}&mode=coach`

---

## 📸 Evidence

**Console Errors:**
```
Failed to delete scorecard (HTTP 404): {"error":"Not Found", "route":"\/v1\/rounds\/undefined\/archers\/null"}
Failed to load resource: the server responded with a status of 404 () /api/v1/rounds/undefined/archers/null:1
```

**Network Request:**
- **URL:** `/api/v1/rounds/undefined/archers/null`
- **Method:** DELETE
- **Status:** 404 Not Found

---

## 🔍 Root Cause Analysis

### The Problem

The delete button handler in `scorecard_editor.html` (line 1576) always uses the ranking round delete endpoint, regardless of whether the scorecard is a solo match or ranking round:

```javascript
const response = await fetch(`${API_BASE}/rounds/${card.round_id}/archers/${roundArcherId}`, {
    method: 'DELETE',
    headers: headers
});
```

**For solo matches:**
- `card.round_id` is `undefined` (solo matches have `id` or `match_id`, not `round_id`)
- `roundArcherId` is `null` or `undefined` (only set from URL params for ranking rounds via `?id=`)
- This results in the URL: `/v1/rounds/undefined/archers/null`

### Code Flow

1. User loads solo match: `scorecard_editor.html?match={matchId}` (no `id` param)
2. `roundArcherId` is set from URL param `id` (line 354), which is `null` for solo matches
3. `loadSoloMatch()` loads match data into `currentScorecard` (line 605)
4. Delete button handler uses `card.round_id` and `roundArcherId` (line 1576)
5. Both are undefined/null, causing 404 error

### Why This Happens

The delete handler doesn't check the `cardType` variable (set on line 357) to determine if it's a solo match or ranking round. It assumes all scorecards are ranking rounds and uses the ranking round delete endpoint.

---

## ✅ Solution

### Fix Strategy

1. **Check if DELETE endpoint exists for solo matches** - If not, we may need to delete the entire match (since solo matches have 2 archers, deleting one archer doesn't make sense)
2. **Update delete handler** to detect solo matches and use the correct endpoint
3. **Handle solo match deletion** - Either delete entire match or individual archer (depending on API design)

### Implementation

**File:** `scorecard_editor.html`
**Location:** Lines 1525-1600 (delete button handler)

**Changes:**
- Add check for `cardType === 'solo_match'` before making delete request
- For solo matches, use solo match delete endpoint (or delete entire match)
- For ranking rounds, keep existing logic

### Code Changes

**Before:**
```javascript
const response = await fetch(`${API_BASE}/rounds/${card.round_id}/archers/${roundArcherId}`, {
    method: 'DELETE',
    headers: headers
});
```

**After:**
```javascript
// Check if this is a solo match or ranking round
if (cardType === 'solo_match') {
    // For solo matches, delete the entire match (both archers)
    const matchId = card.id || card.match_id || soloMatchId;
    if (!matchId) {
        throw new Error('Match ID not found');
    }
    const response = await fetch(`${API_BASE}/solo-matches/${matchId}`, {
        method: 'DELETE',
        headers: headers
    });
    // ... handle response
} else {
    // For ranking rounds, use existing logic
    const response = await fetch(`${API_BASE}/rounds/${card.round_id}/archers/${roundArcherId}`, {
        method: 'DELETE',
        headers: headers
    });
    // ... handle response
}
```

---

## 🧪 Testing Plan

### Test Cases

1. **Primary Fix Test**
   - Load solo match in Scorecard Editor
   - Click Delete button
   - Confirm deletion
   - **Expected:** Match deleted successfully, redirected back

2. **Regression Tests**
   - Test ranking round deletion (should still work)
   - Test solo match deletion with different match statuses (PEND, COMP, VER)
   - Test deletion permissions (coach vs non-coach)

3. **Mobile Testing** ⚠️ **CRITICAL**
   - Test on actual mobile device (iPhone SE minimum)
   - Verify delete button is tappable
   - Verify confirmation dialog works
   - Verify redirect after deletion

### Test Devices

- iPhone (Safari) - Primary
- Android (Chrome) - Secondary
- Desktop - Regression check

---

## 📋 Implementation Checklist

- [x] Root cause identified ✅
- [x] Check if DELETE endpoint exists for solo matches ✅ (Created new endpoint)
- [x] Fix implemented ✅
- [ ] Code tested locally
- [ ] Mobile device tested
- [ ] Regression tests passed
- [x] Documentation updated ✅
- [ ] Ready for deployment

---

## ✅ Fix Applied

**Date:** 2025-01-XX
**Files Changed:**
- `api/index.php` - Added DELETE endpoint for solo matches (lines ~5145-5175)
- `scorecard_editor.html` - Fixed delete button handlers to detect solo matches and use correct endpoint (lines ~1525-1600, ~1850-1930)

**Summary:**
1. **Added DELETE endpoint** for solo matches: `DELETE /v1/solo-matches/:id`
   - Requires coach API key authentication
   - Deletes entire match (CASCADE deletes archers and sets automatically)
   - Allows deletion of locked/verified matches (with logging)

2. **Fixed frontend delete handlers** to:
   - Detect solo matches vs ranking rounds using `cardType` variable
   - Use correct API endpoint based on match type
   - Handle solo match-specific abandoned logic (check for sets/scores)
   - Provide appropriate confirmation messages

**Changes:**
- Main delete button handler (line 1525)
- Modal delete button handler (line 1850)
- Both now check `cardType === 'solo_match'` and route to correct endpoint

---

## 🔗 Related Issues

- Similar pattern may exist in other handlers (verify, void, complete buttons)
- Need to verify all solo match operations work correctly in Scorecard Editor

---

**Status:** 🟡 In Progress (Fix implemented, needs testing)
**Priority:** High
**Fix Applied:** 2025-01-XX

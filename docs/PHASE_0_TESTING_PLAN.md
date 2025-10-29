# Phase 0 Testing Plan
## OAS Ranking Online 3.0 - Session Persistence & Bale Groups

**Date:** October 28, 2025  
**Branch:** OAS-Ranking-Online-3.0  
**Status:** Ready for Testing

---

## Summary

Phase 0 introduces:
- ✅ Cookie-based archer identification (`oas_archer_id`)
- ✅ Session persistence across page reloads
- ✅ Bale group management (1-8 archers)
- ✅ Full scorecard recovery from server
- ✅ No new database tables (uses existing schema)

---

## Prerequisites

### Database Migration
1. Run SQL migration script:
   ```sql
   -- In phpMyAdmin or MySQL CLI:
   source /path/to/api/sql/migration_v3.0_phase0.sql
   ```

2. Verify migration success:
   ```sql
   -- Check division column size
   SHOW COLUMNS FROM rounds LIKE 'division';
   -- Should show VARCHAR(50)
   
   -- Check indexes
   SHOW INDEXES FROM round_archers WHERE Key_name = 'idx_round_bale';
   SHOW INDEXES FROM archers WHERE Key_name = 'idx_archer_cookie';
   SHOW INDEXES FROM end_events WHERE Key_name = 'idx_end_round_archer';
   ```

### Backend Deployment
1. Deploy new API endpoints:
   - `POST /v1/rounds/{roundId}/archers/bulk`
   - `GET /v1/rounds/{roundId}/bales/{baleNumber}/archers`
   - `GET /v1/archers/{cookieId}/current-session`

2. Verify API health:
   ```bash
   curl https://tryentist.com/wdv/api/v1/health
   ```

### Frontend Deployment
1. Deploy updated files:
   - `js/common.js` (cookie helpers)
   - `js/ranking_round_300.js` (session logic)

2. Clear browser cache and localStorage before testing

---

## Test Cases

### Test 1: Cookie Generation
**Objective:** Verify archer cookie is created on first visit

**Steps:**
1. Open browser DevTools → Application → Cookies
2. Navigate to `https://tryentist.com/wdv/ranking_round_300.html`
3. Check for `oas_archer_id` cookie

**Expected:**
- ✅ Cookie `oas_archer_id` exists
- ✅ Value is a valid UUID (e.g., `a1b2c3d4-...`)
- ✅ Expiry is ~365 days in the future
- ✅ Console shows: `[OAS Cookie] Created new archer ID: <uuid>`

**Fallback:**
- If cookie exists from previous session, it should NOT be regenerated

---

### Test 2: Manual Mode - Session Save
**Objective:** Verify session is saved when starting scoring (manual mode)

**Setup:**
1. Clear localStorage and cookies
2. Navigate to ranking round page
3. Enter event code: `wdva26`
4. Select bale number: `1`
5. Select 3-4 archers from list
6. Click "Start Scoring"

**Expected:**
- ✅ localStorage key `current_bale_session` exists
- ✅ Contains: `archerId`, `eventId`, `roundId`, `baleNumber`, `currentEnd`, `archerIds`
- ✅ Console shows: `[Phase 0 Session] Saved bale session: {...}`

**Verify in DevTools:**
```javascript
// Application → Local Storage
const session = JSON.parse(localStorage.getItem('current_bale_session'));
console.log(session);
// Should show: {archerId: "uuid", roundId: "uuid", baleNumber: 1, currentEnd: 1, ...}
```

---

### Test 3: Manual Mode - Session Restore
**Objective:** Verify session is restored after page reload

**Setup:**
1. Complete Test 2 (session saved)
2. Enter scores for End 1 (e.g., X, 10, 9 for each archer)
3. Click "Sync End" (if Live is enabled)
4. **Reload the page** (F5 or Cmd+R)

**Expected:**
- ✅ Page automatically loads to scoring view
- ✅ Bale number is correct (e.g., Bale 1)
- ✅ All 3-4 archers are shown
- ✅ Scores for End 1 are displayed
- ✅ Current end is 2 (ready for next end)
- ✅ Console shows:
  ```
  [Phase 0 Session] Found saved session, attempting restore: {...}
  [Phase 0 Session] Successfully retrieved bale group: {...}
  [Phase 0 Session] Session restored successfully, showing scoring view
  ```

**Fallback:**
- If session restore fails, page should fall back to setup view (no crash)

---

### Test 4: Pre-Assigned Mode - Session Save & Restore
**Objective:** Verify session works in pre-assigned mode (coach-managed bale groups)

**Setup:**
1. Create event in coach console with bale assignments
2. Navigate to ranking round page via QR code or event code
3. Select a bale from the pre-assigned list
4. Click "Start Scoring"

**Expected:**
- ✅ Session is saved (same as Test 2)
- ✅ After page reload, session is restored (same as Test 3)
- ✅ Target assignments (A, B, C, D) are preserved

---

### Test 5: Multiple Ends - Session Continuity
**Objective:** Verify session persists across multiple ends

**Setup:**
1. Start scoring (manual or pre-assigned)
2. Enter scores for End 1, sync
3. Enter scores for End 2, sync
4. Enter scores for End 3, sync
5. **Reload the page**

**Expected:**
- ✅ All 3 ends are restored
- ✅ Current end is 4 (next unscored end)
- ✅ Running totals are correct for all archers
- ✅ Tens/Xs counts are accurate

---

### Test 6: Multi-Device Isolation
**Objective:** Verify different devices/browsers can score different bales without conflict

**Setup:**
1. **Device A (Phone 1):** Start scoring Bale 1, enter End 1 scores
2. **Device B (Phone 2):** Start scoring Bale 2, enter End 1 scores
3. **Device A:** Reload page
4. **Device B:** Reload page

**Expected:**
- ✅ Device A restores Bale 1 session (NOT Bale 2)
- ✅ Device B restores Bale 2 session (NOT Bale 1)
- ✅ No data conflicts or overwrites
- ✅ Each device has unique `oas_archer_id` cookie

**Note:** Archer cookies are browser-specific, so each device has its own session.

---

### Test 7: Browser Close & Reopen
**Objective:** Verify session survives browser close (not just page reload)

**Setup:**
1. Start scoring, enter scores for 2-3 ends
2. **Close the entire browser** (not just the tab)
3. Reopen browser and navigate back to ranking round page

**Expected:**
- ✅ Cookie `oas_archer_id` still exists (365 day expiry)
- ✅ Session is restored from server
- ✅ All archers and scores are intact

---

### Test 8: No Session - Normal Flow
**Objective:** Verify app works normally when no session exists

**Setup:**
1. Clear all localStorage and cookies
2. Navigate to ranking round page

**Expected:**
- ✅ Page shows setup view (not scoring view)
- ✅ No errors in console
- ✅ Console shows: `[Phase 0 Session] No saved session found`

---

### Test 9: Invalid Session - Graceful Degradation
**Objective:** Verify app handles corrupted or invalid session data

**Setup:**
1. Manually corrupt session data in localStorage:
   ```javascript
   localStorage.setItem('current_bale_session', '{invalid json}');
   ```
2. Reload the page

**Expected:**
- ✅ Page shows setup view (not crash)
- ✅ Console shows: `[Phase 0 Session] Invalid session data, skipping restore`
- ✅ User can start a new session normally

---

### Test 10: API Endpoint - Bulk Archers
**Objective:** Test `POST /v1/rounds/{roundId}/archers/bulk` endpoint

**Setup:**
Use API test harness or curl:
```bash
curl -X POST https://tryentist.com/wdv/api/v1/rounds/{roundId}/archers/bulk \
  -H "Content-Type: application/json" \
  -H "X-Passcode: wdva26" \
  -d '{
    "baleNumber": 1,
    "archers": [
      {"archerId": "test-uuid-1", "firstName": "John", "lastName": "Doe", "targetAssignment": "A"},
      {"archerId": "test-uuid-2", "firstName": "Jane", "lastName": "Smith", "targetAssignment": "B"}
    ]
  }'
```

**Expected Response:**
```json
{
  "roundId": "uuid",
  "baleNumber": 1,
  "roundArcherIds": ["uuid-ra-1", "uuid-ra-2"],
  "created": 2,
  "updated": 0,
  "total": 2
}
```

---

### Test 11: API Endpoint - Get Bale Archers
**Objective:** Test `GET /v1/rounds/{roundId}/bales/{baleNumber}/archers` endpoint

**Setup:**
```bash
curl https://tryentist.com/wdv/api/v1/rounds/{roundId}/bales/1/archers \
  -H "X-Passcode: wdva26"
```

**Expected Response:**
```json
{
  "roundId": "uuid",
  "division": "Mixed Open",
  "roundType": "R300",
  "baleNumber": 1,
  "archers": [
    {
      "roundArcherId": "uuid-ra-1",
      "archerId": "uuid-a-1",
      "firstName": "John",
      "lastName": "Doe",
      "targetAssignment": "A",
      "scorecard": {
        "ends": [...],
        "currentEnd": 3,
        "runningTotal": 142,
        "tens": 5,
        "xs": 8
      }
    }
  ]
}
```

---

### Test 12: API Endpoint - Archer Session
**Objective:** Test `GET /v1/archers/{cookieId}/current-session` endpoint

**Setup:**
```bash
curl https://tryentist.com/wdv/api/v1/archers/{cookieArcherId}/current-session \
  -H "X-Passcode: wdva26"
```

**Expected Response:**
```json
{
  "roundArcherId": "uuid-ra-1",
  "roundId": "uuid-r-1",
  "eventId": "uuid-e-1",
  "baleNumber": 1,
  "targetAssignment": "A",
  "division": "Mixed Open",
  "roundType": "R300",
  "currentEnd": 3,
  "lastEndNumber": 2
}
```

**If no session:**
```json
{
  "error": "No active session found"
}
```

---

## Regression Tests

### Test R1: Existing v2.0 Features
**Objective:** Ensure Phase 0 doesn't break existing functionality

**Tests:**
- ✅ Event selection (QR code, manual)
- ✅ Manual archer selection
- ✅ Pre-assigned bale loading
- ✅ Score entry (keypad)
- ✅ Live sync (if enabled)
- ✅ Results page
- ✅ Individual score cards
- ✅ Export to SMS/screenshot

---

### Test R2: Backwards Compatibility
**Objective:** Verify old rounds/events still work

**Setup:**
1. Use an event created before Phase 0 (v2.0)
2. Load archers from that event

**Expected:**
- ✅ Old data loads correctly
- ✅ No duplicate round_archers entries
- ✅ Scores display properly

---

## Performance Tests

### Test P1: Page Load Time
**Objective:** Verify session restore doesn't slow down page load

**Setup:**
1. Use browser DevTools → Network tab
2. Measure "DOMContentLoaded" and "Load" times

**Expected:**
- ✅ Session restore completes in < 500ms
- ✅ Total page load < 2 seconds (on 4G network)

---

### Test P2: Large Bale Groups
**Objective:** Verify 8-archer bale groups work smoothly

**Setup:**
1. Create a bale group with 8 archers (targets A-H)
2. Enter scores for 5 ends
3. Reload page

**Expected:**
- ✅ All 8 archers restore correctly
- ✅ UI remains responsive
- ✅ No performance degradation

---

## Edge Cases

### Test E1: Event Code Missing
**Setup:**
1. Save a session
2. Clear `event_entry_code` from localStorage
3. Reload page

**Expected:**
- ✅ Console warns: `[Phase 0 Session] No entry code found, cannot restore session`
- ✅ Falls back to setup view

---

### Test E2: Round Deleted on Server
**Setup:**
1. Save a session
2. Delete the round from database (or use invalid roundId)
3. Reload page

**Expected:**
- ✅ Console warns: `[Phase 0 Session] Failed to fetch bale group: 404`
- ✅ Falls back to setup view
- ✅ No crash

---

### Test E3: Network Offline
**Setup:**
1. Save a session
2. Turn off network (airplane mode)
3. Reload page

**Expected:**
- ✅ Session restore fails gracefully
- ✅ Falls back to local storage (existing v2.0 behavior)
- ✅ Offline queue works as before

---

## Success Criteria

**Phase 0 is READY TO DEPLOY if:**

- ✅ All 12 main tests pass
- ✅ All 2 regression tests pass
- ✅ All 2 performance tests pass
- ✅ All 3 edge cases handled gracefully
- ✅ No console errors during normal operation
- ✅ No data loss or corruption
- ✅ Backwards compatible with v2.0 data

---

## Deployment Checklist

### Pre-Deployment
- [ ] Run SQL migration on production database
- [ ] Verify migration success (check indexes and column types)
- [ ] Backup production database
- [ ] Clear Cloudflare cache

### Deployment
- [ ] Deploy `api/index.php` (new endpoints)
- [ ] Deploy `js/common.js` (cookie helpers)
- [ ] Deploy `js/ranking_round_300.js` (session logic)
- [ ] Verify files deployed correctly (check timestamps)

### Post-Deployment
- [ ] Test API health endpoint
- [ ] Run Test 1 (cookie generation)
- [ ] Run Test 2 & 3 (session save/restore)
- [ ] Monitor server logs for errors
- [ ] Test with real event/archers

### Rollback Plan
If critical issues are found:
1. Revert to previous commit (v2.0 tag)
2. Deploy old files
3. Clear Cloudflare cache
4. Investigate issues in dev environment

---

## Notes

- Phase 0 is **backwards compatible** - old clients can still use the API
- No UI changes - all session logic is transparent to users
- Cookie-based archer ID is optional - existing local IDs still work
- Session persistence is a **progressive enhancement** - app works without it

---

## Next Steps (After Phase 0 Deployment)

Phase 1 will include:
- Master roster UI (coach console)
- Division round creation
- Enhanced bale group management
- "Mixed Open" as default division
- Archer score card history view

---

**Document Version:** 1.0  
**Last Updated:** October 28, 2025  
**Author:** OAS Development Team


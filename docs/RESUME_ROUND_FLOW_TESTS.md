# Resume Round Flow - Playwright Tests

**Date:** December 2025  
**Test File:** `tests/resume_round_flow.spec.js`  
**Status:** ✅ Ready for Testing

---

## Overview

Comprehensive Playwright tests for the resume round functionality, covering:
- Entry code auto-retrieval from event snapshot
- Missing bale assignment handling
- Error handling improvements
- Direct link navigation
- Entry code persistence

---

## Test Scenarios

### 1. Entry Code Auto-Retrieval ✅

**Test:** `should automatically retrieve entry code from event snapshot`

**What it tests:**
- Entry code is fetched from event snapshot API when not in localStorage
- Entry code is saved to localStorage for future use
- No user prompt is shown

**Expected behavior:**
- Event snapshot API returns `entry_code`
- Entry code is automatically retrieved and saved
- Round loads without requiring user input

---

### 2. Missing Bale Assignment Handling ✅

**Test:** `should go to Setup mode when bale number is missing`

**What it tests:**
- When archer is assigned to round but has no bale number
- App redirects to Setup mode (not error)
- User can select bale mates and start scoring

**Expected behavior:**
- Detects missing bale number
- Loads event for Setup mode
- Shows Setup Bale interface
- Does NOT show scoring view

---

### 3. Scoring View with Bale Assignment ✅

**Test:** `should load scoring view when bale number is assigned`

**What it tests:**
- When archer has bale number assigned
- App loads scoring view directly
- All archers on bale are loaded

**Expected behavior:**
- Fetches bale data from API
- Reconstructs archer state
- Shows scoring view
- Does NOT show setup sections

---

### 4. Error Handling ✅

**Test:** `should not show error alert for recoverable errors`

**What it tests:**
- 404 errors don't show alerts (recoverable)
- Network errors don't show alerts
- Fallback logic handles errors gracefully

**Expected behavior:**
- No alert dialogs for recoverable errors
- Errors logged to console
- Fallback logic attempts recovery

---

### 5. Direct Link Navigation ✅

**Test:** `should handle direct link with all parameters correctly`

**What it tests:**
- Direct link format: `?event=X&round=Y&archer=Z`
- All parameters are processed correctly
- State is set correctly
- Entry code is saved

**Expected behavior:**
- URL parameters parsed correctly
- Entry code retrieved automatically
- Round data loaded
- Session saved to localStorage

---

### 6. Entry Code Persistence ✅

**Test:** `should preserve entry code across page reloads`

**What it tests:**
- Entry code saved to localStorage
- Entry code persists across page reloads
- No need to re-enter code

**Expected behavior:**
- Entry code saved on first load
- Entry code still available after reload
- No re-prompt for entry code

---

### 7. 401 Error Handling ✅

**Test:** `should handle 401 error gracefully and retry with entry code`

**What it tests:**
- 401 error triggers entry code fetch
- Retry with entry code succeeds
- No alert shown for recoverable 401

**Expected behavior:**
- First API call fails with 401
- Entry code fetched from event
- Retry succeeds with entry code
- No alert shown

---

## Running the Tests

### Local Testing

```bash
# Run all resume round flow tests
npx playwright test tests/resume_round_flow.spec.js --config=playwright.config.local.js

# Run specific test
npx playwright test tests/resume_round_flow.spec.js --config=playwright.config.local.js -g "should automatically retrieve entry code"

# Run with UI (for debugging)
npx playwright test tests/resume_round_flow.spec.js --config=playwright.config.local.js --ui
```

### Production Testing

```bash
# Run against production
npx playwright test tests/resume_round_flow.spec.js

# Run specific test
npx playwright test tests/resume_round_flow.spec.js -g "should go to Setup mode"
```

---

## Test Data Requirements

The tests use mocked API responses, so they don't require actual database data. However, for integration testing with real data:

1. **Test Event:** Create an event with entry code
2. **Test Round:** Create a round for the event
3. **Test Archer:** Assign archer to the round
4. **Test Bale:** Assign bale number (or leave null for Setup mode test)

---

## Mock API Responses

The tests mock the following APIs:

- `GET /v1/events/{eventId}/snapshot` - Returns event with `entry_code`
- `GET /v1/rounds/{roundId}/snapshot` - Returns round with archers (includes `archerId` and `baleNumber`)
- `GET /v1/rounds/{roundId}/bales/{baleNumber}/archers` - Returns full bale data with scores

---

## Expected Console Logs

When tests run successfully, you should see:

```
[handleDirectLink] Loading round: { eventId, roundId, archerId }
[handleDirectLink] Fetching entry code from event...
[handleDirectLink] ✅ Retrieved entry code from event snapshot: TEST123
[handleDirectLink] Using entry code: Yes (TEST123)
[handleDirectLink] Fetching round data from server...
[handleDirectLink] Snapshot API response status: 200
[handleDirectLink] ✅ Snapshot received: { division, baleNumber, archerCount }
[handleDirectLink] ✅ Found archer, bale: 1
[handleDirectLink] ✅ Bale data received: { division, archerCount }
[handleDirectLink] ✅ Direct link handled - going to scoring view
```

---

## Troubleshooting

### Test Fails: "Entry code not found"

**Issue:** Event snapshot doesn't return `entry_code`  
**Fix:** Verify `api/index.php` line 2915 includes `entry_code` in response

### Test Fails: "Archer not found in snapshot"

**Issue:** Round snapshot doesn't include `archerId`  
**Fix:** Verify `api/index.php` line 1873 includes `archer_id as archerId` in query

### Test Fails: "Bale number is null but didn't go to Setup"

**Issue:** Missing bale assignment handling not working  
**Fix:** Verify `js/ranking_round_300.js` line 4927 checks for null baleNumber

---

## Related Documentation

- `docs/RESTART_ROUND_AND_EVENT_CODE_WORK_SUMMARY.md` - Complete work summary
- `docs/ENTRY_CODE_AUTH_FIX_IMPLEMENTATION.md` - Entry code fix details
- `docs/EVENT_MODAL_REFACTOR_PHASE1_IMPLEMENTATION.md` - URL parameter handling
- `docs/EVENT_MODAL_REFACTOR_PHASE2_IMPLEMENTATION.md` - Event modal improvements

---

**Last Updated:** December 2025  
**Status:** Ready for use


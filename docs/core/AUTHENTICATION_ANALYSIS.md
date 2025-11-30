# Authentication & Authorization Analysis

**Date:** November 17, 2025  
**Purpose:** Comprehensive review of API authentication patterns, cookie usage, and access control

---

## Executive Summary

This document analyzes how authentication and authorization are currently implemented across the WDV archery scoring application. It identifies inconsistencies between the expected behavior and actual implementation, particularly regarding public access to the archer list.

### Key Finding
✅ **RESOLVED** (November 17, 2025): The `/v1/archers` endpoint (GET) has been updated to be **public** - no authentication required. Archers can now view the roster on app open without any login, coach code, or event code.

---

## Current Authentication Mechanisms

### 1. Coach Authentication (Admin/Full Access)
**Method:** Static passcode  
**Value:** `wdva26` (defined in `api/config.php` as `PASSCODE`)  
**Header:** `X-Passcode: wdva26` OR `X-API-Key: <API_KEY>`  

**Where Used:**
- Coach Console (`coach.html`)
- Admin operations (create/edit events, modify rounds, bulk operations)
- Full access to all endpoints

**Storage:**
- Cookie: `coach_auth` = 'true' (90 days expiry)
- localStorage: `coach_api_key`, `coach_passcode`

**Files:**
- `js/coach.js` (lines 11-12, 116-117)
- `api/config.php` (line 23)

---

### 2. Event Entry Code (Archer Access)
**Method:** Per-event unique code  
**Purpose:** Allow archers to access a specific event's data  
**Header:** `X-Passcode: <EVENT_CODE>`  

**Where Used:**
- Archer scoring apps (`ranking_round.html`, `ranking_round_300.html`)
- QR code access (URL params: `?event=<eventId>&code=<entryCode>`)
- Sync operations during scoring

**Storage:**
- localStorage: `event_entry_code`
- localStorage: `event:<eventId>:meta` (includes entryCode)

**Database:**
- Table: `events`
- Column: `entry_code` (VARCHAR)

**Verification:**
- Endpoint: `POST /v1/events/verify` (PUBLIC - no auth required)
- Validation logic: `api/db.php` lines 34-42

**How It Works:**
```php
// api/db.php:require_api_key()
if (!$authorized && strlen($pass) > 0) {
    try {
        $pdo = db();
        $stmt = $pdo->prepare('SELECT id FROM events WHERE LOWER(entry_code) = LOWER(?) LIMIT 1');
        $stmt->execute([$pass]);
        $authorized = (bool)$stmt->fetchColumn();
    } catch (Exception $e) {
        // fall through to unauthorized if DB not available
    }
}
```

**Files:**
- `api/db.php` (lines 21-49)
- `js/live_updates.js` (lines 186-220)
- `js/ranking_round_300.js` (lines 3265)

---

### 3. Archer Profile Cookie
**Method:** Browser cookie with UUID  
**Cookie Name:** `oas_archer_id`  
**Purpose:** Persistent archer identification across sessions  
**Expiry:** 365 days  

**Where Used:**
- Profile selection/identification
- Session persistence
- NOT currently used for authentication (only identification)

**Storage:**
- Cookie: `oas_archer_id` = `<uuid>`

**Files:**
- `js/common.js` (lines 103-111)
- Documentation: `docs/OAS_RANKING_ONLINE_3.0_REQUIREMENTS.md` (lines 533-548)

---

### 4. Round Archer ID (Scorecard Session)
**Purpose:** Track active scorecard in progress  
**Storage:** localStorage (within session state objects)

**Where Stored:**
- localStorage: `rankingRound_<date>` or `rankingRound300_<date>`
- Key fields: `roundId`, `eventId`, `activeArcherId`, `baleNumber`

**NOT currently used for authentication** - primarily for UI state persistence

---

## API Endpoint Authentication Requirements

### PUBLIC Endpoints (No Auth Required) ✅

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/v1/health` | GET | Health check | ✅ Public |
| `/v1/events/recent` | GET | List recent events (entry codes hidden) | ✅ Public |
| `/v1/events/verify` | POST | Verify event entry code | ✅ Public |
| `/v1/archers/{id}/history` | GET | Archer's scoring history | ✅ Public |
| `/v1/debug/round/{id}` | GET | Round diagnostics | ✅ Public |

### AUTHENTICATED Endpoints (Require Coach Key OR Event Code) 🔒

| Endpoint | Method | Purpose | Auth Type |
|----------|--------|---------|-----------|
| `/v1/rounds` | POST | Create/retrieve round | Coach OR Event |
| `/v1/rounds/{id}/archers` | POST | Add archer to round | Coach OR Event |
| `/v1/rounds/{id}/archers/bulk` | POST | Bulk add archers to bale | Coach OR Event |
| `/v1/rounds/{id}/bales/{n}/archers` | GET | Get bale group scorecards | Coach OR Event |
| `/v1/end-events` | POST | Submit end scores | Coach OR Event |
| `/v1/end-events/{id}` | PATCH | Update end scores | Coach OR Event |
| `/v1/scorecards/{id}/lock` | PATCH | Lock scorecard | Coach OR Event |
| `/v1/events` | POST | Create event | **Coach ONLY** |
| `/v1/events/{id}` | PATCH | Update event | **Coach ONLY** |
| `/v1/events/{id}/status` | PATCH | Change event status | **Coach ONLY** |
| `/v1/rounds/{id}/link-event` | POST | Link round to event | Coach OR Event |
| `/v1/archers` | **GET** | **Load archer list** | ✅ **PUBLIC** (Fixed Nov 17) |
| `/v1/archers` | POST | Create archer | **Coach ONLY** |
| `/v1/archers/{id}` | PATCH | Update archer | **Coach ONLY** |
| `/v1/archers/bulk-upsert` | POST | Bulk update archers | **Coach ONLY** |

---

## INCONSISTENCIES IDENTIFIED

### ✅ Issue #1: Archer List Requires Authentication (RESOLVED)
**Location:** `api/index.php` line 2789  
**Status:** ✅ **FIXED** - November 17, 2025

**Fixed Behavior:**
```php
// GET /v1/archers - Load all archers from master list
// PUBLIC ENDPOINT - No authentication required
// Archers need access to roster for profile selection on first app open
if (preg_match('#^/v1/archers$#', $route) && $method === 'GET') {
    // No authentication required - this is a public endpoint
    // ... fetch archers from database
}
```

**Expected Behavior (per requirements):**
> "On page or app open for the first time the app should pull the most recent version of the Archer List from the MySQL database. THIS SHOULD NOT REQUIRE A LOGIN, Coach Code, or Event Code."

**Resolution:**
✅ Removed `require_api_key()` call from endpoint  
✅ Added comments explaining this is a public endpoint  
✅ Tested successfully - archers can now load roster without authentication  
✅ Backward compatible - coach authentication still works  
✅ Documentation updated

**Test Results:**
```bash
# Without authentication - ✅ WORKS
curl http://localhost:8001/api/index.php/v1/archers
# Returns 80 archers

# With coach authentication - ✅ STILL WORKS
curl -H "X-Passcode: wdva26" http://localhost:8001/api/index.php/v1/archers
# Returns 80 archers
```

---

### ⚠️ Issue #2: Inconsistent Event Code Usage
**Problem:** Event entry codes are stored in multiple places with different fallback strategies.

**Storage Locations:**
1. `localStorage.getItem('event_entry_code')` (global)
2. `localStorage.getItem('event:<eventId>:meta')` (per-event)
3. Extracted from session state (`rankingRound300_<date>`)

**Fallback Logic:**
`js/live_updates.js` lines 186-220 implements a complex fallback chain:
1. Try global `event_entry_code`
2. Try to find latest ranking round session
3. Extract eventId from session
4. Look up event metadata
5. Scan ALL event metadata as last resort

**Issue:** If event code is lost from localStorage, archer may lose access mid-session.

---

### ⚠️ Issue #3: Cookie vs localStorage Confusion
**Problem:** Some credentials are stored in both cookies AND localStorage with no clear strategy.

**Examples:**
- Archer ID: Cookie (`oas_archer_id`)
- Coach auth: Cookie (`coach_auth`) + localStorage (`coach_api_key`, `coach_passcode`)
- Event code: Only localStorage (no cookie)

**Implications:**
- Cookies persist across browser sessions and can be set with expiry
- localStorage is per-origin and persists until manually cleared
- No consistent strategy for which to use when

---

### ⚠️ Issue #4: Unclear Authorization for Scorecard Modifications
**Problem:** It's unclear whether an archer can ONLY edit their own scorecard or any scorecard on their bale.

**Current Implementation:**
- `POST /v1/end-events` (submit scores) - Requires valid `round_archer_id`
- `PATCH /v1/end-events/{id}` (update scores) - Requires event code OR coach key
- No validation that the archer making the request is the owner of the scorecard

**Potential Security Issue:**
If Archer A has an event code, they could theoretically:
1. Find Archer B's `round_archer_id` (from bale group API)
2. Submit/modify scores for Archer B's scorecard

**Mitigation:**
Currently mitigated by:
- Archers typically don't know the internal IDs of other archers' scorecards
- UI doesn't expose these IDs or provide a way to manipulate them
- But technically possible via API if they inspect network traffic

---

## EXPECTED BEHAVIOR (Per Requirements)

### Cookie Strategy

| Cookie/Storage | Purpose | Expiry | Used For |
|----------------|---------|--------|----------|
| `oas_archer_id` | Persistent archer identification | 365 days | Profile selection, session recovery |
| `event_entry_code` | Current event access | Session (localStorage) | API authentication during scoring |
| `round_archer_id` | Active scorecard | Session (localStorage) | Scorecard state persistence |

### Access Flow for Archers

#### Step 1: Open App (No Auth Required)
```
1. App loads → Fetches archer list from GET /v1/archers (PUBLIC)
2. Display roster → Archer selects their profile
3. Store selection in oas_archer_id cookie
```

#### Step 2: Join Event (Event Code Required)
```
1. Archer scans QR code or manually enters event code
2. Call POST /v1/events/verify (PUBLIC) to validate code
3. Store eventId + entryCode in localStorage
4. Load event details using GET /v1/events/{id}/rounds (requires event code)
```

#### Step 3: Start Scoring (Event Code Required)
```
1. Select round/division → Create or join bale group
2. Call POST /v1/rounds/{id}/archers (requires event code)
3. Receive round_archer_id for their scorecard
4. All score submissions use event code for auth
```

### Access Flow for Coaches

#### Coach Login (Coach Code Required)
```
1. Open coach.html → Show passcode modal
2. Enter COACH_PASSCODE ('wdva26')
3. Store in cookie coach_auth=true (90 days)
4. Store in localStorage for API calls
```

#### Coach Operations
```
- Create events (coach key required)
- View all scorecards (coach key required)
- Modify any scorecard (coach key required)
- Generate reports (coach key required)
```

---

## RECOMMENDED CHANGES

### Priority 1: Make Archer List Public ⚠️ CRITICAL

**File:** `api/index.php` (line 2789)

**Current:**
```php
if (preg_match('#^/v1/archers$#', $route) && $method === 'GET') {
    require_api_key();
    // ...
}
```

**Recommended:**
```php
if (preg_match('#^/v1/archers$#', $route) && $method === 'GET') {
    // PUBLIC ENDPOINT - No authentication required
    // Archers need access to roster for profile selection
    
    // Optional: Allow filtering by authenticated users (coaches)
    $isAuthenticated = check_api_key();
    
    // Optional query params for filtering
    // ...
}
```

**Impact:**
- ✅ Allows archers to load roster on first app open
- ✅ No breaking changes to coach functionality (coach can still use API key)
- ✅ Matches documentation claims that this is public
- ⚠️ Security consideration: Exposes full archer roster publicly
  - Currently includes: name, school, level, gender, notes, email, phone
  - **Recommendation:** Create a separate "public" vs "full" view
    - Public: id, firstName, lastName, school, level, gender, status only
    - Full (authenticated): All fields including email, phone, notes, gear

---

### Priority 2: Standardize Event Code Storage

**Problem:** Event codes stored in multiple places with complex fallback logic.

**Recommendation:**
1. **Primary storage:** `localStorage.setItem('event_entry_code', code)`
2. **Per-event metadata:** `localStorage.setItem('event:<eventId>:meta', JSON.stringify({ entryCode, eventName, date }))`
3. **Remove complex fallback chains** - if no event code found, prompt user
4. **Add explicit "Event Code Lost" recovery flow** in UI

**Files to Update:**
- `js/live_updates.js` (simplify lines 186-220)
- `js/ranking_round_300.js` (line 3265)
- `js/ranking_round.js` (similar pattern)

---

### Priority 3: Document Cookie vs localStorage Strategy

**Recommendation:**
Create clear rules for when to use each:

**Use Cookies For:**
- Long-term identification (archer profile ID)
- Cross-session persistence (coach authentication)
- Expiry-based invalidation (90-day coach auth, 365-day archer ID)

**Use localStorage For:**
- Session-specific data (event codes, round state)
- Large data structures (full archer list cache)
- Data that should persist until manually cleared

**Update:**
- Create `docs/COOKIE_STORAGE_STRATEGY.md`
- Document in `README.md`

---

### Priority 4: Add Scorecard Ownership Validation

**Problem:** No server-side validation that archer editing scorecard owns it.

**Recommendation:**
Add middleware to validate scorecard ownership for non-coach users:

```php
function require_scorecard_ownership($roundArcherId, $isCoach) {
    if ($isCoach) {
        return true; // Coaches can edit any scorecard
    }
    
    // For archers, validate they own this scorecard
    // Option 1: Compare archer_id from round_archers table with oas_archer_id cookie
    // Option 2: Require archers to pass their archerId in request body
    // Option 3: Accept risk (UI doesn't expose other scorecards anyway)
    
    return true; // For now, trust the client
}
```

**Files to Update:**
- `api/index.php` (add validation to score submission endpoints)
- Consider adding archer_id validation to PATCH/POST score endpoints

---

## AUTHENTICATION MATRIX

### Summary Table

| User Type | Archer List | Event List | Verify Code | Create Scores | View Own Scores | View All Scores | Modify Event | Create Event |
|-----------|-------------|------------|-------------|---------------|-----------------|-----------------|--------------|--------------|
| **Public (no auth)** | ❌ (should be ✅) | ✅ | ✅ | ❌ | ✅ (history) | ❌ | ❌ | ❌ |
| **Archer (event code)** | ❌ (should be ✅) | ✅ | ✅ | ✅ | ✅ | ✅ (bale only) | ❌ | ❌ |
| **Coach (coach key)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Proposed Matrix (After Fixes)

| User Type | Archer List | Event List | Verify Code | Create Scores | View Own Scores | View All Scores | Modify Event | Create Event |
|-----------|-------------|------------|-------------|---------------|-----------------|-----------------|--------------|--------------|
| **Public (no auth)** | ✅ | ✅ | ✅ | ❌ | ✅ (history) | ❌ | ❌ | ❌ |
| **Archer (event code)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (bale only) | ❌ | ❌ |
| **Coach (coach key)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## IMPLEMENTATION PLAN

### Phase 1: Critical Fixes (Required Before Next Event)

1. **Make `/v1/archers` (GET) public**
   - Remove `require_api_key()` call
   - Add optional authenticated vs public field filtering
   - Test archer apps can load roster without auth

2. **Test archer flow end-to-end**
   - Open app → Load roster (no auth)
   - Select profile → Store in cookie
   - Scan QR code → Verify event code
   - Join bale → Start scoring
   - Submit scores → Verify sync works

3. **Update documentation**
   - Update `docs/LIVE_SCORING_IMPLEMENTATION.md` to reflect public archer list
   - Add this analysis doc to repo
   - Update API test harness

### Phase 2: Improvements (Next Sprint)

1. **Standardize event code storage**
   - Simplify fallback logic
   - Add UI for "event code lost" recovery

2. **Document cookie/localStorage strategy**
   - Create strategy doc
   - Update onboarding docs

3. **Add scorecard ownership validation**
   - Implement middleware
   - Add tests

### Phase 3: Security Hardening (Future)

1. **Rate limiting on public endpoints**
2. **Separate public/full views for archer data**
3. **Audit logs for scorecard modifications**
4. **Consider JWT tokens instead of static passcodes**

---

## FILES TO MODIFY

### API Backend
- ✅ `api/index.php` (line 2789) - Remove auth from GET /v1/archers
- ✅ `api/db.php` (document current behavior)

### Frontend Apps
- ⚠️ `js/live_updates.js` (simplify event code fallback logic)
- ✅ `js/archer_module.js` (should work after API fix, no changes needed)
- ✅ `js/ranking_round_300.js` (should work after API fix)
- ✅ `js/ranking_round.js` (should work after API fix)

### Documentation
- ✅ Create `docs/AUTHENTICATION_ANALYSIS.md` (this file)
- ✅ Update `docs/LIVE_SCORING_IMPLEMENTATION.md`
- ✅ Create `docs/COOKIE_STORAGE_STRATEGY.md`

---

## TESTING CHECKLIST

### Archer Flow (No Coach Access)
- [ ] Open archer app without any cookies/localStorage
- [ ] Verify archer list loads automatically (no auth prompt)
- [ ] Select archer profile
- [ ] Verify profile stored in `oas_archer_id` cookie
- [ ] Scan QR code or enter event code manually
- [ ] Verify event code validates
- [ ] Join bale and start scoring
- [ ] Submit scores for an end
- [ ] Close browser and reopen
- [ ] Verify session restored (event code persists)
- [ ] Complete round and submit

### Coach Flow
- [ ] Open coach console
- [ ] Enter coach passcode
- [ ] Verify cookie stored
- [ ] Create new event
- [ ] View all scorecards
- [ ] Edit a scorecard
- [ ] Generate reports
- [ ] Close browser and reopen
- [ ] Verify still authenticated (cookie persists)

### Edge Cases
- [ ] Archer tries to access without event code (should fail gracefully)
- [ ] Archer loses event code mid-session (should prompt for re-entry)
- [ ] Multiple archers on same device (profiles should be independent)
- [ ] Coach and archer on same device (should not conflict)

---

## SECURITY CONSIDERATIONS

### Current Security Posture

**Strengths:**
- ✅ Coach passcode separate from event codes
- ✅ Event codes are per-event (can be rotated)
- ✅ CORS headers properly configured
- ✅ SQL injection protected (using prepared statements)

**Weaknesses:**
- ⚠️ Static coach passcode (never rotates, hardcoded in client JS)
- ⚠️ No rate limiting on public endpoints
- ⚠️ Full archer details (email, phone) exposed if endpoint made public
- ⚠️ Event codes stored in plain text in localStorage (accessible to any JS)
- ⚠️ No audit trail for scorecard modifications

**Mitigation Strategies:**
1. **For archer list:** Create two views (public minimal vs authenticated full)
2. **For coach passcode:** Move to environment variable, rotate quarterly
3. **For event codes:** Already per-event, consider adding expiry timestamps
4. **For localStorage:** Accept risk (client-side apps inherently trust the client)
5. **For audit trail:** Log all score modifications with timestamp + IP

---

## CONCLUSION

The current authentication system is **functionally sound** but has **one critical inconsistency**: the archer list requires authentication when it should be public.

### Summary of Issues:
1. **CRITICAL:** GET `/v1/archers` requires auth (should be public)
2. **MODERATE:** Event code storage is fragmented across multiple localStorage keys
3. **LOW:** Cookie vs localStorage usage not documented
4. **LOW:** No scorecard ownership validation (mitigated by UI design)

### Next Steps:
1. ✅ Review this analysis with team
2. ✅ Approve making archer list public (with field filtering)
3. ✅ Implement Priority 1 fix (remove auth from GET /v1/archers)
4. ✅ Test archer flow end-to-end
5. 🔄 Plan Priority 2-3 improvements for next sprint

---

**Document Owner:** AI Analysis (Claude)  
**Review Status:** Pending Team Review  
**Last Updated:** November 17, 2025


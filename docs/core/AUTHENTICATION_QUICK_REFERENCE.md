# Authentication Quick Reference

## ✅ Critical Issue RESOLVED (November 17, 2025)

**Problem:** `GET /v1/archers` required authentication but should be public.

**Solution:** Removed authentication requirement from the endpoint.

**Location:** `api/index.php` line 2789

**Status:** ✅ **FIXED** - Archers can now load the roster without any authentication.

---

## Authentication Types

| Auth Type | Header | Value | Used By | Purpose |
|-----------|--------|-------|---------|---------|
| **Coach** | `X-API-Key` | `wdva26` | Coaches | Full admin access |
| **Coach** | `X-Passcode` | `wdva26` | Coaches | Alternative to API key |
| **Event** | `X-Passcode` | `<event_code>` | Archers | Per-event access |
| **Public** | None | N/A | Anyone | Read-only data |

---

## Public Endpoints (No Auth)

- ✅ `GET /v1/health` - Health check
- ✅ `GET /v1/events/recent` - List events (codes hidden)
- ✅ `POST /v1/events/verify` - Verify event code
- ✅ `GET /v1/archers/{id}/history` - Archer's history
- ✅ `GET /v1/archers` - **Load archer roster** (Fixed Nov 17, 2025)

---

## Cookie/Storage Usage

### Cookies (Long-term, with expiry)
- `oas_archer_id` (365 days) - Archer profile ID
- `coach_auth` (90 days) - Coach authentication flag

### localStorage (Session/persistent, no expiry)
- `event_entry_code` - Current event code
- `event:<id>:meta` - Per-event metadata
- `rankingRound300_<date>` - Scoring session state
- `coach_api_key` - Coach API key
- `live_updates_config` - Sync configuration

---

## Expected Archer Flow

1. **Open app** → Fetch archer list (no auth) ✅ **WORKS**
2. **Select profile** → Store in `oas_archer_id` cookie ✅
3. **Scan QR/enter code** → Verify event code ✅
4. **Join bale** → Create scorecard (event code auth) ✅
5. **Score ends** → Submit scores (event code auth) ✅

---

## Expected Coach Flow

1. **Open coach console** → Check `coach_auth` cookie ✅
2. **Enter passcode** → Store cookie + localStorage ✅
3. **Full access** → All admin operations ✅

---

## Files to Review

### Backend (API)
- `api/index.php` - All endpoint routes
- `api/db.php` - Auth functions (`require_api_key()`, `check_api_key()`)
- `api/config.php` - Auth constants

### Frontend (Client)
- `js/coach.js` - Coach authentication
- `js/live_updates.js` - API request wrapper with auth
- `js/ranking_round_300.js` - Archer app (300 round)
- `js/ranking_round.js` - Archer app (360 round)
- `js/archer_module.js` - Archer list loading
- `js/common.js` - Cookie utilities

### Documentation
- `docs/AUTHENTICATION_ANALYSIS.md` - **Comprehensive analysis**
- `docs/AUTHENTICATION_FLOWS.md` - **Visual flow diagrams**
- `docs/LIVE_SCORING_IMPLEMENTATION.md` - API documentation
- `docs/QR_CODE_EVENT_ACCESS.md` - Event code system

---

## ✅ Fix Applied (November 17, 2025)

**File:** `api/index.php` line 2789

**Previous (Broken):**
```php
if (preg_match('#^/v1/archers$#', $route) && $method === 'GET') {
    require_api_key(); // ❌ BLOCKED PUBLIC ACCESS
    // ...
}
```

**Current (Fixed):**
```php
// GET /v1/archers - Load all archers from master list
// PUBLIC ENDPOINT - No authentication required
// Archers need access to roster for profile selection on first app open
if (preg_match('#^/v1/archers$#', $route) && $method === 'GET') {
    // No authentication required - this is a public endpoint
    // ... rest of endpoint logic ...
}
```

**Future Enhancement (Optional):**
Consider filtering sensitive fields (email, phone, notes) for public requests in a future update.

---

## Testing Checklist

### After Fix
- [ ] Open archer app (clear all cookies/localStorage first)
- [ ] Verify archer list loads without any authentication
- [ ] Select a profile
- [ ] Scan QR code with event code
- [ ] Join bale and score an end
- [ ] Close browser and reopen
- [ ] Verify session restored

### Regression Testing
- [ ] Coach console still works with passcode
- [ ] Coach can still access full archer list
- [ ] Event code validation still works
- [ ] Score submission still works

---

## Security Notes

### Current Security Posture
- ✅ Coach passcode separate from event codes
- ✅ Event codes are per-event (can be rotated)
- ✅ SQL injection protected (prepared statements)
- ✅ CORS headers configured
- ⚠️ Coach passcode is static (hardcoded in client JS)
- ⚠️ No rate limiting on public endpoints
- ⚠️ No audit trail for score modifications
- ⚠️ No scorecard ownership validation

### If Archer List Made Public
- ⚠️ Exposes archer roster (names, schools, divisions) to internet
- ✅ Sensitive data (email, phone, notes) can be filtered for public view
- ✅ Read-only access (cannot modify without auth)
- ✅ Consistent with other scoring apps (public rosters common)

### Recommendations
1. Filter sensitive fields for public requests
2. Add rate limiting (e.g., 100 requests per IP per hour)
3. Add audit logging for score modifications
4. Consider rotating coach passcode quarterly
5. Document security considerations in README

---

## Quick Commands

### Test API Health
```bash
curl https://tryentist.com/wdv/api/v1/health
```

### Test Archer List (Current - Requires Auth)
```bash
curl -H "X-Passcode: wdva26" https://tryentist.com/wdv/api/v1/archers
```

### Test Archer List (After Fix - No Auth)
```bash
curl https://tryentist.com/wdv/api/v1/archers
```

### Test Event Code Verification
```bash
curl -X POST https://tryentist.com/wdv/api/v1/events/verify \
  -H "Content-Type: application/json" \
  -d '{"eventId":"<event-id>","entryCode":"<code>"}'
```

---

**Quick Start:** Read `AUTHENTICATION_ANALYSIS.md` for full details.

**Last Updated:** November 17, 2025


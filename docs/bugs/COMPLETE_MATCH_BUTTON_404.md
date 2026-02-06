# Complete Match Button 404 (Solo & Team)

**Date:** 2026-02-03  
**Page/Module:** `solo_card.html` (Solo Match), `team_card.html` (Team Match)  
**Severity:** High (blocks completing matches on local dev)  
**Status:** ✅ Fixed  

---

## 🐛 Bug Description

**What's broken:**  
Clicking **"✓ Complete Match"** in the Complete Match modal triggers a PATCH to update match status. On local dev (`php -S localhost:8001`), the request goes to `api/v1/solo-matches/{id}/status` (or `api/v1/team-matches/{id}/status`), which returns **404 (Not Found)**. The same environment issue affects events/recent and other direct `api/v1/...` fetches in these pages.

**User impact:**  
- Match cannot be marked complete; user sees "Failed to mark match as complete: HTTP 404".  
- Events dropdown may show "Events require authentication - standalone mode only" and fail to load recent events.  
- Any feature that uses a hardcoded `api/v1/...` path on these pages will 404 under the PHP built-in server.

**DOM / UI:**  
- **Button:** `button#complete-match-confirm-btn` in `div#complete-match-modal`  
- **Position (example):** top=384px, left=166px, 194×44px  

---

## 🔍 Steps to Reproduce

1. Run local dev server: `npm run serve` (or `php -S localhost:8001`).
2. Open Solo Match: `http://localhost:8001/solo_card.html`.
3. Load or create a match, finish scoring so "Complete" is enabled.
4. Click **"✓ Complete"** → modal opens → click **"✓ Complete Match"**.
5. Console shows:  
   `PATCH http://localhost:8001/api/v1/solo-matches/{id}/status 404 (Not Found)`  
   and: `[completeMatch] Failed: Error: HTTP 404`.

---

## 🔍 Root Cause

**Environment:**  
The PHP built-in server only routes requests that hit `api/index.php`. Requests to `api/v1/...` are treated as static file paths; no file exists, so the server returns 404.

**Code:**  
`solo_card.js` and `team_card.js` use **hardcoded** `api/v1/...` URLs for several `fetch()` calls instead of using the same API base as `live_updates.js` (which correctly uses `api/index.php/v1` on localhost).  

- **Complete Match:** `fetch(\`api/v1/solo-matches/${state.matchId}/status\`, { method: 'PATCH', ... })`  
- **Events:** `fetch('api/v1/events/recent')`, `fetch(\`api/v1/events/${eventId}/brackets\`)`  
- **Solo:** event snapshot, brackets, bracket entries, archer-assignment, archer search.  
- **Team:** same pattern for status PATCH and events.

So this is the **same class of bug** as the index.html home page 404s: relative `api/v1` paths that never reach the PHP router on local dev.

---

## ✅ Solution

1. **Use a local API base** in `solo_card.js` and `team_card.js` that matches `live_updates.js`:  
   - On `localhost` / `127.0.0.1`:  
     `${protocol}//${hostname}:${port}/api/index.php/v1`  
   - Otherwise: `https://archery.tryentist.com/api/v1`
2. **Replace every** `api/v1/...` **fetch** in these files with `${getApiBase()}/...` (or equivalent) so all requests use the correct base on localhost and in production.

See also: `docs/bugs/INDEX_HOME_PAGE_ERRORS.md` (same root cause, fix applied to `index.html`).

---

## 🧪 Testing Plan

1. **Solo:** Local dev → open solo_card → complete a match → "✓ Complete Match" → no 404; match marked complete.  
2. **Team:** Same for team_card "Complete Match".  
3. **Events:** Solo/team setup → Events dropdown loads (or fails with auth, not 404).  
4. **Production:** Deploy and confirm complete match and events still work (production uses `https://archery.tryentist.com/api/v1`).

---

## 📋 Implementation Checklist

- [x] Add `getApiBase()` (or use LiveUpdates config) in `solo_card.js`
- [x] Replace all `api/v1/...` fetches in `solo_card.js` with API base
- [x] Add `getApiBase()` in `team_card.js`
- [x] Replace all `api/v1/...` fetches in `team_card.js` with API base
- [ ] Manual test: Complete Match (solo and team) on localhost
- [x] Code review: No other app JS files use raw `api/v1/...` in fetch (index.html fixed separately)

---

## Related

- **INDEX_HOME_PAGE_ERRORS.md** — Same 404 cause on index.html; fixed by using `api/index.php/v1` there.  
- **live_updates.js** — Already uses `api/index.php/v1` on localhost; solo/team should align.

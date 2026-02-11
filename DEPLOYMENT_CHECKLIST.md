# Deployment Checklist - Live Scoring Release

## Pre-Deployment Verification

### 1. API Test Harness ✅
- [ ] **Prod:** Open `https://archery.tryentist.com/api/test_harness.html`
- [ ] **Local:** Open `http://localhost:8001/api/test_harness.html` (with `npm run serve`)
- [ ] Toggle to "Use Event Code"
- [ ] Run Test 1: Health Check → ✅ 200 OK
- [ ] Run Test 6: Full Workflow → ✅ All steps pass

### 2. Local Tests ✅
```bash
# Setup sections tests
npm run test:setup-sections
# Expected: 42/42 passed

# Main ranking round tests  
npm run test:ranking-round
# Expected: Most pass (3 QR code tests may need event setup)

# API tests (CRITICAL for field validation)
npm run test:api:archers
# Expected: All archer endpoint tests pass, including self-update

# Field completeness check (if available)
npm run test:api:all
# Expected: No missing field errors
```

### 3. API Field Validation (CRITICAL)
- [ ] Run self-update endpoint tests: `npm run test:api:archers`
- [ ] Verify all fields are tested (shirtSize, pantSize, hatSize, etc.)
- [ ] Check for field completeness warnings
- [ ] Verify persistence tests pass (update → refresh → verify)

### 4. Manual Smoke Test
- [ ] Coach creates event with entry code
- [ ] Coach adds archers to event
- [ ] Coach generates QR code
- [ ] Open QR URL in incognito/different browser
- [ ] Pre-assigned bale list shown
- [ ] Click "Start Scoring" on Bale 1
- [ ] Enter scores: 10, 9, 8
- [ ] Click "Sync End"
- [ ] Open `results.html?event={id}` → Score shows (27)
- [ ] **NEW:** Test field persistence (update shirt size → refresh → verify)

### 4. Code Quality
- [ ] No console errors on key pages
- [ ] No lint errors (if linter configured)
- [ ] Changes committed to git
- [ ] Branch: `main` up to date (merge feature/fix branch before deploy)

## Deployment Steps

### 1. Deploy Files

**Deploy source:** Backup, verify, and FTP upload all use one folder. The script prints `Deploy source: <path>` at start.

- **Default:** Uses `LOCAL_DIR` in the script (`/Users/terry/web-mirrors/tryentist/wdv`). If that folder is empty or out of date, set the folder you want to deploy:
- **From this repo (e.g. Cursor):**  
  `WDV_DEPLOY_SOURCE=/Users/terry/makeitso/wdv npm run deploy:fast`
- **From other machine's copy (mounted):**  
  `WDV_DEPLOY_SOURCE=/Volumes/terry/web-mirrors/tryentist/wdv npm run deploy:fast`

Run from any directory; the script reads `.env` and files from the deploy source.

```bash
# From the folder you want to deploy (e.g. mirror or repo):
cd /Users/terry/web-mirrors/tryentist/wdv
npm run deploy:fast

# Or from this repo with explicit source:
WDV_DEPLOY_SOURCE=/Users/terry/makeitso/wdv npm run deploy:fast
```

**What gets deployed:**
- `api/` - Backend PHP files (except `api/config.local.php` — never deployed; prod credentials live only on the server)
- `js/` - Frontend JavaScript
- `*.html` - All HTML pages
- `css/` - Stylesheets
- Cloudflare cache purged automatically

### 2. Verify Production

**API Sanity Check:**
- [ ] https://archery.tryentist.com/api/v1/health → `{"ok":true}`
- [ ] https://archery.tryentist.com/api/test_harness.html → Opens correctly

**Frontend Check:**
- [ ] https://archery.tryentist.com/ (index.html) → Loads, archer list loads
- [ ] https://archery.tryentist.com/coach.html → Loads, can log in
- [ ] https://archery.tryentist.com/ranking_round_300.html → Loads, modal shows
- [ ] https://archery.tryentist.com/results.html → Loads (even without event param)
- [ ] Solo/Team “Complete Match” → No 404 (optional smoke test)

**Full Flow (Live on Production):**
1. Coach creates event: "Prod Test {timestamp}"
2. Entry code: `PRODTEST`
3. Add 4 archers (select from list)
4. Get QR code URL
5. Open QR URL on different device/browser
6. Should see pre-assigned bale with 4 archers
7. Click "Start Scoring"
8. Enable Live toggle (if not already on)
9. Enter scores for all 4 archers End 1
10. Click "Sync End"
11. Open results page → All 4 archers show with End 1 scores
12. Close and reopen scoring page → Should resume at End 1

### 3. Monitor

**Watch for:**
- JavaScript console errors on client devices
- PHP errors in server logs
- 401 Unauthorized responses (auth issues)
- Failed /rounds or /archers POST requests
- Offline queue not flushing

**Common Issues:**
| Issue | Cause | Fix |
|-------|-------|-----|
| 401 on archer sync | Entry code not in localStorage | Coach needs to regenerate QR, or manually set in console |
| Scores don't sync | Live toggle off | Enable in scoring view |
| Leaderboard empty | Event ID mismatch | Verify URL param matches event.id |
| Double scores | Multiple devices on same bale | Coordinate which device syncs |

## Post-Deployment

### 1. Notify Users
- [ ] Send event link with entry code
- [ ] Instructions: "Scan QR or enter code manually"
- [ ] Remind: One device per bale for scoring

### 2. Live Support
- [ ] Monitor results page during event
- [ ] Check for stuck archers (no score updates)
- [ ] Have reset capability ready if needed

### 3. Data Backup
```bash
# Backup event data after completion
mysqldump -u wdv_user -p wdv events rounds round_archers end_events > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Rollback Plan

If critical issues occur:

1. **Quick Fix Available:**
   - Fix code locally
   - Test with `npm run test:setup-sections`
   - Deploy: `npm run deploy:fast`
   - Verify fix on production

2. **Need Full Rollback:**
   ```bash
   git log --oneline -10  # Find last good commit
   git checkout {commit-hash}
   npm run deploy:fast
   # Then return to current branch
   git checkout Development
   ```

3. **Emergency Offline Mode:**
   - Disable Live Updates via coach console
   - Archers continue scoring offline
   - Manually import CSV exports post-event

## Success Criteria

✅ **Deployment Successful If:**
- Health endpoint responds 200
- Coach can create events with entry codes
- QR codes work and bypass modal
- Archers can sync scores with event code
- Leaderboard updates within 15 seconds
- No 401/500 errors in normal flow
- Offline queue works (test by toggling network)

## Contact

**If Issues Arise:**
1. Check browser console on client device
2. Check Network tab for failed requests
3. Check server error logs
4. Review `docs/LIVE_SCORING_IMPLEMENTATION.md` troubleshooting section
5. Use API test harness to isolate backend vs frontend issues

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Git Commit:** _____________  
**Production URL:** https://archery.tryentist.com/


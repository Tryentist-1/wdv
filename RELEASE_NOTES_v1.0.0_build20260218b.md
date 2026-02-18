# Release Notes — Build 20260218b

**Date:** 2026-02-18  
**Version:** 1.0.0 (Build 20260218b)

---

## Summary

This release fixes three bugs discovered during LA Games Test 5 event management:

1. **Team Dashboard SQL Error** — 500 errors when loading team bracket results on the Event Dashboard.
2. **Verification Radio Buttons** — Match type selectors (Ranking / Solo / Teams) required a page reload to become interactive.
3. **Team Score Sync** — Team match scores showed as "0-0" on summary views (dashboard, leaderboard, verification list) even though the full scorecard had correct data.

---

## Bug Fixes

### Team Bracket Results — SQL Error (Critical)
- **Problem:** `GET /v1/brackets/:id/results` returned HTTP 500 for TEAM Swiss brackets.
- **Error:** `Expression #2 of ORDER BY clause is not in SELECT list, references column 'wdv.tmt.team_name' which is not in SELECT list; this is incompatible with DISTINCT`
- **Fix:** Added `tmt.team_name` to the `SELECT DISTINCT` clause in the roster query inside the bracket results endpoint (`api/index.php` ~line 8852).
- **Impact:** Team brackets now load correctly on the Event Dashboard and bracket results page.

### Verification Modal — Radio Buttons Not Responding (High)
- **Problem:** Clicking "Solo" or "Teams" radio buttons in the Verify Scorecards modal had no effect until the page was reloaded. Particularly painful on mobile.
- **Root Cause:** The `onclick` inline handlers in `coach.html` called `window.setVerifyMatchType()`, but the function was not yet assigned to `window` when the modal first opened (timing issue).
- **Fix:** Added explicit `radio.onchange` event listener attachment inside `verifyEvent()` in `js/coach.js`, ensuring handlers are re-bound every time the modal opens.
- **Impact:** Radio buttons now respond immediately on first open, no reload required.

### Team Match Scores — 0-0 on Summary Views (High)
- **Problem:** Team match scores appeared as "0-0" on the Event Dashboard, Bracket Results leaderboard, and Verification list, even though the team card showed the correct scores.
- **Root Cause:** The `POST /v1/team-matches/:id/teams/:teamId/archers/:archerId/sets` endpoint saved set scores per archer but did not:
  1. Sync `set_total`, `set_points`, and `running_points` across all archers in the team for that set.
  2. Update the aggregate `sets_won` field on the `team_match_teams` record.
  Summary views queried `team_match_teams.sets_won` (always 0) rather than recalculating from raw set data.
- **Fix:**
  - After saving a set, the endpoint now syncs `set_total`, `set_points`, `running_points` to ALL archers in the team for that set number.
  - Recalculates and writes `sets_won` to `team_match_teams` on every save.
  - Ran a one-time data repair script to fix existing match records.
- **Impact:** Team match scores now display correctly across all views.

---

## Files Changed

| File | Changes |
|------|---------|
| `api/index.php` | Fixed DISTINCT/ORDER BY SQL error in bracket results roster query; added team score sync and `sets_won` recalculation in set-save endpoint. |
| `js/coach.js` | Added explicit `onchange` event listeners for verification type radio buttons inside `verifyEvent()`. |

---

## Data Repair

A one-time PHP script (`repair_team_scores.php`, now deleted) was run to back-fill correct `sets_won` values for existing team matches. The affected match (ID `23089dd3-fc88-4a19-82e0-5ff29821cd41`) now correctly shows **5-1**.

---

## Testing

- Verified team bracket results load without 500 errors on Event Dashboard.
- Verified "Teams" radio button responds immediately on first modal open (no reload).
- Verified team match score displays as 5-1 on bracket results, leaderboard, and verification list.
- Verified completed team match appears in Coach Console verification list as "READY TO VERIFY".

---

## Developer Notes

### PHP Opcode Cache
After editing PHP files, restart PHP-FPM to clear the opcode cache:
```bash
docker compose restart php
```

### Docker MySQL Access
```bash
docker exec -it wdv-mysql mysql -u wdv_user -pwdv_dev_password wdv
```

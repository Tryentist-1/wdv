# Release Notes — v1.0.2 (build 20260301)

**Date:** March 1, 2026  
**Branch:** `bugfix/team-match-editing-and-swapping` → `main`  
**Deploy:** `WDV_DEPLOY_SOURCE=/Users/terry/makeitso/wdv npm run deploy:fast`  
**DB Changes:** None — application-layer only

---

## ✅ What's New

### 1. Coach Roster Editing & Pre-Match Swapping
*Commit: `a9bd0b6`*

Coaches can now edit team match rosters **before the match starts**.

- **Coach Mode:** Adding `?mode=coach` to a team match URL unlocks editing without affecting live scoring.
- **Lock/Unlock Bypass:** `team_card.js` respects `isCoachMode` to allow edits while the match is in a pre-start `PENDING` state.
- **Save Edits Button:** The "Complete" button is replaced by "Save Edits" in coach mode, calling the `/verify` endpoint to persist changes.
- **Roster Resizing:** Coaches can reduce a team from 3 → 2 archers before the match starts via the new `DELETE /v1/team-matches/:id/teams/:tid/archers/:pos` endpoint.
- **Pre-Generated Match Setup:** Fixed a bug where the setup view was skipped for `PENDING` pre-generated matches.

**Files changed:** `api/index.php`, `js/team_card.js`, `js/coach.js`, `js/live_updates.js`

---

### 2. Swiss Tie-Breakers & Compass Format
*Commit: `4f84d8b`*

- **Tie-Breaker Logic:** `update_bracket_standings` now correctly falls back to the **shoot-off winner** when bracket points are tied, removing ambiguous tie outcomes from Swiss standings.
- **Seeded Pairings:** `seed_position` is now included in the Swiss bracket generation `ORDER BY` clause for fairer initial-round distribution.
- **Compass Format Support:** `COMPASS` is now treated as equivalent to `SWISS`/`ELIM` throughout the API and UI routing logic.
- **Compass Part Router:** New `api/index_compass_part.php` strictly maps Winners/Losers paths for R2 and R3 of an 8-participant Compass draw.

**Files changed:** `api/index.php`, `api/index_compass_part.php` *(new)*, `api/index_swiss_part.php`, `js/coach.js`, `js/solo_card.js`, `js/team_card.js`

---

### 3. Tiebreaker Score Fix (+1 Point to Winner)
*Commit: `63a016f`*

Fixed an edge case where tiebreaker matches did not properly award the winner's final match score.

- **Client-side:** `solo_card.js` and `team_card.js` now increment the winner's match score by +1 when a shoot-off resolves the match (results in a correct `6-5` solo or `5-4` team final).
- **Server-side:** The `/verify` endpoint in `api/index.php` now hardcodes the evaluated score to `6` (solo) or `5` (team) when a tiebreaker winner is resolved, ensuring proper server-side match completion.

**Files changed:** `api/index.php`, `js/solo_card.js`, `js/team_card.js`

---

## 🚫 No Database Changes Required

All changes are application-layer only. No `ALTER TABLE`, `ADD COLUMN`, or migration scripts are needed on the production database.

---

## 🔍 Post-Deploy Verification

```bash
# Health check
curl https://archery.tryentist.com/api/v1/health

# Smoke test: open coach console and verify team match edit flow
open https://archery.tryentist.com/coach.html
```

Key flows to verify manually:
- Team match scorecard in `?mode=coach` shows **Save Edits** button
- Swiss bracket tie scenario resolves to correct winner
- Completed tiebreaker solo/team match shows `6-5` / `5-4` final score

---

*Previous release: [v1.0.1 / build 20260221](RELEASE_NOTES_v1.0.1_build20260221.md)*

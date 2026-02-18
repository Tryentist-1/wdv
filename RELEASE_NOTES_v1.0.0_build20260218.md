# Release Notes — Build 20260218

**Date:** 2026-02-18  
**Version:** 1.0.0 (Build 20260218013500)

---

## Summary

This release fixes several solo match scoring display and editing issues across the scorecard editor, history views, bracket results, and the backend API. All solo match set-point scores are now consistently capped at 6 (the maximum in set-system archery), unscored rounds display correctly, and the scorecard editor now supports inline score editing for solo matches.

---

## Bug Fixes

### Solo Match Score Display (Backend + Frontend)
- **Scores exceeding 6-point limit** — Matches previously showed totals like "8-2" because sets were scored even after a winner was determined. All APIs and frontend views now stop accumulating set points once a player reaches 6.
- **Unscored rounds showing "1"** — `calculateSetPoints(0, 0)` returned a tie (1-1) for empty sets. Added a guard so unscored sets display as blank.
- **API field name mismatch** — Frontend code sometimes used `arrow1`/`arrow2`/`arrow3` while the API returned `a1`/`a2`/`a3`. Standardized to `a1`/`a2`/`a3`.

### Bracket Results Page
- **"Total" column showed arrow sum instead of match score** — In Swiss format, the Total column incorrectly displayed the sum of all arrow scores (e.g., 111) instead of the set-point match total (e.g., 6). Now uses `sets_won` (capped at 6).
- **"Tgt" column was hardcoded** — Target assignments were hardcoded as "15A"/"16A". Now pulls the actual `target_assignment` from the match data.

### Scorecard Editor — Solo Match Editing ✨
- **Arrow scores were not editable after unlock** — Unlocking a solo match scorecard did not make arrow scores interactive (unlike ranking rounds). **New feature:** Arrow cells are now clickable when unlocked, opening the same score-entry modal used by ranking rounds. Scores are saved to the backend via the existing API in real-time.

### Swiss Bracket Scoring Update
- **SOLO Scoring now 1 point per win** — Changed the SOLO Swiss scoring formula from `wins - losses` to `wins` (1 point per win, 0 for loss). This eliminates negative points on the leaderboard and aligns SOLO scoring with the existing TEAM scoring logic. Rankings and matchmaking remain effectively unchanged.
- **Set Points Synchronization** — Fixed a bug where entering a score for one archer did not update the opponent's set points (Win/Loss/Tie) if the opponent's score was already entered. Now forces recalculation for both archers on every save.

### Archer Window — Recent Activity & Team Match Navigation
- **Recent Activity hidden for archers with no open assignments** — `renderRecentActivity()` was called *after* an early-return guard that fired when an archer had no active rounds. Archers who had completed all their work (e.g. post-event) never saw their recent history. Fixed by moving the call before the early return.
- **Stale Recent Activity when switching archers** — Switching from an archer with assignments to one without left the previous archer's Recent Activity cards visible. Fixed automatically as part of the above change.
- **Team match deep-link shows Setup view instead of Scoring view** — `team_card.js` required exactly 3 archers per side before restoring the scoring view from a `?match=UUID` URL. Dev/test matches with 1 or 2 archers per side could never restore. Relaxed to `team1.length > 0 && team1.length === team2.length`.

---

## Files Changed

| File | Changes |
|------|---------|
| `api/index.php` | Cap-at-6 logic in history, solo-matches listing, match completion, bracket results. Added `target_assignment`, `sets_won`, `total_score` to bracket results API. |
| `js/solo_match_view.js` | Cap-at-6 accumulation, unscored-set guard, corrected field names (`a1`/`a2`). |
| `scorecard_editor.html` | Cap-at-6 display, "Match Score" label, **new solo match editing functions** (`editSoloScore`, `setSoloScore`, `saveSoloSetScore`). |
| `bracket_results.html` | Use `sets_won` for Total column, `target_assignment` for Tgt column. |
| `version.json` | Build timestamp updated. |

---

## Developer Notes

### PHP Opcode Cache
After editing PHP files, **always restart PHP-FPM** to clear the opcode cache:
```bash
docker compose restart php
```
If API responses still return old data after code changes, this is the cause.

### Docker MySQL Access
```bash
# Interactive shell
docker exec -it wdv-mysql mysql -u wdv_user -pwdv_dev_password wdv

# Single query
docker exec wdv-mysql mysql -u wdv_user -pwdv_dev_password wdv -e "SELECT ..."
```

---

## Testing

- Verified all solo match score displays across: scorecard editor, archer history, solo match view, bracket results
- Confirmed scorecard editing flow: unlock → click arrow cell → score modal → save to API
- Verified cap-at-6 logic for completed matches with 4+ sets

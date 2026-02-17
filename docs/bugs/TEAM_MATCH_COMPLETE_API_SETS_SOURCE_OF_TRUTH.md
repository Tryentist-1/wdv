# Team Match "Mark Complete" Rejected Despite Match Over

**Date:** 2026-02-16  
**Status:** Fixed  
**Branch:** `fix/team-card-complete-and-ux`

## Problem

User saw "Match Over: Team 2 Wins" on the team scorecard but when tapping **Complete**, the API returned:

```text
Match is not complete. Winner must be determined before marking as complete.
```

## Root Cause

`PATCH /v1/team-matches/:id/status` (when setting `cardStatus: 'COMP'`) validated completion by reading **`team_match_teams.sets_won`** and **`team_matches.winner_team_id`**. Those fields are **never updated** when set scores are posted. Set scores are written only to **`team_match_sets`** (per-archer, per-set rows with `set_points`, `running_points`). So the API always saw `sets_won` as 0 and no winner, and rejected the request.

## Fix

Completion is now derived from **`team_match_sets`** (source of truth):

1. **Normal completion:** `MAX(running_points)` per team over sets 1–4. If any team has ≥ 5, the match is complete.
2. **Shoot-off (4–4):** If both teams have 4 points, completion is allowed when set 5 (shoot-off) has both teams’ totals present and different, or when `team_matches.shoot_off_winner` is set.
3. **Fallback:** Still checks `team_match_teams.sets_won` and `team_matches.winner_team_id` for legacy/alternative data.

**File:** `api/index.php` — block for `PATCH /v1/team-matches/:id/status` when `$newStatus === 'COMP'`.

## Related

- [TEAM_MATCH_MARK_COMPLETE_ANALYSIS.md](../analysis/TEAM_MATCH_MARK_COMPLETE_ANALYSIS.md) — overall Mark Complete analysis; validation now uses `team_match_sets` as above.

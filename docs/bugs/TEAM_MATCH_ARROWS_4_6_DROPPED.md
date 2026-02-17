# Bug: Team Match Arrows 4-6 Dropped on Save/Reload

## Status: FIXED (2026-02-16)

## Symptom

When scoring a team match, only 3 of the 6 arrows per team were persisted. After entering all 6 arrows (A1-A6) and refreshing, only the first 3 appeared. Multiple devices exhibited the same behavior, confirming a server-side issue rather than a client caching problem.

## Root Cause

Three interlocking bugs in the team match scoring pipeline:

### 1. Wrong archer index mapping (`js/team_card.js` line 884)

```javascript
// BUG: arrow index (0-5) used directly as archer index
const archerIndex = parseInt(arrow, 10);
```

With 3 archers (indices 0-2) and `ARROWS_PER_ARCHER = 2`, the correct mapping is:
- Arrows 0-1 -> Archer 0
- Arrows 2-3 -> Archer 1
- Arrows 4-5 -> Archer 2

But the buggy code mapped arrow 3 -> archer 3, arrow 4 -> archer 4, arrow 5 -> archer 5. Since `state.matchArcherIds[team]` only had keys 0, 1, 2, arrows 3-5 resolved to `undefined` and were **silently skipped** by the `if (matchArcherId)` guard.

### 2. Missing `a2` column in `team_match_sets`

The database schema only had `a1 VARCHAR(3)` with the comment "1 arrow per archer per set." In Team Olympic Round rules, each archer shoots **2** arrows per set. Compare with `solo_match_sets` which correctly has `a1`, `a2`, `a3`.

### 3. Only `a1` sent and stored

Both `LiveUpdates.postTeamSet()` and the API `POST /team-matches/:id/teams/:teamId/archers/:archerId/sets` only sent/accepted the `a1` field. Even if the archer index had been correct, the second arrow would have been lost.

## Fix

### Files Changed

| File | Change |
|------|--------|
| `api/sql/migration_team_match_sets_add_a2.sql` | New migration: adds `a2` column to `team_match_sets` |
| `api/sql/migration_phase2_solo_team_matches.sql` | Updated schema definition to include `a2` and corrected comments |
| `api/index.php` | POST endpoint now accepts/stores `a2` in INSERT and UPDATE |
| `js/live_updates.js` | `postTeamSet()` includes `a2` in request body |
| `js/team_card.js` | Fixed archer index: `Math.floor(arrowIdx / ARROWS_PER_ARCHER)`. Sends both `a1` and `a2` per archer. Tens/Xs counted across both arrows. |

### Hydration (no change needed)

The hydration code in `hydrateTeamMatch()` already expected `a2`:
```javascript
const arrowStartIdx = archIdx * ARROWS_PER_ARCHER;
if (set.a1) state.scores.t1[setIdx][arrowStartIdx] = set.a1;
if (set.a2) state.scores.t1[setIdx][arrowStartIdx + 1] = set.a2;
```
It just never had data because the column didn't exist. Once the migration runs, hydration works correctly.

### Migration SQL (run on both dev and prod)

```sql
ALTER TABLE team_match_sets
  ADD COLUMN a2 VARCHAR(3) COMMENT 'Arrow 2 score (2 arrows per archer per set)' AFTER a1;

ALTER TABLE team_match_sets
  MODIFY COLUMN a1 VARCHAR(3) COMMENT 'Arrow 1 score (2 arrows per archer per set)';
```

## Data Impact

Existing `team_match_sets` rows from before the fix have misassigned arrow data due to the old mapping bug:
- Row for archer 0 contains the value entered in A1 position
- Row for archer 1 contains the value entered in A2 position (should be archer 0's second arrow)
- Row for archer 2 contains the value entered in A3 position (should be archer 1's first arrow)

Since this was discovered during early testing, the affected scores should be re-entered.

## Verification

- [x] Migration run on dev (2026-02-16)
- [ ] Migration run on prod (pending user action via phpMyAdmin)
- [x] Code deployed to production (2026-02-16)
- [ ] Verified: enter 6 arrows, refresh, all 6 persist

## Branch

`fix/team-match-arrow-scoring` merged to `main` (commit `75043a0`)

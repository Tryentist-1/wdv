# Local Testing Notes - Feature Branch

**Branch:** `feature/sort-archer-selection-lists`  
**Date:** Testing Session  
**Server:** http://localhost:3000

## Features to Test

### 1. ✅ Sort Archer Selection Lists

**Test in Solo Match:**
1. Open http://localhost:3000/solo_card.html
2. Select an archer for A1 (e.g., "Alice")
3. Select an archer for A2 (e.g., "Bob")
4. **Verify:** Selected archers (Alice and Bob) appear at the top of the list
5. **Verify:** Remaining archers are sorted alphabetically by first name

**Test in Team Match:**
1. Open http://localhost:3000/team_card.html
2. Select 3 archers for Team 1
3. Select 3 archers for Team 2
4. **Verify:** Selected archers appear at the top of the list
5. **Verify:** Remaining archers are sorted alphabetically by first name

---

### 2. ✅ Sync Status UI Indicators

**Test in Solo Match:**
1. Open http://localhost:3000/solo_card.html
2. Select two archers and start scoring
3. Enter scores for Set 1
4. **Verify:** Sync status column appears in the score table
5. **Verify:** Status indicators show:
   - ⟳ (yellow) when pending
   - ✓ (green) when synced
   - ✗ (red) if failed
   - ○ (gray) when not synced

**Test in Team Match:**
1. Open http://localhost:3000/team_card.html
2. Select teams and start scoring
3. Enter scores for Set 1
4. **Verify:** Sync status column appears in the score table
5. **Verify:** Status indicators show worst status across all archers

---

### 3. ✅ Verification Field Fix (API)

**Test via API:**
```bash
# This endpoint should now return actual verification status
curl http://localhost:3000/api/index.php/v1/scorecard/{roundId}/{archerId} \
  -H "X-Passcode: wdva26" | jq '.verified, .card_status'
```

**Expected:** Returns actual `verified`, `card_status`, `verified_at`, `verified_by` from database instead of hardcoded `false`

---

### 4. ✅ RestoreTeamMatch Function

**Test in Team Match:**
1. Open http://localhost:3000/team_card.html
2. Select teams and start scoring
3. Enter some scores
4. Refresh the page
5. **Verify:** Match is restored from database:
   - Teams are restored
   - Archers are restored
   - Scores are restored
   - View switches to scoring view automatically

**Test with Browser Console:**
- Open browser console (F12)
- Look for: `[TeamCard] ✅ Match restored from database`
- Check that `state.matchId`, `state.team1`, `state.team2`, and `state.scores` are populated

---

## Browser Testing URLs

- Solo Match: http://localhost:3000/solo_card.html
- Team Match: http://localhost:3000/team_card.html
- Coach Console: http://localhost:3000/coach.html

## Console Logging

All features include console logging:
- `[TeamCard]` - Team match operations
- `[SoloCard]` - Solo match operations
- `[LiveUpdates]` - API sync operations

Open browser console (F12) to see detailed logging.


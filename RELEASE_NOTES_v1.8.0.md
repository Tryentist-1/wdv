# Release Notes v1.8.0 - Solo & Team Match History Integration

**Release Date:** December 2025  
**Version:** 1.8.0  
**Deployment:** Production (FTP)  
**Git Branch:** `main`  
**Type:** Feature Release (Solo & Team Match Integration)

## 🎯 Overview

This release integrates solo and team Olympic match results into the archer history display, providing a unified view of all competitive activities. Archers can now see their ranking rounds, solo matches, and team matches in a single chronological history, with accurate totals and proper navigation to match scorecards.

## ✨ Major Features

### Unified History Display
**NEW:** Complete competitive history in one place

- **Integrated View:** Ranking rounds, solo matches, and team matches displayed together
- **Chronological Sorting:** All activities sorted by date (most recent first)
- **Type Indicators:** Clear visual distinction between ranking rounds, solo matches, and team matches
- **Accurate Totals:** Sets won and total scores calculated from database set records
- **Winner Indicators:** Trophy emoji (🏆) shown for match winners

### Solo Match Integration
**Enhanced:** Solo matches now fully integrated into history and open rounds

- **History Display:** Solo matches appear in archer history with opponent name and sets score
- **Open Rounds:** Incomplete solo matches appear in "Active Rounds" on home page
- **Proper Routing:** Clicking solo match opens `solo_card.html` with match loaded
- **Match Loading:** Solo card can now load existing matches from URL parameter (`?match={matchId}`)
- **Accurate Totals:** Sets won calculated from `set_points` in database (counts sets where `set_points = 2`)

### Team Match Integration
**Enhanced:** Team matches integrated into history display

- **History Display:** Team matches shown with team name, opponent team, and sets score
- **Team Information:** Displays team name and opponent team clearly
- **Sets Tracking:** Shows sets won vs opponent sets won

## 🐛 Bug Fixes

### Totals Calculation
- ✅ **Fixed solo match totals in history** – Sets won and total scores now calculated accurately from database
  - Changed from using denormalized `sets_won` field to calculating from `set_points` in `solo_match_sets` table
  - Total score now sums `set_total` from all sets
  - More accurate than relying on potentially stale denormalized data

### Navigation & Routing
- ✅ **Fixed solo match routing** – Solo matches now route to `solo_card.html` instead of ranking rounds
  - Added `type` field filtering in `index.html` to separate ranking rounds from solo/team matches
  - Solo matches use `?match={matchId}` URL parameter
  - Ranking rounds continue to use `?event={eventId}&round={roundId}&archer={archerId}`

### Display Issues
- ✅ **Fixed open rounds filtering** – Solo matches now appear in "Active Rounds" section
  - Filters incomplete solo matches (sets won < 6 and opponent sets won < 6)
  - Shows today's matches even if complete for quick access
  - Properly distinguishes between ranking rounds and matches

## 🔧 Technical Changes

### API Enhancements (`api/index.php`)

**Modified:** `/v1/archers/{id}/history` endpoint

- **Added solo match queries:** Retrieves all solo matches for archer with accurate totals
- **Added team match queries:** Retrieves all team matches for archer
- **Unified response:** Combines ranking rounds, solo matches, and team matches into single array
- **Type field:** Each history item includes `type` field: `'ranking'`, `'solo'`, or `'team'`
- **Accurate calculations:** Sets won calculated from `set_points` (counts where `set_points = 2`)
- **Total score calculation:** Sums `set_total` from all sets for accurate match totals

**Query Improvements:**
- Solo matches: Calculates `sets_won` from `solo_match_sets.set_points`
- Solo matches: Calculates `total_score` from sum of `solo_match_sets.set_total`
- Team matches: Includes team information and sets won

### Frontend Updates

**Modified:** `archer_history.html`
- **Enhanced `renderHistory()` function:** Handles all three types (ranking, solo, team)
- **Type-specific display:** Different formatting for each type
  - Ranking rounds: Shows round type, division, bale, ends completed, score, average, Xs, 10s
  - Solo matches: Shows opponent name, sets score (e.g., "3-2"), winner indicator
  - Team matches: Shows team vs opponent, sets score, winner indicator
- **Status badges:** Consistent status display (PEND, COMP, VER, VOID) for all types

**Modified:** `index.html`
- **Separated filtering logic:** Filters ranking rounds, solo matches, and team matches separately
- **Solo match handling:** 
  - Filters incomplete solo matches (sets won < 6)
  - Routes to `solo_card.html?match={matchId}`
  - Displays opponent name and sets score
- **Unified scorecard list:** Updated to handle solo matches in display
- **Progress column:** Shows sets score for solo matches (e.g., "Sets: 3-2")

**Modified:** `js/solo_card.js`
- **URL parameter support:** Loads match from `?match={matchId}` URL parameter
- **Database restoration:** Restores match data, archers, and scores from database
- **State management:** Properly initializes match state when loading from URL

## 📋 Files Modified

### Core Application Files
- `api/index.php` - Enhanced `/v1/archers/{id}/history` endpoint with solo/team match queries
- `archer_history.html` - Updated `renderHistory()` to handle all three types
- `index.html` - Separated filtering logic, added solo match handling
- `js/solo_card.js` - Added URL parameter support for loading matches

### Database Queries
- Solo match history query with accurate totals calculation
- Team match history query with team information
- Set points calculation from `solo_match_sets` table

## ✅ Testing Checklist

- [x] Solo matches appear in archer history
- [x] Team matches appear in archer history
- [x] Ranking rounds still display correctly
- [x] Totals calculated accurately (sets_won, total_score)
- [x] Solo matches route to solo_card.html correctly
- [x] Solo card loads match from URL parameter
- [x] Open rounds shows incomplete solo matches
- [x] Winner indicators display correctly
- [x] Status badges work for all types
- [x] Chronological sorting works correctly

## 📚 Documentation Updates

- ✅ This release note documents the integration
- ✅ API endpoint behavior documented in code comments
- ✅ Frontend display logic documented in code comments

## 🚀 Deployment Notes

**Pre-Deployment:**
- No database migrations required
- No schema changes
- Backward compatible with existing data

**Post-Deployment:**
- Verify solo matches appear in history
- Verify team matches appear in history
- Test clicking solo match opens correct page
- Verify totals are accurate
- Check that open rounds shows solo matches

## 🔗 Related Documentation

- [PHASE2_API_ENDPOINTS.md](docs/PHASE2_API_ENDPOINTS.md) - Solo and team match API endpoints
- [VIEWING_MATCH_RESULTS.md](docs/VIEWING_MATCH_RESULTS.md) - Match result viewing
- [ARCHER_MODULE_AUDIT.md](docs/ARCHER_MODULE_AUDIT.md) - Archer module structure

---

**Previous Release:** [v1.7.1](RELEASE_NOTES_v1.7.1.md) - Scorecard Status Standardization


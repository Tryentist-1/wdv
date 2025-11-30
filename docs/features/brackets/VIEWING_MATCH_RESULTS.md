# Viewing Solo and Team Match Results

**Date:** November 18, 2025  
**Status:** Current Feature Documentation  
**Related:** Phase 2 - Olympic Match Integration

---

## 📍 Overview

Solo and Team Olympic matches can be viewed and managed through the **Coach Console**. Match results are linked to events, allowing coaches to see all matches for a specific event, verify completed matches, and manage the match workflow.

**Note:** Match results are currently only available in the Coach Console. Archer History pages do not yet display match results (this is a planned enhancement for Phase 3).

---

## 🎯 Viewing Match Results in Coach Console

### Accessing Match Results

1. **Open Coach Console**
   - Navigate to: `https://tryentist.com/wdv/coach.html`
   - Authenticate with coach passcode: `wdva26`

2. **Select an Event**
   - Click on any event in the events list
   - Click the **"Edit"** button (pencil icon) to open the event edit modal

3. **Navigate to Match Results Section**
   - Scroll down in the event edit modal
   - Find the **"Match Results"** section (below Division Rounds)
   - This section shows two lists:
     - **Solo Matches** - 1v1 head-to-head matches
     - **Team Matches** - Team vs team matches (3 archers per team)

---

## 📊 Match Display Information

Each match card shows:

### Solo Matches
- **Match Name:** "Archer A vs Archer B" (formatted automatically)
- **Status:** 
  - "Not Started" - Match created but no scores entered
  - "In Progress" - Scores being entered
  - "Completed" - All sets finished
- **Lock Status:** 🔒 icon if match is locked/verified
- **Verification Status:**
  - ✅ Verified (card_status = 'VER')
  - ❌ Voided (card_status = 'VOID')
  - No icon = Pending verification
- **Scores:** Total set points for each archer
- **Winner:** 🏆 indicator showing winner name (if match completed)
- **Date:** Match date (if set)

### Team Matches
- **Match Name:** "Team A vs Team B" (formatted from team names or schools)
- **Status:** Same as Solo Matches
- **Lock Status:** 🔒 icon if match is locked/verified
- **Verification Status:** Same as Solo Matches
- **Scores:** Total set points for each team
- **Winner:** 🏆 indicator showing winner team name
- **Date:** Match date (if set)

---

## 🔧 Match Management Actions

### Creating Matches

**From Coach Console:**
1. Open event edit modal
2. Scroll to "Match Results" section
3. Click **"➕ Solo Match"** or **"➕ Team Match"** button
4. Fill in the match creation form:
   - **Date:** Match date (defaults to today)
   - **Location:** Optional location field
   - **Max Sets:** 
     - Solo: 5 sets (default)
     - Team: 4 sets (default)
5. Click **"Create Match"**
6. Match opens automatically in scoring interface

**Match Creation Notes:**
- Matches are automatically linked to the current event
- Match ID is generated (UUID)
- Match code is generated when archers are added (for standalone matches)
- Matches can be created before or during the event

---

### Opening Matches for Scoring

1. In the Match Results section, find the match you want to open
2. Click the **"Open"** button on the match card
3. Match opens in a new tab:
   - Solo matches → `solo_card.html?event={eventId}&match={matchId}`
   - Team matches → `team_card.html?event={eventId}&match={matchId}`

**Scoring Interface:**
- Archers can enter scores for each set
- Scores sync to database in real-time
- Match status updates automatically as sets are completed

---

### Verifying Matches

**When to Verify:**
- Match must be **Completed** (all sets finished)
- Match must not already be locked
- Only coaches can verify matches

**How to Verify:**
1. Find a completed match in the Match Results section
2. Click the **"Verify"** button (green button, only shows for completed, unlocked matches)
3. Enter verification details:
   - **Your Name:** Coach name for audit trail
   - **Notes:** Optional notes about the verification
   - **Action:** Choose "Lock" (verify) or "Void" (invalidate)
4. Click confirm
5. Match is locked and marked as verified

**Verification Actions:**
- **Lock:** Verifies the match, sets `card_status = 'VER'`, locks the match
- **Void:** Invalidates the match, sets `card_status = 'VOID'`, locks the match
- **Unlock:** (Available via API) Unlocks a verified match for corrections

**Verification History:**
- All verification actions are logged in `lock_history` field
- Includes: action, actor (coach name), timestamp, notes
- Viewable in match details (future enhancement)

---

### Refreshing Match Lists

1. Click the **"🔄 Refresh"** button in the Match Results section
2. Match lists reload from the database
3. Updated status, scores, and verification state are displayed

**When to Refresh:**
- After creating a new match
- After verifying a match
- After scores are updated in the scoring interface
- To see latest match status

---

## 🔍 API Endpoints Used

The Coach Console uses these endpoints to display match results:

### List Solo Matches for Event
```
GET /v1/events/:eventId/solo-matches
```
**Response:**
```json
{
  "matches": [
    {
      "id": "match-uuid",
      "event_id": "event-uuid",
      "status": "Completed",
      "locked": true,
      "card_status": "VER",
      "date": "2025-11-18",
      "match_display": "Archer A vs Archer B",
      "archer1": {
        "archer_name": "Archer A",
        "total_set_points": 6
      },
      "archer2": {
        "archer_name": "Archer B",
        "total_set_points": 4
      },
      "winner_name": "Archer A"
    }
  ]
}
```

### List Team Matches for Event
```
GET /v1/events/:eventId/team-matches
```
**Response:** Similar structure, but with `team1` and `team2` objects instead of `archer1` and `archer2`

### Verify Match
```
POST /v1/solo-matches/:matchId/verify
POST /v1/team-matches/:matchId/verify
```
**Body:**
```json
{
  "action": "lock",  // or "unlock" or "void"
  "verifiedBy": "Coach Name",
  "notes": "Optional notes"
}
```

---

## 📝 Current Limitations

### What's Available
- ✅ View all matches for an event in Coach Console
- ✅ Create new matches from Coach Console
- ✅ Open matches for scoring
- ✅ Verify (lock/void) completed matches
- ✅ See match status, scores, and verification state
- ✅ Refresh match lists

### What's Not Yet Available
- ❌ **Archer History** - Match results are not shown in archer history pages
- ❌ **Match Details View** - No detailed match view (set-by-set breakdown) in Coach Console
- ❌ **Match Export** - No export functionality for match results
- ❌ **Match Statistics** - No win/loss records or match analytics
- ❌ **Bulk Verification** - No "verify all matches" for an event

**Future Enhancements (Phase 3):**
- Add match results to Archer History pages
- Create detailed match view page
- Add match export functionality
- Implement match statistics and analytics
- Add bulk verification workflow

---

## 🎓 Usage Examples

### Example 1: Creating and Managing a Solo Match

1. **Coach creates event:**
   - Event: "2025 State Championship"
   - Date: November 18, 2025

2. **Coach creates solo match:**
   - Opens event edit modal
   - Clicks "➕ Solo Match"
   - Sets date: November 18, 2025
   - Creates match

3. **Match opens for scoring:**
   - Coach clicks "Open" button
   - Solo card interface opens
   - Coach or scorer adds archers and enters scores

4. **Match completes:**
   - All 5 sets finished
   - Winner determined (first to 6 set points)
   - Status changes to "Completed"

5. **Coach verifies match:**
   - Returns to Coach Console
   - Clicks "🔄 Refresh" to see updated status
   - Clicks "Verify" button
   - Enters name and notes
   - Match is locked and verified

### Example 2: Viewing All Matches for an Event

1. **Coach opens event:**
   - Selects event from list
   - Clicks "Edit" button

2. **Views Match Results:**
   - Scrolls to "Match Results" section
   - Sees list of all solo matches
   - Sees list of all team matches
   - Can see status, scores, and verification state for each

3. **Takes action:**
   - Opens incomplete matches to continue scoring
   - Verifies completed matches
   - Creates new matches as needed

---

## 🔗 Related Documentation

- **Verification Workflow:** [BALE_GROUP_SCORING_WORKFLOW.md](BALE_GROUP_SCORING_WORKFLOW.md)
- **API Endpoints:** [PHASE2_API_ENDPOINTS.md](PHASE2_API_ENDPOINTS.md)
- **Architecture:** [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md)
- **Release Notes:** [RELEASE_NOTES_v1.4.2.md](../RELEASE_NOTES_v1.4.2.md)

---

## ❓ Troubleshooting

### Matches Not Showing Up

**Problem:** Created a match but it doesn't appear in the list

**Solutions:**
- Click "🔄 Refresh" button to reload from database
- Verify match is linked to the event (`event_id` is set)
- Check browser console for API errors
- Verify you're viewing the correct event

### Can't Verify Match

**Problem:** "Verify" button is not showing or is disabled

**Solutions:**
- Match must be "Completed" status
- Match must not already be locked
- Only works in coach mode (authenticated with coach passcode)
- Check match has sets scored (not empty)

### Match Status Not Updating

**Problem:** Match shows "In Progress" but should be "Completed"

**Solutions:**
- Click "🔄 Refresh" to reload from database
- Verify all sets are scored in the match
- Check match completion logic in scoring interface
- Verify scores synced to database successfully

---

**Last Updated:** November 18, 2025  
**Version:** 1.4.2


# Bracket Results Feature - Test Plan

**Date:** November 21, 2025  
**Features:** Bracket Results Viewing, Test Data Generation, Archer Match History  
**Status:** Ready for Testing

---

## 🎯 Overview

This test plan covers the new bracket results viewing features:
1. **Bracket Results Page** (`bracket_results.html`) - Coach/Public view of bracket matches
2. **Test Data Generation Script** (`api/create_test_bracket_data.php`) - Create/delete test tournaments
3. **Archer Matches View** (`archer_matches.html`) - Archer-facing match history
4. **API Endpoints** - Enhanced bracket results and new archer matches endpoints

---

## ✅ Pre-Test Checklist

- [ ] PHP syntax validated (✓ Already checked)
- [ ] Local development server running (`npm run serve` or PHP built-in server)
- [ ] Database connection working
- [ ] Coach API key available (`wdva26` or from config)
- [ ] Browser developer console open (F12) to monitor errors

---

## 📋 Test 1: Test Data Generation Script

### 1.1 Create Test Tournament

**Steps:**
1. Open terminal in project root
2. Run: `php api/create_test_bracket_data.php create "Test Tournament 2025" BV`
3. Verify output shows:
   - ✓ Created event
   - ✓ Created ranking round
   - ✓ Created ranking scores for 12 archers
   - ✓ Created elimination bracket
   - ✓ Added Top 8 archers to bracket
   - Event ID, Round ID, Bracket ID displayed

**Expected Results:**
- Script completes without errors
- Event appears in Coach Console
- Ranking round has 12 archers with verified scores
- Bracket exists with 8 entries (seeds 1-8)

**Validation:**
```sql
-- Check event was created
SELECT * FROM events WHERE name = 'Test Tournament 2025';

-- Check ranking round
SELECT COUNT(*) FROM round_archers WHERE round_id IN (
  SELECT id FROM rounds WHERE event_id IN (
    SELECT id FROM events WHERE name = 'Test Tournament 2025'
  )
);

-- Check bracket entries
SELECT COUNT(*) FROM bracket_entries WHERE bracket_id IN (
  SELECT id FROM brackets WHERE event_id IN (
    SELECT id FROM events WHERE name = 'Test Tournament 2025'
  )
);
```

### 1.2 List Test Events

**Steps:**
1. Run: `php api/create_test_bracket_data.php list`
2. Verify output shows test events with round/bracket counts

**Expected Results:**
- Table displays all test events
- Shows event ID, name, date, round count, bracket count

### 1.3 Delete Test Tournament

**Steps:**
1. Run: `php api/create_test_bracket_data.php delete "Test Tournament 2025"`
2. Verify output shows deletion of all related data

**Expected Results:**
- All bracket entries deleted
- All brackets deleted
- All end events deleted
- All round archers deleted
- All rounds deleted
- Event deleted
- No errors

**Validation:**
```sql
-- Verify deletion
SELECT COUNT(*) FROM events WHERE name = 'Test Tournament 2025';
-- Should return 0
```

---

## 📋 Test 2: Bracket Results API Endpoint

### 2.1 Get Bracket Results (Elimination)

**Prerequisites:**
- Test tournament created (from Test 1.1)
- Note the bracket ID from script output

**Steps:**
1. Get bracket ID from test data creation output
2. Make API call:
   ```bash
   curl -H "X-API-Key: wdva26" \
     "http://localhost:8001/api/index.php/v1/brackets/{BRACKET_ID}/results"
   ```
3. Verify JSON response structure

**Expected Results:**
```json
{
  "bracket": {
    "id": "...",
    "event_id": "...",
    "event_name": "Test Tournament 2025",
    "bracket_type": "SOLO",
    "bracket_format": "ELIMINATION",
    "division": "BV",
    "status": "OPEN"
  },
  "qualification": [
    {
      "rank": 1,
      "archer_name": "...",
      "school": "...",
      "total_score": 650,
      "total_10s": 45,
      "total_xs": 12
    },
    // ... 7 more entries
  ],
  "rounds": {
    "quarterfinals": [],
    "semifinals": [],
    "finals": []
  }
}
```

**Validation:**
- [ ] `bracket` object contains all required fields
- [ ] `qualification` array has 8 entries
- [ ] Qualification entries sorted by rank (1-8)
- [ ] Scores are realistic (600-650 range)
- [ ] `rounds` object has empty arrays (no matches yet)

### 2.2 Get Bracket Results (With Matches)

**Prerequisites:**
- Test tournament with bracket created
- At least one match created in bracket (manual or via match creation flow)

**Steps:**
1. Create a solo match linked to the bracket (via `solo_card.html` or API)
2. Enter scores for the match
3. Call bracket results API again
4. Verify matches appear in appropriate round arrays

**Expected Results:**
- Matches appear in `rounds.quarterfinals`, `rounds.semifinals`, or `rounds.finals`
- Each match has:
  - `archer1` and `archer2` objects
  - `sets` array with end scores
  - `total_set_points` for each archer
  - `winner_archer_id` if match completed

---

## 📋 Test 3: Bracket Results HTML Page

### 3.1 Page Load and Navigation

**Steps:**
1. Create test tournament (Test 1.1)
2. Open: `bracket_results.html?bracketId={BRACKET_ID}`
3. Verify page loads without errors

**Expected Results:**
- [ ] Page header shows event name and bracket info
- [ ] Tab navigation visible (Qual Ranking, Quarter Finals, Semi Finals, Finals Round)
- [ ] Qualification tab active by default
- [ ] Dark mode toggle works
- [ ] No console errors

### 3.2 Qualification Ranking Tab

**Steps:**
1. Click "Qual Ranking" tab (should be active by default)
2. Verify table displays

**Expected Results:**
- [ ] Table shows 8 archers
- [ ] Columns: Rank, Name, School, Total Score, 10s, Xs
- [ ] Top 8 rows highlighted (yellow background)
- [ ] Scores sorted highest to lowest
- [ ] All data matches API response

### 3.3 Match Display (When Matches Exist)

**Prerequisites:**
- Test tournament with matches created

**Steps:**
1. Create matches in bracket (via Solo match module)
2. Enter scores for matches
3. Refresh bracket results page
4. Navigate to Quarter Finals, Semi Finals, Finals tabs

**Expected Results:**
- [ ] Each match shows in a card
- [ ] Match ID displayed (e.g., "BVARQ1")
- [ ] Table shows:
  - Target column (15A, 16A)
  - Name (Rank) column with seed number
  - End 1-5 columns with scores in format `29(2)`
  - Total Score column (set points)
- [ ] Winner row highlighted in green
- [ ] Winner text in green color
- [ ] Empty ends show "-"

### 3.4 Swiss Bracket View

**Steps:**
1. Create a Swiss bracket (via Coach Console)
2. Create some matches in the Swiss bracket
3. Open bracket results page for Swiss bracket
4. Verify Swiss view displays

**Expected Results:**
- [ ] No tab navigation (Swiss doesn't use tabs)
- [ ] Leaderboard table shows:
  - Rank, Name, School, W-L, Points
- [ ] All Matches section shows match list
- [ ] Leaderboard sorted by points (highest first)

### 3.5 Coach Actions

**Steps:**
1. Open bracket results as coach (with API key)
2. Verify "Validate All and Close Bracket" button visible
3. Click button and confirm
4. Verify bracket status changes to "COMPLETED"

**Expected Results:**
- [ ] Button only visible when authenticated as coach
- [ ] Confirmation dialog appears
- [ ] Bracket status updates after confirmation
- [ ] Page refreshes with updated status

---

## 📋 Test 4: Archer Matches API Endpoint

### 4.1 Get Archer Matches

**Prerequisites:**
- Test tournament with matches
- Note an archer ID that participated in matches

**Steps:**
1. Get archer ID from test data
2. Make API call:
   ```bash
   curl "http://localhost:8001/api/index.php/v1/archers/{ARCHER_ID}/matches"
   ```
3. Verify JSON response

**Expected Results:**
```json
{
  "archer": {
    "id": "...",
    "first_name": "...",
    "last_name": "...",
    "full_name": "..."
  },
  "matches": [
    {
      "id": "...",
      "event_id": "...",
      "bracket_id": "...",
      "match_type": "bracket",
      "opponent": {
        "id": "...",
        "name": "..."
      },
      "my_sets": [...],
      "opponent_sets": [...],
      "my_total_set_points": 6,
      "opponent_total_set_points": 2,
      "is_winner": true,
      "result": "W"
    }
  ],
  "total_matches": 1,
  "bracket_matches": 1,
  "informal_matches": 0
}
```

**Validation:**
- [ ] `archer` object contains correct info
- [ ] `matches` array includes all matches for archer
- [ ] Each match has `match_type` ("bracket" or "informal")
- [ ] Sets data included for both archers
- [ ] Winner correctly identified
- [ ] Counts accurate

---

## 📋 Test 5: Archer Matches HTML Page

### 5.1 Page Load

**Steps:**
1. Open: `archer_matches.html?archer={ARCHER_ID}`
2. Verify page loads

**Expected Results:**
- [ ] Page header shows archer name
- [ ] Match count displayed (total, tournament, informal)
- [ ] Filter tabs visible (All, Tournament, Informal)
- [ ] Dark mode toggle works
- [ ] No console errors

### 5.2 Match Display

**Steps:**
1. Verify matches render in cards
2. Check match information displayed

**Expected Results:**
- [ ] Each match shows:
  - Opponent name
  - Match title (event name for bracket, "Informal Match" for informal)
  - Match ID/code
  - Result indicator (W/L/T) with color coding
  - Score (my points - opponent points)
- [ ] End-by-end breakdown shows:
  - 5 end cards
  - Each end shows: my score(xs) and opponent score(xs)
  - Winning ends highlighted
  - Empty ends show "-"

### 5.3 Filter Functionality

**Steps:**
1. Click "Tournament" filter tab
2. Verify only bracket matches shown
3. Click "Informal" filter tab
4. Verify only informal matches shown
5. Click "All Matches" tab
6. Verify all matches shown

**Expected Results:**
- [ ] Filtering works correctly
- [ ] Active tab highlighted
- [ ] Match count updates appropriately
- [ ] "No matches" message shows when filtered list empty

### 5.4 Match Types

**Test Informal Match:**
1. Create standalone solo match (not linked to event/bracket)
2. Enter scores
3. View in archer matches page
4. Verify shows as "Informal Match"

**Test Bracket Match:**
1. Create match linked to bracket
2. Enter scores
3. View in archer matches page
4. Verify shows event name and bracket info

**Expected Results:**
- [ ] Informal matches show "Informal Match" title
- [ ] Bracket matches show event name and division
- [ ] Both types display correctly with scores

---

## 📋 Test 6: Integration Testing

### 6.1 End-to-End Bracket Flow

**Steps:**
1. Create test tournament (Test 1.1)
2. View bracket results page - verify qualification ranking
3. Create Quarter Final matches via Solo match module
4. Enter scores for matches
5. View bracket results page - verify matches appear in Quarter Finals tab
6. View archer matches page - verify archers see their matches
7. Complete bracket (all rounds)
8. View final bracket results

**Expected Results:**
- [ ] All data flows correctly through system
- [ ] Scores display correctly in all views
- [ ] Winners advance correctly
- [ ] No data inconsistencies

### 6.2 Cross-Device Testing

**Steps:**
1. Open bracket results on desktop
2. Open same bracket on mobile device
3. Verify consistent display
4. Test dark mode on both devices

**Expected Results:**
- [ ] Mobile layout responsive
- [ ] Tables scrollable on mobile
- [ ] Touch targets adequate (44px minimum)
- [ ] Dark mode consistent

### 6.3 Error Handling

**Test Cases:**
1. Invalid bracket ID: `bracket_results.html?bracketId=invalid`
2. Missing bracket ID: `bracket_results.html`
3. Invalid archer ID: `archer_matches.html?archer=invalid`
4. Network error (offline mode)

**Expected Results:**
- [ ] Appropriate error messages displayed
- [ ] No JavaScript errors
- [ ] Graceful degradation

---

## 🐛 Known Issues / Edge Cases to Test

1. **Empty Brackets:** Test bracket with no matches
2. **Incomplete Matches:** Test matches with partial scores
3. **Ties:** Test matches that end in tie
4. **Multiple Divisions:** Test multiple brackets in same event
5. **Large Tournaments:** Test with many matches

---

## 📊 Test Results Template

```
Test Date: __________
Tester: __________
Environment: Local / Production

Test 1: Test Data Generation
  [ ] 1.1 Create Test Tournament
  [ ] 1.2 List Test Events
  [ ] 1.3 Delete Test Tournament

Test 2: Bracket Results API
  [ ] 2.1 Get Bracket Results (Elimination)
  [ ] 2.2 Get Bracket Results (With Matches)

Test 3: Bracket Results HTML
  [ ] 3.1 Page Load and Navigation
  [ ] 3.2 Qualification Ranking Tab
  [ ] 3.3 Match Display
  [ ] 3.4 Swiss Bracket View
  [ ] 3.5 Coach Actions

Test 4: Archer Matches API
  [ ] 4.1 Get Archer Matches

Test 5: Archer Matches HTML
  [ ] 5.1 Page Load
  [ ] 5.2 Match Display
  [ ] 5.3 Filter Functionality
  [ ] 5.4 Match Types

Test 6: Integration
  [ ] 6.1 End-to-End Bracket Flow
  [ ] 6.2 Cross-Device Testing
  [ ] 6.3 Error Handling

Issues Found:
1. 
2. 
3. 

Notes:
```

---

## 🚀 Quick Start Testing

**Fastest path to test everything:**

1. **Create test data:**
   ```bash
   php api/create_test_bracket_data.php create "Quick Test" BV
   ```
   Note the Bracket ID from output

2. **View bracket results:**
   - Open: `bracket_results.html?bracketId={BRACKET_ID}`
   - Verify qualification ranking displays

3. **Create a match:**
   - Open `solo_card.html`
   - Select event and bracket
   - Create match with two archers from Top 8
   - Enter scores
   - Save match

4. **View updated bracket:**
   - Refresh `bracket_results.html`
   - Navigate to Quarter Finals tab
   - Verify match appears with scores

5. **View archer matches:**
   - Get archer ID from test data
   - Open: `archer_matches.html?archer={ARCHER_ID}`
   - Verify match appears

6. **Cleanup:**
   ```bash
   php api/create_test_bracket_data.php delete "Quick Test"
   ```

---

## ✅ Success Criteria

All tests pass if:
- [ ] Test data script creates/deletes without errors
- [ ] API endpoints return correct data structure
- [ ] HTML pages render without JavaScript errors
- [ ] Match scores display correctly in all views
- [ ] Filtering and navigation work smoothly
- [ ] Mobile layout is responsive
- [ ] Dark mode works correctly
- [ ] Error handling is graceful

---

**Last Updated:** November 21, 2025  
**Test Plan Version:** 1.0



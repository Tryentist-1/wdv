# Manual Sanity Check for Live Scoring

## Quick Test Checklist

### M0: API Test Harness ✓
- [ ] Open `api/test_harness.html` in browser
- [ ] Toggle to "Use Event Code (Archer)"
- [ ] Enter code: `E2EUI`
- [ ] Run Test 1: Health Check → Should pass with 200 OK
- [ ] Run Test 6: Full Workflow → Should create round, archer, and post 3 ends

### M1: Setup Sections ✓
Already passed 42/42 tests

### M2: Coach Flow
- [ ] Open `coach.html`
- [ ] Log in with passcode: `wdva26`
- [ ] Click "Create Event"
- [ ] Enter name: `Test Event`, code: `TESTCODE`
- [ ] Click Submit → Event should appear in list
- [ ] Click "Add Archers" → Select some archers → Submit
- [ ] Click "QR Code" → Should show QR with event URL
- [ ] Click "Reset" on event → Confirm → Should clear scores

### M3: Manual Selection
- [ ] Open `ranking_round_300.html`
- [ ] Click "Cancel" on event modal (manual mode)
- [ ] Should see bale number input and archer search
- [ ] Should see A, B, C, D target options
- [ ] "Start Scoring" button should be disabled until archers selected

### M4: Live Init with Event Code
- [ ] Open `ranking_round_300.html?event=<eventId>&code=TESTCODE`
- [ ] Should bypass modal and show pre-assigned bales
- [ ] Should see "Start Scoring" buttons for each bale
- [ ] Click "Start Scoring" on Bale 1
- [ ] Should enter scoring view

### M5: Start Scoring Creates Scorecards
- [ ] In scoring view, should see all archer cards with targets (A, B, C, D)
- [ ] Each card should show archer name, school, level
- [ ] Should see End 1 score inputs
- [ ] Should see "Sync End" button

### M6: Sync End to Server
- [ ] Enter scores: 10, 9, 8 for first archer
- [ ] Click "Sync End"
- [ ] Should see success indicator
- [ ] Open `results.html?event=<eventId>` in new tab
- [ ] Should see leaderboard with archer's score (27 for end 1)

### M7: Resume from Snapshot
- [ ] Close `ranking_round_300.html`
- [ ] Reopen with same event URL
- [ ] Should resume at End 1 with scores shown
- [ ] Navigate to End 2
- [ ] Should remember previous end's scores

### M8: Offline Queue
- [ ] Open DevTools → Network → Set to Offline
- [ ] Enter scores for End 2
- [ ] Click "Sync End"
- [ ] Should show "pending" indicator
- [ ] Go back Online
- [ ] Reload page → Should auto-flush queue
- [ ] Check `results.html` → Should show End 2 scores

### M9: Security
- [ ] Try API call with wrong passcode → Should get 401
- [ ] Try API call with correct passcode → Should get 200/201
- [ ] Try accessing coach endpoints without auth → Should get 401

## Notes
- Use browser DevTools Console to check for errors
- Check Network tab to verify API calls
- localStorage keys to inspect:
  - `rankingRound300_<date>` - session state
  - `event:<eventId>:meta` - event metadata  
  - `event:<eventId>:archers_v2` - archer list
  - `live_updates_config` - live sync config
  - `luq:<roundId>` - offline queue



# Manual Testing Checklist

This document provides a checklist for manually testing the core features of the Archery Score Management Suite. It should be run before every deployment to ensure no regressions have been introduced.

Manual run notes and screenshots are stored in `docs/testing/manual-runs/`.

---

## End-to-End Bale Verification Dry Run

**Status:** In progress — bale verification UI is not yet available in `results.html`; treat the coach review steps as future-state planning.

1. **Environment Prep**
   - Clear browser local storage and cookies for `https://tryentist.com/wdv`.
   - Ensure network is online; disable any throttling or offline extensions.
   - Open `api/test_harness.html` and run the “Full Workflow” section to confirm credentials and schema (currently blocked on `/v1/rounds` 401 unless the coach API key is supplied).
2. **Coach Console Setup (`coach.html`)**
   - Authenticate with the coach passcode.
   - Create a new event with today’s date and unique entry code.
   - Use “Add Archers” › “Select All” to populate the event, confirm assignment mode modal completes (existing modal shows an empty state before the division loads; follow-up required).
   - Open the QR modal, copy the event URL for later, then close the modal.
3. **Scoring Team Workflow (`ranking_round_300.html`)**
   - Visit the copied QR URL on a second tab or device.
   - Verify pre-assigned setup appears with bale list populated; start scoring the first bale.
   - Confirm Live Updates toggle is on; enter at least one full end of scores for every archer on the bale using the keypad.
   - Trigger “Sync End” and wait for confirmation badge to show “Synced”.
4. **Leaderboard & Bale Review (`results.html`)**
   - Open `results.html?event={eventId}`.
   - Verify the leaderboard reflects the latest end totals and that the tested archers appear (if blank, confirm the relevant round rows in MySQL have `event_id` populated; `/v1/rounds` now updates this automatically).
   - From the leaderboard, open one archer’s detailed card; capture a screenshot or use any export control available (UI not implemented yet).
5. **Coach Bale Verification Pass**
   - Pending feature work: bale filters, verification controls, and card locking are not yet implemented in `results.html`.
6. **Post-Run Integrity Checks**
   - Refresh `results.html` and `ranking_round_300.html` to confirm state persists across reloads.
   - Toggle offline mode, add a dummy end, then reconnect; ensure pending sync queue flushes without duplication.
   - Optional: Repeat the bale verification on a different browser/device to confirm cross-device consistency.

---

## 1. Global & Home Page (`index.html`)

- [ ] **Page Load:** Does the home page load correctly?
- [ ] **Layout:** Does the icon-based menu display correctly on desktop and mobile without scrolling?
- [ ] **Links:** Do the "Solo", "Team", "Practice", and "Archer List" buttons navigate to the correct pages (`solo_card.html`, `team_card.html`, `gemini-oneshot.html`, `archer_list.html`)?

---

## 2. Archer Management (`archer_list.html`)

- [ ] **Page Load:** Does the archer list load? Does it fetch the default list if local storage is empty?
- [ ] **Add Archer:**
    - [ ] Can you open the "Add Archer" modal?
    - [ ] Can you successfully add a new archer with all fields?
    - [ ] Does the new archer appear in the list?
- [ ] **Edit Archer:**
    - [ ] Can you click on an archer to open the "Edit Archer" modal?
    - [ ] Are the correct archer details pre-filled in the form?
    - [ ] Can you update the archer's details (e.g., name, bale, target)?
    - [ ] Do the changes persist after saving?
- [ ] **Favorite:**
    - [ ] Can you toggle an archer's favorite status by clicking the star?
    - [ ] Does the list sort favorites to the top by default?
- [ ] **Sorting:**
    - [ ] Does "Sort by Name" work correctly?
    - [ ] Does "Sort by Bale" work correctly?
- [ ] **Search:** Does the search bar filter the list correctly as you type?
- [ ] **List Management:**
    - [ ] Does "Load from MySQL" succeed with a coach API key? With only an event entry code?
    - [ ] After pulling from MySQL, does the sync badge show the correct "Last download" timestamp?
    - [ ] If you disconnect (Airplane Mode) and edit an archer, does the status change to "Pending" and automatically recover once back online?
    - [ ] Does "New List" correctly clear all archers after confirmation?

---

## 3. Ranking Round (`ranking_round.html`)

- [ ] **Setup:**
    - [ ] Can you select multiple archers for the bale?
    - [ ] Can you assign a target (A-H) to each selected archer?
    - [ ] Can you set the Bale Number?
    - [ ] Does the "Scoring" button become active only when archers are selected?
- [ ] **Scoring View:**
    - [ ] Does the scoring view show the correct archers, sorted by target?
    - [ ] Can you enter scores using the keypad?
    - [ ] Do the end totals, 10s, Xs, and running totals calculate correctly?
    - [ ] Do the arrow value color backgrounds appear correctly?
    - [ ] Do the end average and its color background calculate correctly?
    - [ ] Can you navigate between ends using "Prev End" and "Next End"?
    - [ ] Does the Live badge reflect "Synced" after an end posts? Does it show "Pending" when offline and recover on reconnect?
- [ ] **Card View:**
    - [ ] Can you click the "»" button to open an individual archer's card?
    - [ ] Does the card view show all 12 ends correctly?
    - [ ] Are all totals (End, Run, 10s, Xs, Final) correct?
    - [ ] Can you navigate between archers using "Prev Archer" and "Next Archer"?
- [ ] **Verify & Send Workflow:**
    - [ ] From the card view, does the "Verify & Send" button open the summary modal?
    - [ ] Does the summary modal show the correct totals for all archers on the bale?
    - [ ] Does the "Send SMS" button generate the correct SMS body with tab-separated values?

---

## 4. Solo Round (`solo_card.html`)

- [ ] **Setup:**
    - [ ] Can you select an archer for "A1"?
    - [ ] Can you select a different archer for "A2"?
    - [ ] Does the "Start Scoring" button enable only when both archers are selected?
- [ ] **Scoring View:**
    - [ ] Does the header correctly display the names of the two competing archers?
    - [ ] Can you enter scores using the keypad?
    - [ ] Do end totals calculate correctly for both archers?
    - [ ] Do set points award correctly (2 for a win, 1 for a tie, 0 for a loss)?
    - [ ] Does the match score update correctly?
    - [ ] Does the match end automatically when one archer reaches 6 or more set points?
- [ ] **Shoot-Off:**
    - [ ] If the match score is 5-5 after 5 ends, does the shoot-off row appear?
    - [ ] Can you enter shoot-off scores for both archers?
    - [ ] Does the winner get correctly determined by the higher score?
    - [ ] If shoot-off scores are tied, do the "Judge Call" buttons appear?
    - [ ] Does clicking a "Judge Call" button correctly assign the win and end the match?
- [ ] **Controls:**
    - [ ] Does "New Match" clear the board and return to setup after confirmation?
    - [ ] Does "Edit Setup" return to the setup screen without losing scores?

---

## 5. Team Round (`team_card.html`)

- [ ] **Setup:**
    - [ ] Can you select multiple archers for "Team 1"?
    - [ ] Can you select multiple different archers for "Team 2"?
    - [ ] Does the "Start Scoring" button enable only when both teams have at least one archer?
- [ ] **Scoring View:**
    - [ ] Does the header correctly display the team names/archer lists?
    - [ ] Does the table show the correct number of arrow inputs per team?
    - [ ] Do set points and match score calculate correctly?
- [ ] **Shoot-Off:**
    - [ ] If the match is tied 4-4, does the shoot-off row appear?
    - [ ] Can you enter one score for each archer on each team?
    - [ ] Does the team with the higher total shoot-off score win?
    - [ ] **Tie-Breaker:** If shoot-off totals are tied, does the team with the single highest arrow (e.g., an X beats a 10) win?
    - [ ] **Judge Call:** If totals and highest arrows are tied, does the "Judge Call" row appear at the bottom? Does selecting a winner work?
- [ ] **Controls:**
    - [ ] Does "New Match" clear the board and return to setup after confirmation?
    - [ ] Does "Edit Setup" return to the setup screen without losing scores?

---

## 6. Practice Target (`gemini-oneshot.html`)

- [ ] **Layout:**
    - [ ] Does the page load with the target filling the available screen space?
    - [ ] Is the layout responsive when the window is resized?
- [ ] **Functionality:**
    - [ ] Can you tap on the target to record arrow positions?
    - [ ] Does the scoreboard update correctly?
    - [ ] Does the "Shooting End X, Arrow Y" status update correctly?
- [ ] **Controls:**
    - [ ] Does the "Correct" button allow you to remove the last-placed arrow?
    - [__] Does the "Rescore Centered" button toggle the display mode correctly?
    - [__] Does the "Save" button function as expected?
- [ ] **End of Match:**
    - [ ] After all arrows are shot, do the "Actual Score" and "Recenter Score" totals appear at the top?
    - [ ] Does the end-by-end scoreboard appear at the bottom?
    - [ ] Does the group bias analysis (average position dot) appear?
- [ ] **Setup:**
    - [ ] Does the "Setup" button prompt for the number of ends and arrows per end?
    - [ ] Does the scorecard reset and adapt to the new settings? 

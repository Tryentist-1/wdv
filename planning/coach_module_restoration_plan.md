# Coach Module Restoration & Verification Plan

This document outlines the systematic approach to restoring, verifying, and fixing the Coach Module workflows. We will step through each workflow to ensure end-to-end functionality.

## 1. Event Setup & Roster Management
**Goal**: Create an event and populate it with archers.

### Workflow:
1.  **Create Event**: Coach clicks "Create Event", enters details (Name, Date).
2.  **Roster Management**: Coach imports CSV or selects from Master List.
3.  **Event Registration**: Coach adds archers to the specific event (assignments).

### Current Status/Expectations:
-   [x] **Database Restore**: Production backup restored to reset data state.
-   [x] **Create Event**: Confirmed "RR Jan 28" exists in database with Active status.
-   [x] **Roster**: Confirmed 13 archers in BVAR division with verified scores from restore.

### Known Issues:
-   None active.

---

## 2. Competition Configuration (Bales & Rounds)
**Goal**: Prepare the physical and digital setup for shooting.

### Workflow:
1.  **Bale Assignments**: Coach assigns archers to specific targets (1A, 1B, etc.).
2.  **Round Setup**: Define the rounds (e.g., R300, 30 arrows).

### Current Status/Expectations:
-   [ ] **Bale Assignment UI**: Unverified after restore. Low priority if Brackets are the focus.

---

## 3. Bracket Generation & Management
**Goal**: Create competitive brackets based on ranking data.

### Workflow:
1.  **Ranking Validity**: Ensure ranking rounds are "Completed" and "Verified".
2.  **Generate Bracket**: Coach selects "Generate from Top 8" for a division.
3.  **Population**: System selects top 8 archers by score and seeds them (1 vs 8, 2 vs 7).
4.  **Creation**: Bracket matches are created in the database.

### Current Status/Expectations:
-   [x] **Generation Logic**: Fixed division code mismatch (`BV` -> `BVAR`) and Auto-Match creation.
-   [x] **Verification**: Manual API trigger confirmed successful generation of 8 entries and 4 matches (Quarter Finals).
-   [x] **Visibility**: Matches should now appear on the "Quarter Finals" tab.

### Fixes Applied:
-   Updated `api/index.php` to normalize division codes.
-   Updated `api/index.php` to immediately generate `solo_matches` (Q1-Q4) when bracket is generated.
-   Fixed `gender` column truncation error.

---

## 4. Active Match Management
**Goal**: Manage the flow of the event while it's happening.

### Workflow:
1.  **Score Entry**: Archers enter scores (simulated or real).
2.  **Monitoring**: Coach views "Event Dashboard" to see real-time progress.
3.  **Corrections**: Coach edits a match or scorecard if an error occurs.

### Current Status/Expectations:
-   [x] **Scoring Flow**: API endpoints for scoring verified.
-   [x] **Persistence Bug**: Fixed `hydrateSoloMatch` to correctly handle `locked` state from server.
-   [x] **Tied Shoot-off Bug**: Fixed server-side validation rejecting tied shoot-offs. Now accepts `winnerArcherId` in completion payload.

### Fixes Applied:
-   Updated `hydrateSoloMatch` in `solo_card.js` (CONFIRMED: logic exists).
-   Updated `completeMatch` in `solo_card.js` to send `winnerArcherId` for tied shoot-offs.
-   Updated `api/index.php` PATCH logic to handle `winnerArcherId`.

---

## 5. Verification & Results
**Goal**: Finalize the event and declare winners.

### Workflow:
1.  **Verify Scorecards**: Coach reviews "Pending" cards and marks them "Verified".
2.  **Locking**: Verified cards should be immutable by users.
3.  **Results**: View final standings and bracket winners.

### Current Status/Expectations:
-   [x] **Verification**: API `POST /verify` exists and returns correct `locked` status.
-   [x] **Locking**: Frontend `solo_card.js` blocks editing when `state.locked` is true.

---

## Next Steps: User Verification

The system should now be fully functional for the "RR Jan 28" event bracket.
1.  **Verify Roster**: Check 8 entries in "Solo Elimination - BV".
2.  **Verify Matches**: Check 4 matches in "Quarter Finals".
3.  **Test Scoring**: Open a match, score 5-5 tie, enter tied shoot-off scores, select a winner, and click "Complete".
4.  **Confirm Persistence**: Refresh the page and ensure it stays "Complete".

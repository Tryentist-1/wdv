# Bracket Creation Validation Guide

**Context:** Verifying fixes for "Swiss Auto-Assignment" bracket creation.
**Fixes Validated:**
1.  **Database:** `mode` column added to `brackets` table.
2.  **JavaScript:** Fixed `TypeError` (const vs let) and `ReferenceError` in `coach.js`.

## 1. Prerequisites
- **Role:** Coach
- **Passcode:** `wdva26`
- **URL:** [Coach Console](http://localhost:8001/coach.html)

## 2. Test Procedure

### Step 1: Login & Event Setup
1.  Navigate to `http://localhost:8001/coach.html`.
2.  Enter passcode `wdva26` if prompted.
3.  **Locate "Swiss Test" Event:**
    - If it exists: Use it.
    - If NOT: Create new event named "Swiss Test" (Date: Today, Code: `SWISS`).
    - *Crucial:* Ensure the event has archers involved (Add all filtered archers).

### Step 2: Access Bracket Management
1.  On the Event Card for "Swiss Test", click the **"Brackets"** button.
    - *Note:* If the button logic fails, direct URL is `bracket_results.html?bracket={id}`, but we need to create one first.
    - If "Brackets" button fails, use the **Dashboard** button, then look for a "Brackets" card/section.

### Step 3: Create "Swiss Auto" Bracket (Critical Test)
1.  Click **"Create Bracket"** button.
2.  **Verify Modal Opens:**
    - Ensure the modal appears without JS errors.
3.  **Configure Form:**
    - **Bracket Type:** `SOLO` (or Individual).
    - **Format:** Select `SWISS`.
    - **Mode (New Input):** Select **"Auto-Assigned"** (Value: `AUTO`).
      - *Verify:* This option should only appear when Format is `SWISS`.
    - **Division:** Select any division with archers (e.g., `BVAR` or `OPEN`).
    - **Size:** Leave as default.
4.  **Submit:**
    - Click **"Create Bracket"**.
    - **Expected Result:** Modal closes, page refreshes (or list updates), and new bracket appears.
    - *Failure Condition:* If button gets stuck on "Creating...", check console for `TypeError` or 500 Error.

### Step 4: Verify Database Creation
1.  Click **"Edit"** on the newly created bracket.
2.  Verify the details show "Mode: AUTO".

### Step 5: Generate Round
1.  Inside the "Edit Bracket" view.
2.  Click **"Generate Round 1"**.
3.  **Expected Result:**
    - Success message.
    - Matches list populates below.
    - Matches should have archers assigned (because it's AUTO mode).

### Step 6: Archer Side Verification
1.  Open `http://localhost:8001/index.html`.
2.  Login as one of the assigned archers (or check "Active Rounds").
3.  Verify the match appears.
4.  **Test Void:** Click "Void" button and confirm match is voided.

## 3. Troubleshooting
- **500 Error:** Check Docker logs (`docker-compose logs db`). Likely missing `mode` column if not manually fixed.
- **JS Error:** Open Console (F12). Look for `Assignment to constant variable`.

# Bracket Management Workflow (v2)

**Status:** Draft / Troubleshooting Mode
**Date:** 2026-02-05
**Goal:** Define the consolidated workflow for creating, managing, and verifying Solo/Team brackets (Swiss & Elimination) to serve as a source of truth for troubleshooting.

---

## 🏗️ Phase 1: Coach Setup (Pre-Match)

### 1.1 Prerequisites
- **Event Created:** An event exists (e.g., "State Championships").
- **Ranking Rounds Complete:** Archers have shot scores and have a ranking.
- **Divisions Assigned:** Archers are correctly categorized (e.g., "Recurve High School Boys").

### 1.2 Bracket Creation (Coach Console)
**Location:** `coach.html` -> "Brackets" Tab

#### A. Elimination Brackets (Top 8)
1.  **Action:** Coach selects "Create Bracket" -> "Elimination".
2.  **Input:** Selects Division and Gender.
3.  **Process:**
    - System fetches Top 8 archers from Ranking Round (filtered by division).
    - **Critical Check:** Normalizes division codes (e.g., "R-HS-M" vs "Recurve High School Male").
4.  **Generation:**
    - System creates 4 Quarter-Final matches.
    - Seeds are assigned (1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5).
    - Bracket Interactions are persisted in `brackets` and `bracket_entries` tables.
5.  **Output:** Bracket enters `PENDING` state. Matches are generated in `solo_matches` with `bracket_id`.

#### B. Swiss Brackets (Mixed/Open)
1.  **Action:** Coach selects "Create Bracket" -> "Swiss".
2.  **Input:** Selects Division (optional, can be mixed) and Mode (**Auto-Assigned** or **Open**).
3.  **Population:**
    *   **Coach Selection:** Coach selects archers to include (using filters similar to Ranking Round creation).
4.  **Process (By Mode):**
    *   **Auto-Assigned:**
        *   **Round 1:** Random/Seeded assignments.
        *   **Subsequent Rounds:** Coach clicks "Generate Round". System pairs archers with similar records (e.g., 1-0 vs 1-0).
        *   **Goal:** Continues until a single undefeated archer remains.
    *   **Open:**
        *   Archers self-select opponents based on W-L standings.

---

## 🏹 Phase 2: Archer Execution (Match Play)

### 2.1 Home Page Dashboard
**Location:** `index.html`

**Display Requirements:**
The Home Page must show a dashboard of **My Active Matches**:
*   **Ranking Rounds:** (Pending / In Process)
*   **Solo Matches:** (Planning / Pending)
*   **Team Matches:** (Planning / Pending)

**Actions:**
*   **Resume/Start:** Click to go to match card.
*   **Void:** Archer can mark an open/planning match as "Void" to clean up list.

### 2.2 Starting a Match
**Location:** `solo_card.html` (Solo) or `team_card.html` (Team)

#### A. Elimination Match (Assigned)
1.  **Navigation:** Archer scans QR code OR selects "Event" -> "My Matches".
2.  **UI State:**
    - System checks `solo_matches` for `archer_id` + `status != COMPLETED`.
    - **Display:** "You are playing **[Opponent Name]** on **[Target X]**".
3.  **Confirmation:** Both archers confirm on device.

#### B. Swiss Match (Challenge)
1.  **Navigation:** "Solo" -> Select Event -> Select Swiss Bracket.
2.  **UI State:** "Select Opponent".
3.  **Action:**
    - Archer selects available opponent from list.
    - **Constraint:** System should warn/block if they have already played this opponent (check `solo_matches` history).
4.  **Creation:** clicking "Start" creates a new `solo_values` entry linked to the bracket.

### 2.2 Scoring
1.  **Input:** Archers enter arrow values (Sets of 3 arrows for Solo, 1 per archer for Team).
2.  **Calculation:**
    - **Solo:** First to 6 set points (2pts win, 1pt tie). Max 5 sets.
    - **Team:** First to 5 set points (2pts win, 1pt tie). Max 4 sets.
3.  **Submission:** "Sign & Submit" (locks the card locally).

---

## 👮 Phase 3: Verification (Coach)

### 3.1 Verification Queue
**Location:** `coach.html` -> "Verification" (Modal)

1.  **Filter:** Select "Solo Matches" or "Team Matches".
2.  **List:** Shows all `COMPLETED` but `UNVERIFIED` matches.
3.  **Action:**
    - **Verify:** Coach reviews score -> Clicks "Verify" -> Status becomes `VERIFIED`.
    - **Void:** Coach rejects score (duplicate/error) -> Status becomes `VOID`.

### 3.2 Bracket Progression (Elimination Only)
1.  **Trigger:** When a match is `VERIFIED`.
2.  **Logic:**
    - Winner is determined.
    - Winner advances to next node in Bracket Tree (e.g., QF Winner -> SF Slot A).
    - Loser moves to placement or eliminated.
    - **Auto-Create:** Next match is created in `solo_matches` for the advancing archer.

---

## 🛠️ Troubleshooting / Focus Areas

Based on recent crash reports and user feedback:

1.  **Normalization Failures:** API failing to match "R-HS-M" to "Recurve M" causing empty brackets.
2.  **Silent Failures:** "Generate Top 8" button clicking but doing nothing (likely JS error or API 500 suppressed).
3.  **Ghost Matches:** Matches created but not linked to bracket (missing `bracket_id`).
4.  **Progression Logic:** Winners not advancing automatically after verification.

---

## 📝 Configuration & Rules
- **Source of Truth:** Database (`brackets`, `solo_matches`).
- **Framework:** Vanilla JS + Tailwind.
- **Workflow Strictness:**
    - Cannot verify match if scores are invalid.
    - Cannot advance bracket if match is not verified.

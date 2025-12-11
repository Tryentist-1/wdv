# Archery Score Management Suite: Product Requirements Document (PRD)

**Version:** 1.2
**Date:** 2025-06-10
**Status:** Defined

---

### 1. Vision & Goals

*   **Vision:** A suite of mobile-first web apps for scoring the primary formats of OAS (Olympic Archery in Schools) archery: Ranking, Solo Match, and Team Match. Also a version of archery arrow grouping analysis.
*   **Goal:** Provide a simple, reliable, and offline-capable tool for each specific scoring scenario, replacing paper or spreadsheet-based methods.
*   **Goal:** Provide a centralized place for coaches and archers to share progress and development.


---

### 2. Core Logic
- Arrows are scored with values M, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, X
- The target face has concentric rings with color codes.
- The 10 ring has an inner "X" spot.
- M indicates a miss and is scored as a 0.
- X is scored as a 10.
- "Avg arrow" is (Score Total)/(Possible Arrows)


#### 2.1. App 1: Interactive Olympic Scorer
*   **Purpose:** 
	For an individual archer to score practice rounds and analyze arrow grouping.
*   **Core Logic:** 
	Total cumulative score.
	Arrow Shot Locations.
	Arrow Group Center.
	Arrow Group Recenter.
	Total recentered score.

*   **Features:**
    *   Graphical target for tap-to-score input.
    *   Configurable ends and arrows per end.
    *   Calculates total score, X's, and 10's.
    *   Analyzes and displays the center of the arrow group.
    *   "Recenter Group" feature to calculate potential score.

#### 2.2. App 2: Ranking Round Scorer
*   **Purpose:** 
	To score a competitive Ranking Round for a Group of archers.
*   **Core Logic:** 
3 arrows shot per "end" with 12 Ends.
*   **Features:**
    *   Setup screen for 4 competing archers (Name, School, etc.).
    *   Score entry for 3 arrows per archer, per end.
    *   Clear display of X Spots and 10s.
    *   Clear display of end totals, running Total.
    *   Clear display of end totals, running Total.
    *   Copy and Send SMS of Totals.

    
#### 2.3. App 3: Solo Olympic Match Scorer
*   **Purpose:** 
*	To score a competitive 1v1 match.
*   **Core Logic:** 
	Set points. First archer to **6 set points** wins.
*   **Features:**
    *   Setup screen for two competing archers (Name, School, etc.).
    *   Score entry for 3 arrows per archer, per end.
    *   **Set Points Awarded:** 2 points for winning an end, 1 point for a tie.
    *   Clear display of end totals, running set point score, and overall match score.
    *   Handles a 1-arrow shoot-off if the match is tied 5-5.
    *   Final summary screen declaring the winner.

#### 2.4. App 4: Team Olympic Match Scorer
*   **Purpose:** To score a competitive team vs. team match.
*   **Core Logic:** Set points. First team to **5 set points** wins.
*   **Features:**
    *   Setup screen for two competing teams (3 archers each).
    *   Score entry for 6 arrows per team, per end (2 per archer).
    *   **Set Points Awarded:** 2 points for winning an end, 1 point for a tie.
    *   Clear display of end totals, running set point score, and overall match score.
    *   Handles a 3-arrow shoot-off (1 per archer) if the match is tied 4-4.
    *   Final summary screen declaring the winning team.

---

### 3. Common Features (Applicable to all 3 apps)

*   **Setup/Edit:** Each app will have a clear modal or page to set up the archer(s)/team(s) involved. An "Edit" button will allow for corrections after the session has started.
*   **State Persistence:** Each app will automatically save its current state to the browser's local storage. A user can refresh the page and resume their scoring session without data loss.
*   **New Match/Session:** A "New" or "Reset" button will be present to clear the current scorecard and start fresh.
*   **Data Export & Sharing:**
    *   **Save as Image:** A "Save" button that generates a clean PNG screenshot of the completed scorecard.
    *   **Copy as Text:** A "Copy" button that places a formatted, plain-text summary of the match results onto the clipboard.

---

### 4. Key Technical Requirements & Mitigations

*   **4.1. Score Input Handling:**
    *   **Challenge:** Non-numeric scores like 'X' (for 10) and 'M' (for 0) cause data type errors.
    *   **Requirement:** A single, centralized function (`parseScoreValue()`) must be created to convert user input into a valid integer. The original display value ('X') will be stored separately from the numerical value (10).

*   **4.2. Real-time Calculations:**
    *   **Challenge:** Totals and averages were difficult to keep up-to-date.
    *   **Requirement:** The application must use an event-driven model to trigger recalculations of all relevant values in real-time.

*   **4.3. Average Arrow Calculation:**
    *   **Challenge:** Calculating rolling averages was error-prone.
    *   **Requirement:** The calculation logic must reliably track the count of arrows shot and use the sanitized numerical scores. Displayed averages should be rounded to one decimal place.

*   **4.4. Score-based Color Coding:**
    *   **Challenge:** Applying the correct background color to score cells was inconsistent.
    *   **Requirement:** A centralized function (`getScoreColor()`) will determine the appropriate CSS class based on the numerical score value.

*   **4.5. Unit Testing:**
    *   **Challenge:** Logic errors can be introduced without a safety net.
    *   **Requirement:** Before a feature branch is considered complete, unit tests must be written and passed for all core logic functions (e.g., `parseScoreValue()`, set point calculation, end totals, etc.). Commits should only be made against tested code.

---

### 5. Design & Non-Functional Requirements

*   **Mobile-First:** All three apps must be designed and optimized for phones.
*   **Shared UI:** A consistent visual theme will be used across all three apps.
*   **Offline Capability:** All apps must be fully functional without an internet connection. 
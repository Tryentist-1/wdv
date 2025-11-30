# App Feature Plan: Event Management Flow

This document outlines the system logic, data fields, and user flow for creating and managing a standard OAS tournament (Ranking, Solo, and Team rounds).

## Phase 1: Event Creation (Admin Flow)

This is the initial setup for a tournament, done by the event administrator.

### UI / Screen: "Create New Event"

The admin defines the event's structure and rules.

#### Data Fields (Event Configuration)

* `Event_ID`: (Unique ID, e.g., `state-2025`)
* `Event_Name`: (String, e.g., "OAS CA State Championship 2025")
* `Event_Date`: (Date)
* `Event_Type`: (Dropdown, e.g., `Standard Championship`, `Ranking Only`, `Swiss`)
* `Divisions_Offered`: (Checkboxes: `BV`, `BJV`, `GV`, `GJV`)
* `Solo_Bracket_Size`: (Dropdown: `Top 8`, `Top 16`, `Top 32`)
* `Team_Bracket_Size`: (Dropdown: `Top 4`, `Top 8`)
* `Team_Eligibility_Model`: (Dropdown, from `tournament_rules.md`)
    * `Include Solos (Handbook Default)`: System uses the top 3 scores from any archer at the school.
    * `Exclude Solos (Variant)`: System uses *only* archers designated as `isTeamMember`.
* `Awards_Point_System`: (Dropdown, *per division*)
    * `JV/Nationals Model (Ranking Only)`
    * `Varsity State Model (Ranking + Elim)`

---

## Phase 2: Roster Management (Coach Flow)

Before the event, coaches submit their rosters. This populates the system's "Master Archer List."

### Data Model: `School`
* `School_ID`: (Unique ID)
* `School_Name`: (String)
* `Head_Coach_ID`: (Links to a User account)

### Data Model: `Archer`
* `Archer_ID`: (Unique ID)
* `School_ID`: (Links to `School`)
* `Archer_Name`: (String)
* `Gender`: (String: `Male`, `Female`)
* `Division`: (String: `BV`, `BJV`, `GV`, `GJV`)
* `RRA`: (Number, "Ranking Round Average" for reference)
* `isTeamMember`: (Boolean, *set by coach*). This field is critical for the "Exclude Solos" rule variant.

### UI / Screen: "Event Registration" (Coach)

1.  Coach selects an `Event` from a list.
2.  The system displays their full `School` roster (`Archers`).
3.  Coach checks a box next to each `Archer` attending this event.
4.  This creates an `Event_Registration` record.

### Data Model: `Event_Registration` (Linking Table)
* `Registration_ID`: (Unique ID)
* `Event_ID`: (Links to `Event`)
* `Archer_ID`: (Links to `Archer`)

---

## Phase 3: Running the Ranking Round (Live Event)

> **⚠️ Status Workflow Reference:**  
> For the authoritative status workflow documentation, see:  
> **[SCORECARD_STATUS_WORKFLOW.md](SCORECARD_STATUS_WORKFLOW.md)**
> 
> This document contains an older design with different status values.  
> The master reference should be consulted for current status definitions.

This is the first competition phase.

### Data Model: `Ranking_Scorecard`
* `Scorecard_ID`: (Unique ID)
* `Event_ID`: (Links to `Event`)
* `Archer_ID`: (Links to `Archer`)
* `Scores`: (Array of 36 numbers, e.g., `[10, 9, 8, 'M', ...]`)
* `Total_Score`: (Number, calculated)
* `Total_10s`: (Number, calculated, includes X's)
* `Total_Xs`: (Number, calculated)
* `Status`: (String: `Pending`, `Archer_Verified`, `Coach_Verified`, `Final`) ⚠️ **Note: This is an older design. Current system uses: `PENDING`, `COMP`, `VER`, `VOID`**
* `Paper_Card_Match_Confirmed`: (Boolean, default `false`)

### Scoring & Verification Flow (Digital + Paper)

This flow is critical and matches your requirement for 2-step verification.

1.  **Data Entry:** A scorekeeper (or archer) enters the 36 arrow scores into the app's digital scorecard.
2.  **Archer Verification:**
    * App displays the scores and `Total_Score` to the **archer**.
    * Archer compares this to the paper card.
    * Archer taps "Confirm My Score."
    * System sets `Scorecard.Status` = `Archer_Verified`.
3.  **Coach/Ref Verification:**
    * The scorecard (now locked for the archer) appears in a queue for the lane's **Coach/Ref**.
    * The Coach/Ref compares the `Total_Score` on the app to the *signed paper scorecard*.
    * Coach/Ref taps "Verify and Finalize."
    * System sets `Scorecard.Status` = `Coach_Verified` and `Paper_Card_Match_Confirmed` = `true`.
4.  **Final Score:** The score is now `Final` and is accepted by the system for ranking.

---

## Phase 4: Seeding & Bracket Generation (Automated)

Once all Ranking Round scores are `Final`, the admin can generate the brackets.

### Logic: "Generate Brackets" Button (Admin)

1.  **Fetch Scores:** System grabs all `Final` `Ranking_Scorecard`s for a specific division (e.g., "Boys Varsity").
2.  **Rank Individuals:** Sorts archers by `Total_Score` (desc), then `Total_10s` (desc) to break ties.
3.  **Create Solo Bracket:**
    * System gets the `Solo_Bracket_Size` (e.g., "Top 16") from the `Event` config.
    * It creates a `Bracket` (see data model below) and populates the first-round matches (1 vs 16, 8 vs 9, etc.).
4.  **Rank Teams:**
    * System checks the `Team_Eligibility_Model` from the `Event` config.
    * **If "Include Solos":** For each school, it sums the `Total_Score` of their top 3 archers in that division.
    * **If "Exclude Solos":** For each school, it sums the `Total_Score` of their top 3 archers *where `Archer.isTeamMember` is true*.
    * It sorts the schools by their combined score (desc), then combined `Total_10s` (desc).
5.  **Create Team Bracket:**
    * System gets the `Team_Bracket_Size` (e.g., "Top 8") from the `Event` config.
    * It creates a new `Bracket` and populates the first-round matches.

### Data Model: `Bracket`
* `Bracket_ID`: (Unique ID)
* `Event_ID`: (Links to `Event`)
* `Bracket_Type`: (String: `Solo`, `Team`)
* `Division`: (String: `BV`, `BJV`,V`, `GJV`)

---

## Phase 5: Running Elimination Rounds (Live Event)

This uses the Set System and a different scorecard.

### Data Model: `Elimination_Match`
* `Match_ID`: (Unique ID)
* `Bracket_ID`: (Links to `Bracket`)
* `Round_Number`: (Number: 1=Quarterfinal, 2=Semi, 3=Final)
* `Competitor_1_ID`: (Can be `Archer_ID` or `School_ID`)
* `Competitor_2_ID`: (Can be `Archer_ID` or `School_ID`)
* `Winner_ID`: (Populated when match is final)
* `Set_Scores`: (JSON object, e.g., `[{set: 1, c1: 28, c2: 27, c1_pts: 2, c2_pts: 0}, ...]`)
* `Final_Set_Points`: (e.g., `c1: 6, c2: 2`)
* `ShootOff_Score`: (e.g., `c1: 10, c2: 9`)
* `Status`: (String: `Pending`, `Competitor_Verified`, `Coach_Verified`, `Final`)
* `Paper_Card_Match_Confirmed`: (Boolean)

### Logic: Elimination Flow

1.  **Run Match:** The match is shot. A scorekeeper enters scores for each set into the app. The app automatically calculates set points.
2.  **Verification:** Same 2-step verification as the ranking round.
    * Both archers (or team captains) must tap "Confirm" (`Competitor_Verified`).
    * Coach/Ref compares to paper card and taps "Finalize" (`Coach_Verified`, `Paper_Card_Match_Confirmed`).
3.  **Advancement:** Once `Match.Winner_ID` is set, the system automatically advances that `Winner_ID` to the next `Elimination_Match` in the `Bracket`.

---

## Phase 6: Finalization & Awards (Automated)

After all matches are `Final`, the admin can calculate the winners.

### Logic: "Calculate Awards" Button (Admin)

1.  **Individual Awards:** The system queries the `Ranking_Scorecard`s and `Bracket`s to find the 1st, 2nd, and 3rd place winners for:
    * Ranking Round (by score)
    * Solo Elimination
    * Team Elimination
2.  **Overall School Champion Awards:**
    * For each school, for each division...
    * The system checks the `Awards_Point_System` for that division (from `Event` config).
    * It fetches all the data (participation points, ranking placements, elim final placements) and calculates the school's total points based on the rules in `tournament_rules.md`.
    * It checks the `Qualification` rule (must have 3+ archers).
    * It ranks the schools using the `Tie-Breaker` rule.
3.  **Display:** The system generates a final "Awards" page showing all individual, team, and overall school champions for all divisions.